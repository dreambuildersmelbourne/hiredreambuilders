import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { Loader2, Trash2, UserPlus, Users } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

type StaffRole = { id: string; name: string; slug: string };

type BookingBrief = {
  id: string;
  reference: string;
  event_name: string;
  event_date: string;
};

export function RoleAssignmentModal({
  open,
  onOpenChange,
  booking,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: BookingBrief | null;
}) {
  const qc = useQueryClient();
  const bookingId = booking?.id ?? null;

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
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("booking_staff")
        .select("id, quantity, staff_roles(id, name, slug)")
        .eq("booking_id", bookingId!);
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        quantity: number | null;
        staff_roles: StaffRole | null;
      }>;
    },
  });

  const assignQ = useQuery({
    queryKey: ["staff_assignments", bookingId],
    enabled: !!bookingId,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_assignments")
        .select("id, name, user_id, confirmed, staff_role_id, staff_roles(id, name, slug)")
        .eq("booking_id", bookingId!)
        .order("created_at");
      if (error) throw error;
      return (data ?? []) as Array<{
        id: string;
        name: string | null;
        user_id: string | null;
        confirmed: boolean;
        staff_role_id: string | null;
        staff_roles: StaffRole | null;
      }>;
    },
  });

  const requiredByRole = useMemo(() => {
    const m = new Map<string, number>();
    for (const r of requiredQ.data ?? []) {
      if (r.staff_roles?.id) m.set(r.staff_roles.id, (m.get(r.staff_roles.id) ?? 0) + (r.quantity ?? 1));
    }
    return m;
  }, [requiredQ.data]);

  const assignedByRole = useMemo(() => {
    const m = new Map<string, number>();
    for (const a of assignQ.data ?? []) {
      if (a.staff_role_id) m.set(a.staff_role_id, (m.get(a.staff_role_id) ?? 0) + 1);
    }
    return m;
  }, [assignQ.data]);

  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!bookingId) return;
    if (!roleId) return toast.error("Select a role");
    if (!name.trim() && !email.trim()) return toast.error("Enter a name or email");
    setSaving(true);
    let userId: string | null = null;
    if (email.trim()) {
      const { data } = await supabase
        .from("customers")
        .select("user_id")
        .ilike("email", email.trim())
        .maybeSingle();
      userId = data?.user_id ?? null;
    }
    const { error } = await supabase.from("staff_assignments").insert({
      booking_id: bookingId,
      staff_role_id: roleId,
      name: name.trim() || null,
      user_id: userId,
      confirmed: false,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success(userId ? "Assigned & linked to account" : "Assigned (no account match — add email later to link)");
    setName("");
    setEmail("");
    setRoleId("");
    qc.invalidateQueries({ queryKey: ["staff_assignments", bookingId] });
  }

  async function remove(id: string) {
    const { error } = await supabase.from("staff_assignments").delete().eq("id", id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["staff_assignments", bookingId] });
  }

  const required = requiredQ.data ?? [];
  const assigned = assignQ.data ?? [];
  const loading = requiredQ.isLoading || assignQ.isLoading || rolesQ.isLoading;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Assign staff roles
          </DialogTitle>
          <DialogDescription>
            {booking ? (
              <>
                <span className="font-medium text-foreground">{booking.event_name}</span> · {booking.reference}
              </>
            ) : (
              "Select a booking"
            )}
          </DialogDescription>
        </DialogHeader>

        {loading ? (
          <div className="flex items-center gap-2 text-sm text-muted-foreground">
            <Loader2 className="h-4 w-4 animate-spin" /> Loading roles…
          </div>
        ) : (
          <div className="space-y-5">
            {/* Required roles overview */}
            <section>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Required roles for this booking
              </div>
              {required.length === 0 ? (
                <p className="text-sm text-muted-foreground">No specific roles required. Any assignment is optional.</p>
              ) : (
                <div className="flex flex-wrap gap-2">
                  {required.map((r) => {
                    const need = r.quantity ?? 1;
                    const have = r.staff_roles ? assignedByRole.get(r.staff_roles.id) ?? 0 : 0;
                    const complete = have >= need;
                    return (
                      <Badge
                        key={r.id}
                        variant="outline"
                        className={
                          complete
                            ? "border-emerald-300 bg-emerald-50 text-emerald-900"
                            : "border-amber-300 bg-amber-50 text-amber-900"
                        }
                      >
                        {r.staff_roles?.name ?? "Role"} · {have}/{need}
                      </Badge>
                    );
                  })}
                </div>
              )}
            </section>

            {/* Current assignments */}
            <section>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Assigned staff
              </div>
              {assigned.length === 0 ? (
                <p className="text-sm text-muted-foreground">No staff assigned yet.</p>
              ) : (
                <ul className="divide-y divide-border rounded-lg border border-border">
                  {assigned.map((a) => (
                    <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                      <div>
                        <div className="font-medium">{a.name ?? "Unnamed"}</div>
                        <div className="text-xs text-muted-foreground">
                          {a.staff_roles?.name ?? "No role"}
                          {a.user_id ? " · account linked" : " · no account"}
                        </div>
                      </div>
                      <Button size="sm" variant="ghost" onClick={() => remove(a.id)}>
                        <Trash2 className="h-3.5 w-3.5" />
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            {/* Add form */}
            <section>
              <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Add assignment
              </div>
              <div className="grid gap-2 rounded-lg border border-dashed border-border p-3 sm:grid-cols-2">
                <Input placeholder="Staff name" value={name} onChange={(e) => setName(e.target.value)} />
                <Input
                  placeholder="Email (optional — links account)"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                />
                <Select value={roleId} onValueChange={setRoleId}>
                  <SelectTrigger>
                    <SelectValue placeholder="Role" />
                  </SelectTrigger>
                  <SelectContent>
                    {(rolesQ.data ?? []).map((r) => {
                      const need = requiredByRole.get(r.id) ?? 0;
                      const have = assignedByRole.get(r.id) ?? 0;
                      const label = need > 0 ? `${r.name} (${have}/${need})` : r.name;
                      return (
                        <SelectItem key={r.id} value={r.id}>
                          {label}
                        </SelectItem>
                      );
                    })}
                  </SelectContent>
                </Select>
                <Button onClick={add} disabled={saving || !roleId}>
                  {saving ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <UserPlus className="mr-1.5 h-4 w-4" /> Assign
                    </>
                  )}
                </Button>
              </div>
            </section>
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
