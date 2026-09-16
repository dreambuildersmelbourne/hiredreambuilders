import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Check, Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { listStaffMembers, type StaffMemberOption } from "@/lib/team.functions";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StaffRole = { id: string; name: string; slug: string };

type Assignment = {
  id: string;
  name: string | null;
  user_id: string | null;
  confirmed: boolean;
  staff_role_id: string | null;
};

export function StaffAssignmentPicker({ bookingId }: { bookingId: string }) {
  const qc = useQueryClient();
  const fetchStaff = useServerFn(listStaffMembers);

  const rolesQ = useQuery({
    queryKey: ["staff_roles", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_roles")
        .select("id, name, slug")
        .eq("active", true)
        .order("name");
      if (error) throw error;
      return (data ?? []) as StaffRole[];
    },
  });

  const requiredQ = useQuery({
    queryKey: ["booking_staff", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_staff")
        .select("id, count, staff_role_id, staff_roles(id, name, slug)")
        .eq("booking_id", bookingId);
      if (error) throw error;
      return (data ?? []) as unknown as Array<{
        id: string;
        count: number | null;
        staff_role_id: string | null;
        staff_roles: StaffRole | null;
      }>;
    },
  });

  const assignQ = useQuery({
    queryKey: ["staff_assignments", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_assignments")
        .select("id, name, user_id, confirmed, staff_role_id")
        .eq("booking_id", bookingId)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Assignment[];
    },
  });

  const teamQ = useQuery({
    queryKey: ["team", "staff-options"],
    queryFn: async () => (await fetchStaff()) as StaffMemberOption[],
  });

  const assignments = assignQ.data ?? [];
  const team = teamQ.data ?? [];

  const assignedByRole = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignments) if (a.staff_role_id) m.set(a.staff_role_id, (m.get(a.staff_role_id) ?? 0) + 1);
    return m;
  }, [assignments]);

  function findAssignment(roleId: string, userId: string) {
    return assignments.find((a) => a.staff_role_id === roleId && a.user_id === userId) ?? null;
  }

  const [busyKey, setBusyKey] = useState<string | null>(null);
  const [showAll, setShowAll] = useState<Record<string, boolean>>({});

  function refresh() {
    qc.invalidateQueries({ queryKey: ["staff_assignments", bookingId] });
    qc.invalidateQueries({ queryKey: ["admin", "assignments", bookingId] });
  }

  async function toggle(role: StaffRole, member: StaffMemberOption) {
    const key = `${role.id}:${member.user_id}`;
    const existing = findAssignment(role.id, member.user_id);
    setBusyKey(key);
    if (existing) {
      const { error } = await supabase.from("staff_assignments").delete().eq("id", existing.id);
      setBusyKey(null);
      if (error) return toast.error(error.message);
      toast.success(`${member.name} removed from ${role.name}`);
    } else {
      const { error } = await supabase.from("staff_assignments").insert({
        booking_id: bookingId,
        staff_role_id: role.id,
        name: member.name,
        user_id: member.user_id,
        confirmed: false,
      });
      setBusyKey(null);
      if (error) return toast.error(error.message);
      toast.success(`${member.name} assigned as ${role.name}`);
    }
    refresh();
  }

  async function removeAssignment(id: string) {
    const { error } = await supabase.from("staff_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    refresh();
  }

  // Roles to show: required ones first, then any other active role the admin may want
  const requiredRoleIds = new Set(
    (requiredQ.data ?? []).map((r) => r.staff_roles?.id ?? r.staff_role_id).filter(Boolean) as string[],
  );
  const allRoles = rolesQ.data ?? [];
  const orderedRoles = [
    ...allRoles.filter((r) => requiredRoleIds.has(r.id)),
    ...allRoles.filter((r) => !requiredRoleIds.has(r.id)),
  ];
  const neededFor = (roleId: string) =>
    (requiredQ.data ?? [])
      .filter((r) => (r.staff_roles?.id ?? r.staff_role_id) === roleId)
      .reduce((s, r) => s + (r.count ?? 1), 0);

  const loading = rolesQ.isLoading || requiredQ.isLoading || assignQ.isLoading;
  const manualAssignments = assignments.filter((a) => !a.user_id);

  if (loading) {
    return (
      <div className="flex items-center gap-2 text-sm text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading staff…
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {teamQ.isError && (
        <p className="text-sm text-destructive">Couldn't load team accounts. You can still add names manually below.</p>
      )}

      {orderedRoles.map((role) => {
        const need = neededFor(role.id);
        const have = assignedByRole.get(role.id) ?? 0;
        const qualified = team.filter((m) => m.job_type_ids.includes(role.id));
        const others = team.filter((m) => !m.job_type_ids.includes(role.id));
        const expanded = showAll[role.id] ?? false;
        const visible = expanded ? [...qualified, ...others] : qualified;

        if (need === 0 && have === 0 && !expanded && qualified.length === 0) {
          return (
            <div key={role.id} className="rounded-lg border border-dashed border-border px-3 py-2">
              <div className="flex items-center justify-between gap-2">
                <span className="text-sm text-muted-foreground">{role.name}</span>
                <Button size="sm" variant="ghost" onClick={() => setShowAll((s) => ({ ...s, [role.id]: true }))}>
                  Show team
                </Button>
              </div>
            </div>
          );
        }

        return (
          <section key={role.id} className="rounded-lg border border-border p-3">
            <div className="mb-2 flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2 text-sm font-medium">
                <Users className="h-4 w-4 text-primary" /> {role.name}
              </div>
              <Badge
                variant="outline"
                className={
                  need > 0 && have >= need
                    ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                    : need > 0
                      ? "border-amber-300 bg-amber-50 text-amber-900"
                      : ""
                }
              >
                {need > 0 ? `${have}/${need} assigned` : `${have} assigned`}
              </Badge>
            </div>

            {visible.length === 0 ? (
              <p className="text-sm text-muted-foreground">
                No team members set up for this job type yet.
              </p>
            ) : (
              <ul className="divide-y divide-border rounded-md border border-border">
                {visible.map((m) => {
                  const existing = findAssignment(role.id, m.user_id);
                  const key = `${role.id}:${m.user_id}`;
                  const trained = m.job_type_ids.includes(role.id);
                  return (
                    <li key={m.user_id} className="flex items-center gap-3 px-3 py-2">
                      <button
                        type="button"
                        onClick={() => toggle(role, m)}
                        disabled={busyKey === key}
                        aria-pressed={!!existing}
                        className={`flex h-5 w-5 shrink-0 items-center justify-center rounded border transition-colors ${
                          existing ? "border-primary bg-primary text-primary-foreground" : "border-input bg-background"
                        }`}
                      >
                        {busyKey === key ? (
                          <Loader2 className="h-3 w-3 animate-spin" />
                        ) : existing ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : null}
                      </button>
                      <div className="min-w-0 flex-1">
                        <div className="truncate text-sm font-medium">{m.name}</div>
                        <div className="truncate text-xs text-muted-foreground">
                          {m.email}
                          {!trained ? " · not set up for this job type" : ""}
                        </div>
                      </div>
                      {existing?.confirmed && (
                        <Badge variant="outline" className="border-emerald-300 bg-emerald-50 text-emerald-900">
                          Confirmed
                        </Badge>
                      )}
                    </li>
                  );
                })}
              </ul>
            )}

            {others.length > 0 && (
              <Button
                size="sm"
                variant="ghost"
                className="mt-2"
                onClick={() => setShowAll((s) => ({ ...s, [role.id]: !expanded }))}
              >
                {expanded ? "Show only trained team" : `Show all team members (${others.length} more)`}
              </Button>
            )}
          </section>
        );
      })}

      {manualAssignments.length > 0 && (
        <section>
          <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Manually added (no account)
          </div>
          <ul className="divide-y divide-border rounded-lg border border-border">
            {manualAssignments.map((a) => (
              <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                <div>
                  <div className="font-medium">{a.name ?? "Unnamed"}</div>
                  <div className="text-xs text-muted-foreground">
                    {allRoles.find((r) => r.id === a.staff_role_id)?.name ?? "No role"}
                  </div>
                </div>
                <Button size="sm" variant="ghost" onClick={() => removeAssignment(a.id)}>
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </li>
            ))}
          </ul>
        </section>
      )}

      <ManualAdd bookingId={bookingId} roles={allRoles} onDone={refresh} />
    </div>
  );
}

function ManualAdd({
  bookingId,
  roles,
  onDone,
}: {
  bookingId: string;
  roles: StaffRole[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!roleId) return toast.error("Select a role");
    if (!name.trim()) return toast.error("Enter a name");
    setSaving(true);
    const { error } = await supabase.from("staff_assignments").insert({
      booking_id: bookingId,
      staff_role_id: roleId,
      name: name.trim(),
      confirmed: false,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Added");
    setName("");
    setRoleId("");
    onDone();
  }

  return (
    <div className="grid gap-2 rounded-lg border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_auto]">
      <Input placeholder="Someone without an account" value={name} onChange={(e) => setName(e.target.value)} />
      <Select value={roleId} onValueChange={setRoleId}>
        <SelectTrigger>
          <SelectValue placeholder="Role" />
        </SelectTrigger>
        <SelectContent>
          {roles.map((r) => (
            <SelectItem key={r.id} value={r.id}>
              {r.name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={add} disabled={saving || !roleId}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : (<><UserPlus className="mr-1.5 h-4 w-4" /> Add</>)}
      </Button>
    </div>
  );
}
