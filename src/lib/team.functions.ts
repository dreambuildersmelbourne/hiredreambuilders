import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

async function assertAdmin(supabase: any, userId: string) {
  const { data, error } = await supabase.from("user_roles").select("role").eq("user_id", userId);
  if (error) throw new Error("Unable to verify access");
  if (!(data ?? []).some((r: any) => r.role === "admin")) throw new Error("Forbidden");
}

export type TeamMember = {
  user_id: string;
  email: string;
  created_at: string;
  last_sign_in_at: string | null;
  pending: boolean;
  roles: string[];
  job_type_ids: string[];
};

export const setStaffJobTypes = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        userId: z.string().uuid(),
        staffRoleIds: z.array(z.string().uuid()).max(30),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { error: delErr } = await supabaseAdmin
      .from("user_staff_roles")
      .delete()
      .eq("user_id", data.userId);
    if (delErr) throw new Error(delErr.message);

    if (data.staffRoleIds.length > 0) {
      const { error } = await supabaseAdmin
        .from("user_staff_roles")
        .insert(data.staffRoleIds.map((id) => ({ user_id: data.userId, staff_role_id: id })));
      if (error) throw new Error(error.message);
    }
    return { ok: true };
  });

export const listTeam = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const rolesByUser = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), r.role as string]);
    }

    const { data: jobRows } = await supabaseAdmin.from("user_staff_roles").select("user_id, staff_role_id");
    const jobsByUser = new Map<string, string[]>();
    for (const j of jobRows ?? []) {
      jobsByUser.set(j.user_id, [...(jobsByUser.get(j.user_id) ?? []), j.staff_role_id as string]);
    }

    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error("Could not load accounts");

    return (list?.users ?? []).map((u) => ({
      user_id: u.id,
      email: u.email ?? "(no email)",
      created_at: u.created_at,
      last_sign_in_at: u.last_sign_in_at ?? null,
      pending: !u.last_sign_in_at,
      roles: rolesByUser.get(u.id) ?? [],
      job_type_ids: jobsByUser.get(u.id) ?? [],
    })) as TeamMember[];
  });

export type StaffMemberOption = {
  user_id: string;
  email: string;
  name: string;
  roles: string[];
  job_type_ids: string[];
};

/** Accounts that can work events (staff or admin), for assignment pickers. */
export const listStaffMembers = createServerFn({ method: "GET" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    // staff and admins may both view the roster
    const { data: myRoles, error: myErr } = await context.supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", context.userId);
    if (myErr) throw new Error("Unable to verify access");
    const mine = (myRoles ?? []).map((r: any) => r.role as string);
    if (!mine.includes("admin") && !mine.includes("staff")) throw new Error("Forbidden");

    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const { data: roleRows } = await supabaseAdmin.from("user_roles").select("user_id, role");
    const rolesByUser = new Map<string, string[]>();
    for (const r of roleRows ?? []) {
      rolesByUser.set(r.user_id, [...(rolesByUser.get(r.user_id) ?? []), r.role as string]);
    }

    const { data: jobRows } = await supabaseAdmin.from("user_staff_roles").select("user_id, staff_role_id");
    const jobsByUser = new Map<string, string[]>();
    for (const j of jobRows ?? []) {
      jobsByUser.set(j.user_id, [...(jobsByUser.get(j.user_id) ?? []), j.staff_role_id as string]);
    }

    const { data: list, error } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (error) throw new Error("Could not load accounts");

    return (list?.users ?? [])
      .filter((u) => (rolesByUser.get(u.id) ?? []).length > 0)
      .map((u) => ({
        user_id: u.id,
        email: u.email ?? "(no email)",
        name:
          (u.user_metadata?.full_name as string | undefined)?.trim() ||
          (u.email ?? "Team member").split("@")[0],
        roles: rolesByUser.get(u.id) ?? [],
        job_type_ids: jobsByUser.get(u.id) ?? [],
      }))
      .sort((a, b) => a.name.localeCompare(b.name)) as StaffMemberOption[];
  });

export const setTeamRole = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        role: z.enum(["admin", "staff"]),
        action: z.enum(["grant", "revoke"]),
        redirectTo: z.string().trim().max(500).optional(),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();
    const { data: list, error: listErr } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    if (listErr) throw new Error("Could not look up accounts");
    let user = (list?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email) ?? null;
    let invited = false;

    if (!user) {
      if (data.action !== "grant") throw new Error("No account found with that email.");
      const { data: inv, error: invErr } = await supabaseAdmin.auth.admin.inviteUserByEmail(email, {
        redirectTo: data.redirectTo || undefined,
        data: { invited_role: data.role },
      });
      if (invErr || !inv?.user) {
        throw new Error(invErr?.message ?? "Could not send the invite email");
      }
      user = inv.user;
      invited = true;
    }

    if (data.action === "grant") {
      const { error } = await supabaseAdmin
        .from("user_roles")
        .upsert({ user_id: user.id, role: data.role }, { onConflict: "user_id,role" });
      if (error) throw new Error(error.message);
    } else {
      if (user.id === context.userId && data.role === "admin") {
        throw new Error("You cannot remove your own admin access.");
      }
      const { error } = await supabaseAdmin
        .from("user_roles")
        .delete()
        .eq("user_id", user.id)
        .eq("role", data.role);
      if (error) throw new Error(error.message);
    }

    return { ok: true, email, invited };
  });

export const createTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z
      .object({
        email: z.string().trim().email().max(255),
        password: z.string().min(8).max(72),
        displayName: z.string().trim().max(120).optional(),
        role: z.enum(["admin", "staff"]),
      })
      .parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

    const email = data.email.toLowerCase();
    const { data: list } = await supabaseAdmin.auth.admin.listUsers({ page: 1, perPage: 200 });
    const existing = (list?.users ?? []).find((u) => (u.email ?? "").toLowerCase() === email);

    let userId: string;
    if (existing) {
      const { error } = await supabaseAdmin.auth.admin.updateUserById(existing.id, {
        password: data.password,
        email_confirm: true,
      });
      if (error) throw new Error(error.message);
      userId = existing.id;
    } else {
      const { data: created, error } = await supabaseAdmin.auth.admin.createUser({
        email,
        password: data.password,
        email_confirm: true,
        user_metadata: data.displayName ? { full_name: data.displayName } : undefined,
      });
      if (error || !created?.user) throw new Error(error?.message ?? "Could not create the account");
      userId = created.user.id;
    }

    const { error: roleErr } = await supabaseAdmin
      .from("user_roles")
      .upsert({ user_id: userId, role: data.role }, { onConflict: "user_id,role" });
    if (roleErr) throw new Error(roleErr.message);

    return { ok: true, email, existed: Boolean(existing) };
  });

export const setTeamPassword = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) =>
    z.object({ userId: z.string().uuid(), password: z.string().min(8).max(72) }).parse(input),
  )
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.auth.admin.updateUserById(data.userId, {
      password: data.password,
      email_confirm: true,
    });
    if (error) throw new Error(error.message);
    return { ok: true };
  });

export const deleteTeamMember = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => z.object({ userId: z.string().uuid() }).parse(input))
  .handler(async ({ data, context }) => {
    await assertAdmin(context.supabase, context.userId);
    if (data.userId === context.userId) throw new Error("You cannot delete your own account.");
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    await supabaseAdmin.from("user_roles").delete().eq("user_id", data.userId);
    const { error } = await supabaseAdmin.auth.admin.deleteUser(data.userId);
    if (error) throw new Error(error.message);
    return { ok: true };
  });
