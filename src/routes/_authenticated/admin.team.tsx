import { createFileRoute } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { useState } from "react";
import { KeyRound, Loader2, ShieldCheck, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import {
  listTeam,
  setTeamRole,
  createTeamMember,
  setTeamPassword,
  deleteTeamMember,
  setStaffJobTypes,
} from "@/lib/team.functions";
import { supabase } from "@/integrations/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/admin/team")({
  head: () => ({
    meta: [
      { title: "Team access — Dreambuilders Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminTeamPage,
});

function AdminTeamPage() {
  const fetchTeam = useServerFn(listTeam);
  const updateRole = useServerFn(setTeamRole);

  const saveJobTypes = useServerFn(setStaffJobTypes);

  const teamQ = useQuery({
    queryKey: ["admin", "team"],
    queryFn: () => fetchTeam(),
  });

  const jobTypesQ = useQuery({
    queryKey: ["admin", "staffRoleTypes"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_roles")
        .select("id, name, slug")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return data ?? [];
    },
  });


  const [email, setEmail] = useState("");
  const [role, setRole] = useState<"staff" | "admin">("staff");
  const [busy, setBusy] = useState(false);

  const createMember = useServerFn(createTeamMember);
  const changePassword = useServerFn(setTeamPassword);
  const removeMember = useServerFn(deleteTeamMember);

  const [newEmail, setNewEmail] = useState("");
  const [newName, setNewName] = useState("");
  const [newPassword, setNewPassword] = useState("");
  const [newRole, setNewRole] = useState<"staff" | "admin">("staff");

  function makePassword() {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghijkmnopqrstuvwxyz23456789";
    let out = "";
    const rand = new Uint32Array(12);
    crypto.getRandomValues(rand);
    for (const n of rand) out += chars[n % chars.length];
    setNewPassword(out);
  }

  async function createAccount() {
    setBusy(true);
    try {
      const res: any = await createMember({
        data: {
          email: newEmail.trim(),
          password: newPassword,
          displayName: newName.trim() || undefined,
          role: newRole,
        },
      });
      toast.success(res?.existed ? "Account updated with the new password" : `Account created for ${newEmail.trim()}`);
      setNewEmail("");
      setNewName("");
      await teamQ.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not create the account");
    } finally {
      setBusy(false);
    }
  }

  async function resetPassword(userId: string, memberEmail: string) {
    const pw = window.prompt(`New password for ${memberEmail} (at least 8 characters)`);
    if (!pw) return;
    if (pw.length < 8) {
      toast.error("Password must be at least 8 characters");
      return;
    }
    setBusy(true);
    try {
      await changePassword({ data: { userId, password: pw } });
      toast.success("Password updated — share it with them securely");
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update the password");
    } finally {
      setBusy(false);
    }
  }

  async function deleteAccount(userId: string, memberEmail: string) {
    if (!window.confirm(`Delete the account for ${memberEmail}? This cannot be undone.`)) return;
    setBusy(true);
    try {
      await removeMember({ data: { userId } });
      toast.success("Account deleted");
      await teamQ.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not delete the account");
    } finally {
      setBusy(false);
    }
  }

  async function toggleJobType(userId: string, current: string[], roleId: string) {
    const next = current.includes(roleId) ? current.filter((r) => r !== roleId) : [...current, roleId];
    setBusy(true);
    try {
      await saveJobTypes({ data: { userId, staffRoleIds: next } });
      await teamQ.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Could not update their job types");
    } finally {
      setBusy(false);
    }
  }

  async function run(action: "grant" | "revoke", targetEmail: string, targetRole: "staff" | "admin") {
    setBusy(true);
    try {
      const res: any = await updateRole({
        data: {
          email: targetEmail,
          role: targetRole,
          action,
          redirectTo: typeof window !== "undefined" ? `${window.location.origin}/auth` : undefined,
        },
      });
      toast.success(
        action === "revoke"
          ? `Removed ${targetRole} access`
          : res?.invited
            ? `Invite emailed to ${targetEmail}`
            : `${targetRole} access given to ${targetEmail}`,
      );
      setEmail("");
      await teamQ.refetch();
    } catch (e: any) {
      toast.error(e?.message ?? "Something went wrong");
    } finally {
      setBusy(false);
    }
  }

  const members = teamQ.data ?? [];
  const withRoles = members.filter((m) => m.roles.length > 0);
  const withoutRoles = members.filter((m) => m.roles.length === 0);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Team access</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Give your people staff or admin access. Staff can see every enquiry and confirmed hire on the calendar and use
          the event-day checklists. Admins can do everything, including managing team access.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <UserPlus className="h-4 w-4 text-primary" /> Invite someone
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Enter their email and we'll send them an invite to set a password. If they already have an account, they
            simply get the access straight away.
          </p>
          <div className="grid gap-2 sm:grid-cols-[1fr_160px_auto]">
            <Input
              placeholder="person@example.com"
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
            />
            <Select value={role} onValueChange={(v) => setRole(v as "staff" | "admin")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button disabled={busy || !email.trim()} onClick={() => run("grant", email.trim(), role)}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send invite"}
            </Button>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <KeyRound className="h-4 w-4 text-primary" /> Create an account yourself
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-3">
          <p className="text-sm text-muted-foreground">
            Set the email and password for them and hand it over directly — no invite email needed. If the email already
            has an account, this simply resets their password.
          </p>
          <div className="grid gap-2 sm:grid-cols-2">
            <Input
              placeholder="person@example.com"
              type="email"
              value={newEmail}
              onChange={(e) => setNewEmail(e.target.value)}
            />
            <Input placeholder="Name (optional)" value={newName} onChange={(e) => setNewName(e.target.value)} />
          </div>
          <div className="grid gap-2 sm:grid-cols-[1fr_auto_160px_auto]">
            <Input
              placeholder="Password (min 8 characters)"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
            />
            <Button type="button" variant="outline" onClick={makePassword}>
              Generate
            </Button>
            <Select value={newRole} onValueChange={(v) => setNewRole(v as "staff" | "admin")}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="staff">Staff</SelectItem>
                <SelectItem value="admin">Admin</SelectItem>
              </SelectContent>
            </Select>
            <Button disabled={busy || !newEmail.trim() || newPassword.length < 8} onClick={createAccount}>
              {busy ? <Loader2 className="h-4 w-4 animate-spin" /> : "Create account"}
            </Button>
          </div>
          <p className="text-xs text-muted-foreground">
            Existing passwords can never be shown — they're stored scrambled for safety. Copy the password above before
            you leave the page, or set a new one any time.
          </p>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <ShieldCheck className="h-4 w-4 text-primary" /> People with access
          </CardTitle>
        </CardHeader>
        <CardContent>
          {teamQ.isLoading ? (
            <div className="flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading…
            </div>
          ) : withRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nobody has staff or admin access yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {withRoles.map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <div>
                    <div className="font-medium">{m.email}</div>
                    <div className="mt-1 flex gap-1.5">
                      {m.roles.map((r) => (
                        <Badge key={r} variant="outline" className="capitalize">
                          {r}
                        </Badge>
                      ))}
                      {m.pending ? (
                        <Badge variant="outline" className="border-amber-300 bg-amber-50 text-amber-900">
                          Invite pending
                        </Badge>
                      ) : null}
                    </div>
                    <div className="mt-2">
                      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">
                        Job types (controls which checklist items they see)
                      </div>
                      <div className="mt-1 flex flex-wrap gap-1.5">
                        {(jobTypesQ.data ?? []).map((jt: any) => {
                          const on = m.job_type_ids.includes(jt.id);
                          return (
                            <button
                              key={jt.id}
                              type="button"
                              disabled={busy}
                              onClick={() => toggleJobType(m.user_id, m.job_type_ids, jt.id)}
                              className={`rounded-full border px-2.5 py-1 text-xs transition ${
                                on
                                  ? "border-primary bg-primary text-primary-foreground"
                                  : "border-border text-muted-foreground hover:bg-muted"
                              }`}
                            >
                              {jt.name}
                            </button>
                          );
                        })}
                        {(jobTypesQ.data ?? []).length === 0 && (
                          <span className="text-xs text-muted-foreground">No job types set up yet.</span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex flex-wrap gap-2">
                    <Button size="sm" variant="secondary" disabled={busy} onClick={() => resetPassword(m.user_id, m.email)}>
                      Set password
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      className="text-destructive"
                      disabled={busy}
                      onClick={() => deleteAccount(m.user_id, m.email)}
                    >
                      Delete
                    </Button>
                    {(["staff", "admin"] as const).map((r) =>
                      m.roles.includes(r) ? (
                        <Button
                          key={r}
                          size="sm"
                          variant="ghost"
                          disabled={busy}
                          onClick={() => run("revoke", m.email, r)}
                        >
                          Remove {r}
                        </Button>
                      ) : (
                        <Button
                          key={r}
                          size="sm"
                          variant="outline"
                          disabled={busy}
                          onClick={() => run("grant", m.email, r)}
                        >
                          Make {r}
                        </Button>
                      ),
                    )}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2 text-base">
            <Users className="h-4 w-4 text-primary" /> Other accounts
          </CardTitle>
        </CardHeader>
        <CardContent>
          {withoutRoles.length === 0 ? (
            <p className="text-sm text-muted-foreground">No other accounts.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {withoutRoles.map((m) => (
                <li key={m.user_id} className="flex flex-wrap items-center justify-between gap-2 px-3 py-2.5 text-sm">
                  <span>{m.email}</span>
                  <div className="flex gap-2">
                    <Button size="sm" variant="outline" disabled={busy} onClick={() => run("grant", m.email, "staff")}>
                      Make staff
                    </Button>
                    <Button size="sm" variant="ghost" disabled={busy} onClick={() => run("grant", m.email, "admin")}>
                      Make admin
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
