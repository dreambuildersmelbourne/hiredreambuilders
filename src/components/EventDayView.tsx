import { useMemo, useState } from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { AlertTriangle, CheckCircle2, ClipboardList, FileText, Loader2, Mail, Paperclip, Phone, ShieldCheck, Sparkles } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

const CATEGORY_LABELS: Record<string, string> = {
  bump_in: "Bump in",
  during: "During event",
  bump_out: "Bump out",
  bond_release: "Bond release",
};

type Props = {
  bookingId: string;
  /** When set, only show checklist items for this role (plus shared/null-role items). */
  staffRoleId?: string | null;
  /** Whether user can manage (regenerate checklist, run bond release). Admins only. */
  isAdmin?: boolean;
};

export function EventDayView({ bookingId, staffRoleId, isAdmin = false }: Props) {
  const qc = useQueryClient();

  const bookingQ = useQuery({
    queryKey: ["event-day", "booking", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "*, customers(contact_name, organisation, email, phone), booking_rooms(*, rooms(name)), documents(*), payments(*), staff_assignments(*, staff_roles(name, slug))",
        )
        .eq("id", bookingId)
        .single();
      if (error) throw error;
      return data;
    },
  });

  const checklistQ = useQuery({
    queryKey: ["event-day", "checklist", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_day_checklists")
        .select("*, staff_roles(name, slug)")
        .eq("booking_id", bookingId)
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return data ?? [];
    },
  });

  const damageQ = useQuery({
    queryKey: ["event-day", "damage", bookingId],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("damage_reports")
        .select("*")
        .eq("booking_id", bookingId)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data ?? [];
    },
  });

  const filteredChecklist = useMemo(() => {
    const items = checklistQ.data ?? [];
    if (isAdmin || !staffRoleId) return items;
    return items.filter((i: any) => i.staff_role_id === staffRoleId || i.staff_role_id === null);
  }, [checklistQ.data, staffRoleId, isAdmin]);

  const grouped = useMemo(() => {
    const g: Record<string, any[]> = {};
    for (const it of filteredChecklist) {
      const k = it.category || "during";
      (g[k] ||= []).push(it);
    }
    return g;
  }, [filteredChecklist]);

  async function toggleItem(item: any, checked: boolean) {
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase
      .from("event_day_checklists")
      .update({
        completed: checked,
        completed_at: checked ? new Date().toISOString() : null,
        completed_by: checked ? userRes.user?.id ?? null : null,
      })
      .eq("id", item.id);
    if (error) return toast.error(error.message);
    qc.invalidateQueries({ queryKey: ["event-day", "checklist", bookingId] });
  }

  async function generateChecklist() {
    const { data, error } = await supabase.rpc("generate_event_checklist", { _booking_id: bookingId });
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} checklist items generated`);
    qc.invalidateQueries({ queryKey: ["event-day", "checklist", bookingId] });
  }

  if (bookingQ.isLoading || !bookingQ.data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading event…
      </div>
    );
  }

  const b: any = bookingQ.data;
  const c = b.customers;
  const paidTotal = (b.payments ?? []).reduce((s: number, p: any) => s + Number(p.amount ?? 0), 0);
  const depositPaid = !!b.deposit_paid_at;
  const balancePaid = !!b.balance_paid_at;

  const requirements: string[] = [];
  if (b.sound_system) requirements.push("Sound system");
  if (b.av_screens) requirements.push("AV screens");
  if (b.theatre_lighting) requirements.push("Theatre lighting");
  if (b.remove_drums) requirements.push("Remove drums");
  if (b.extra_staff_count > 0) requirements.push(`${b.extra_staff_count} extra crew`);
  if (b.security_required) requirements.push("Security required");

  const cleaningTasks: string[] = [];
  if (b.food_served) cleaningTasks.push("Deep clean after food service");
  if (b.kitchen) cleaningTasks.push("Kitchen sanitisation");
  cleaningTasks.push("Vacuum & mop hired rooms", "Bathrooms restock & clean");

  return (
    <div className="space-y-6">
      <div>
        <div className="text-xs uppercase tracking-widest text-muted-foreground">{b.reference}</div>
        <h1 className="mt-1 font-display text-3xl font-semibold">{b.event_name}</h1>
        <p className="mt-1 text-muted-foreground">
          {format(new Date(b.event_date), "EEEE d MMMM yyyy")} · {b.bump_in_time?.slice(0, 5)}–
          {b.bump_out_time?.slice(0, 5)} · {b.hours}h
        </p>
      </div>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <ClipboardList className="h-4 w-4" /> Event details
              </h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Info label="Bump in">{b.bump_in_time?.slice(0, 5)}</Info>
                <Info label="Bump out">{b.bump_out_time?.slice(0, 5)}</Info>
                <Info label="Expected attendance">{b.estimated_attendance ?? "—"}</Info>
                <Info label="Total hire hours">{b.hours}h</Info>
              </div>
              <div className="mt-5">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rooms booked</div>
                <ul className="mt-2 grid gap-1.5 sm:grid-cols-2">
                  {b.booking_rooms?.map((br: any) => (
                    <li key={br.id} className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm">
                      {br.rooms?.name} {br.hours > 0 && <span className="text-muted-foreground">· {br.hours}h</span>}
                    </li>
                  ))}
                  {b.kitchen && (
                    <li className="rounded-md border border-border bg-muted/40 px-3 py-1.5 text-sm">Kitchen</li>
                  )}
                </ul>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Requirements</h2>
              <div className="mt-3 flex flex-wrap gap-1.5">
                {requirements.length === 0 && <span className="text-sm text-muted-foreground">None specified</span>}
                {requirements.map((r) => (
                  <Badge key={r} variant="secondary">{r}</Badge>
                ))}
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <Info label="Seating changes">{b.seating_changes ? "Yes — configure per customer notes" : "None"}</Info>
                <Info label="Kitchen use">{b.kitchen ? "Yes" : "No"}</Info>
                <Info label="Food service">{b.food_served ? "Yes — food will be served" : "No"}</Info>
                <Info label="AV requirements">
                  {[b.sound_system && "Sound", b.av_screens && "AV screens", b.theatre_lighting && "Lighting"]
                    .filter(Boolean)
                    .join(", ") || "None"}
                </Info>
              </div>
              <div className="mt-4">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Cleaning requirements</div>
                <ul className="mt-2 list-inside list-disc text-sm text-muted-foreground">
                  {cleaningTasks.map((t) => (
                    <li key={t}>{t}</li>
                  ))}
                </ul>
              </div>
              {b.notes && (
                <div className="mt-4 rounded-md bg-muted p-3 text-sm">
                  <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    Customer notes
                  </div>
                  {b.notes}
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <h2 className="font-display text-lg font-semibold">Checklist</h2>
                {isAdmin && (
                  <Button size="sm" variant="secondary" onClick={generateChecklist}>
                    <Sparkles className="mr-1.5 h-4 w-4" /> Generate from templates
                  </Button>
                )}
              </div>
              {checklistQ.isLoading ? (
                <div className="mt-3 flex items-center gap-2 text-sm text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading…
                </div>
              ) : filteredChecklist.length === 0 ? (
                <p className="mt-3 text-sm text-muted-foreground">
                  No checklist items yet.{isAdmin && " Click Generate to create them from templates."}
                </p>
              ) : (
                <div className="mt-4 space-y-5">
                  {(["bump_in", "during", "bump_out", "bond_release"] as const).map((cat) =>
                    grouped[cat]?.length ? (
                      <div key={cat}>
                        <div className="mb-2 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                          {CATEGORY_LABELS[cat]}
                        </div>
                        <ul className="divide-y divide-border rounded-lg border border-border">
                          {grouped[cat].map((it: any) => (
                            <li key={it.id} className="flex items-start gap-3 px-4 py-2.5">
                              <Checkbox
                                checked={it.completed}
                                onCheckedChange={(v) => toggleItem(it, !!v)}
                                className="mt-0.5"
                              />
                              <div className="flex-1">
                                <div className={`text-sm ${it.completed ? "text-muted-foreground line-through" : ""}`}>
                                  {it.item}
                                </div>
                                {isAdmin && it.staff_roles?.name && (
                                  <div className="mt-0.5 text-[11px] uppercase tracking-wider text-muted-foreground">
                                    {it.staff_roles.name}
                                  </div>
                                )}
                              </div>
                              {it.completed && <CheckCircle2 className="h-4 w-4 text-emerald-600" />}
                            </li>
                          ))}
                        </ul>
                      </div>
                    ) : null,
                  )}
                </div>
              )}
            </CardContent>
          </Card>

          <DamageSection bookingId={bookingId} reports={damageQ.data ?? []} loading={damageQ.isLoading} />

          {isAdmin && <BondReleaseSection booking={b} onDone={() => qc.invalidateQueries({ queryKey: ["event-day"] })} />}
        </div>

        <aside className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Customer contact</h2>
              <div className="mt-3 space-y-2 text-sm">
                <div className="font-medium">{c?.contact_name}</div>
                {c?.organisation && <div className="text-muted-foreground">{c.organisation}</div>}
                {c?.email && (
                  <a href={`mailto:${c.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Mail className="h-3.5 w-3.5" /> {c.email}
                  </a>
                )}
                {c?.phone && (
                  <div>
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {c.phone}
                    </a>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Payments</h2>
              <div className="mt-3 space-y-2 text-sm">
                <StatusRow label="Deposit" done={depositPaid} amount={Number(b.deposit_amount)} />
                <StatusRow
                  label="Balance"
                  done={balancePaid}
                  amount={Number(b.total_amount) - Number(b.deposit_amount) - Number(b.discount_amount ?? 0)}
                />
                <div className="mt-2 flex justify-between border-t border-border pt-2 text-xs uppercase tracking-wider text-muted-foreground">
                  <span>Received</span>
                  <span>${paidTotal.toFixed(2)}</span>
                </div>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
                <Paperclip className="h-4 w-4" /> Documents
              </h2>
              {(b.documents ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">None uploaded.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {b.documents.map((d: any) => (
                    <li key={d.id} className="flex items-center gap-2">
                      <FileText className="h-3.5 w-3.5 text-muted-foreground" />
                      <span className="truncate">{d.original_name || d.kind}</span>
                      <span className="ml-auto text-xs uppercase tracking-wider text-muted-foreground">{d.kind}</span>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Assigned staff</h2>
              {(b.staff_assignments ?? []).length === 0 ? (
                <p className="mt-2 text-sm text-muted-foreground">No staff assigned yet.</p>
              ) : (
                <ul className="mt-2 space-y-1.5 text-sm">
                  {b.staff_assignments.map((sa: any) => (
                    <li key={sa.id} className="flex items-center justify-between">
                      <span>{sa.name ?? "Unnamed"}</span>
                      <Badge variant="outline" className="text-xs">{sa.staff_roles?.name ?? "—"}</Badge>
                    </li>
                  ))}
                </ul>
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>
  );
}

function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[11px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 text-sm">{children}</div>
    </div>
  );
}

function StatusRow({ label, done, amount }: { label: string; done: boolean; amount: number }) {
  return (
    <div className="flex items-center justify-between">
      <span>{label}</span>
      <span className={`inline-flex items-center gap-1.5 text-sm ${done ? "text-emerald-600" : "text-muted-foreground"}`}>
        {done && <CheckCircle2 className="h-3.5 w-3.5" />}
        ${amount.toFixed(2)} {done ? "paid" : "due"}
      </span>
    </div>
  );
}

function DamageSection({ bookingId, reports, loading }: { bookingId: string; reports: any[]; loading: boolean }) {
  const qc = useQueryClient();
  const [open, setOpen] = useState(false);
  const [f, setF] = useState({ description: "", location: "", severity: "minor", reporter_name: "" });
  const [saving, setSaving] = useState(false);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    if (!f.description.trim()) return toast.error("Description is required");
    setSaving(true);
    const { data: userRes } = await supabase.auth.getUser();
    const { error } = await supabase.from("damage_reports").insert({
      booking_id: bookingId,
      description: f.description.trim(),
      location: f.location.trim() || null,
      severity: f.severity,
      reporter_name: f.reporter_name.trim() || null,
      reported_by: userRes.user?.id ?? null,
    });
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Damage report saved");
    setF({ description: "", location: "", severity: "minor", reporter_name: "" });
    setOpen(false);
    qc.invalidateQueries({ queryKey: ["event-day", "damage", bookingId] });
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <AlertTriangle className="h-4 w-4" /> Damage reports
          </h2>
          <Button size="sm" variant={open ? "ghost" : "outline"} onClick={() => setOpen((o) => !o)}>
            {open ? "Cancel" : "Report damage"}
          </Button>
        </div>

        {open && (
          <form onSubmit={submit} className="mt-4 space-y-3 rounded-lg border border-dashed border-border p-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <div>
                <Label>Reporter name</Label>
                <Input value={f.reporter_name} onChange={(e) => setF({ ...f, reporter_name: e.target.value })} />
              </div>
              <div>
                <Label>Severity</Label>
                <Select value={f.severity} onValueChange={(v) => setF({ ...f, severity: v })}>
                  <SelectTrigger><SelectValue /></SelectTrigger>
                  <SelectContent>
                    <SelectItem value="minor">Minor</SelectItem>
                    <SelectItem value="moderate">Moderate</SelectItem>
                    <SelectItem value="severe">Severe</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div className="sm:col-span-2">
                <Label>Location</Label>
                <Input value={f.location} onChange={(e) => setF({ ...f, location: e.target.value })} placeholder="e.g. Main Auditorium, back row" />
              </div>
              <div className="sm:col-span-2">
                <Label>Description</Label>
                <Textarea rows={3} value={f.description} onChange={(e) => setF({ ...f, description: e.target.value })} />
              </div>
            </div>
            <div className="flex justify-end">
              <Button type="submit" disabled={saving}>
                {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save damage report"}
              </Button>
            </div>
          </form>
        )}

        {loading ? (
          <div className="mt-3 text-sm text-muted-foreground">Loading…</div>
        ) : reports.length === 0 ? (
          <p className="mt-3 text-sm text-muted-foreground">No damage reported.</p>
        ) : (
          <ul className="mt-4 space-y-2">
            {reports.map((r) => (
              <li key={r.id} className="rounded-md border border-border p-3 text-sm">
                <div className="flex items-center justify-between">
                  <span className="font-medium">{r.reporter_name ?? "Staff"}</span>
                  <Badge variant={r.severity === "severe" ? "destructive" : "outline"} className="text-xs capitalize">
                    {r.severity}
                  </Badge>
                </div>
                {r.location && <div className="mt-0.5 text-xs text-muted-foreground">{r.location}</div>}
                <div className="mt-1">{r.description}</div>
                <div className="mt-1 text-[11px] uppercase tracking-wider text-muted-foreground">
                  {format(new Date(r.created_at), "d MMM yyyy, h:mma")}
                </div>
              </li>
            ))}
          </ul>
        )}
      </CardContent>
    </Card>
  );
}

function BondReleaseSection({ booking, onDone }: { booking: any; onDone: () => void }) {
  const [notes, setNotes] = useState<string>(booking.bond_release_notes ?? "");
  const [saving, setSaving] = useState(false);
  const released = !!booking.bond_released_at;

  async function release() {
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({ bond_released_at: new Date().toISOString(), bond_release_notes: notes || null })
      .eq("id", booking.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Bond release recorded");
    onDone();
  }

  async function reopen() {
    setSaving(true);
    const { error } = await supabase
      .from("bookings")
      .update({ bond_released_at: null })
      .eq("id", booking.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Bond release reopened");
    onDone();
  }

  return (
    <Card>
      <CardContent className="p-6">
        <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
          <ShieldCheck className="h-4 w-4" /> Bond release
        </h2>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirm all bond-release checklist items are complete and no outstanding damage before releasing ${Number(booking.bond ?? 0).toFixed(2)}.
        </p>
        <div className="mt-3">
          <Label>Notes</Label>
          <Textarea rows={2} value={notes} onChange={(e) => setNotes(e.target.value)} disabled={released} />
        </div>
        <div className="mt-3 flex items-center justify-between">
          {released ? (
            <span className="inline-flex items-center gap-1.5 text-sm text-emerald-600">
              <CheckCircle2 className="h-4 w-4" /> Released {format(new Date(booking.bond_released_at), "d MMM yyyy")}
            </span>
          ) : (
            <span className="text-sm text-muted-foreground">Not yet released</span>
          )}
          {released ? (
            <Button size="sm" variant="ghost" onClick={reopen} disabled={saving}>Reopen</Button>
          ) : (
            <Button size="sm" onClick={release} disabled={saving}>
              {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Release bond"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
