import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import {
  Calendar,
  Check,
  CheckCircle2,
  ChevronLeft,
  DollarSign,
  FileText,
  Loader2,
  Mail,
  MessageSquare,
  Phone,
  ShieldAlert,
  ShieldCheck,
  Sparkles,
  StickyNote,
  Trash2,
  UserCheck,
  UserPlus,
  X,
} from "lucide-react";
import { toast } from "sonner";
import { useEffect, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/pricing";
import { BOOKING_STATUSES, statusMeta } from "@/lib/booking-meta";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { EditBookingDialog } from "@/components/EditBookingDialog";
import { AdminAttachments } from "@/components/AdminAttachments";


export const Route = createFileRoute("/_authenticated/admin/bookings/$id")({
  component: BookingDetail,
});

function BookingDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "*, customers(*), booking_rooms(*, rooms(name, hourly_rate)), documents(*), contracts(*), payments(*)",
        )
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  useEffect(() => {
    if (data?.admin_notes) setAdminNotes(data.admin_notes);
  }, [data?.admin_notes]);

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const bk = data;

  async function patch(patch: Record<string, unknown>, msg: string) {
    const { error } = await supabase.from("bookings").update(patch as never).eq("id", id);
    if (error) return toast.error(error.message);
    toast.success(msg);
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function updateStatus(v: string) {
    await patch({ status: v }, "Status updated");
  }

  async function saveNotes() {
    setSavingNotes(true);
    const { error } = await supabase.from("bookings").update({ admin_notes: adminNotes }).eq("id", id);
    setSavingNotes(false);
    if (error) return toast.error(error.message);
    toast.success("Notes saved");
  }

  async function approve() {
    await patch({ status: "approved", approved_at: new Date().toISOString(), rejected_at: null, rejection_reason: null }, "Booking approved");
  }
  async function confirmStaffing() {
    await patch({ status: "staffing_confirmed", staffing_confirmed_at: new Date().toISOString() }, "Staffing confirmed");
  }
  async function markDepositPaid() {
    const amt = Number(bk.deposit_amount);
    const { error } = await supabase.from("payments").insert({ booking_id: id, kind: "deposit", amount: amt, paid_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    await patch({ status: "deposit_paid", deposit_paid_at: new Date().toISOString() }, "Deposit marked paid");
  }
  async function markBalancePaid() {
    const discount = Number(bk.discount_amount ?? 0);
    const balance = Number(bk.total_amount) - discount - Number(bk.deposit_amount);
    const { error } = await supabase.from("payments").insert({ booking_id: id, kind: "balance", amount: balance, paid_at: new Date().toISOString() });
    if (error) return toast.error(error.message);
    await patch({ status: "confirmed", balance_paid_at: new Date().toISOString() }, "Balance marked paid");
  }

  const c = data.customers;
  const requirements: string[] = [];
  if (data.food_served) requirements.push("Food will be served");
  if (data.sound_system) requirements.push("Sound system");
  if (data.av_screens) requirements.push("AV screens");
  if (data.theatre_lighting) requirements.push("Theatre lighting");
  if (data.seating_changes) requirements.push("Seating changes");
  if (data.remove_drums) requirements.push("Remove drums");
  if (data.kitchen) requirements.push("Kitchen");
  if (data.extra_staff_count > 0) requirements.push(`${data.extra_staff_count} extra crew`);

  const fohHours = Math.max(Number(data.hours ?? 0), 4);
  const fohAmount = fohHours * 80;


  const s = statusMeta(data.status);
  const discount = Number(data.discount_amount ?? 0);
  const netTotal = Number(data.total_amount) - discount;
  const contract = data.contracts?.[0];

  return (
    <div className="space-y-6">
      <Link
        to="/admin"
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
      >
        <ChevronLeft className="h-4 w-4" /> Back to enquiries
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="text-xs uppercase tracking-widest text-muted-foreground">{data.reference}</div>
          <h1 className="mt-1 font-display text-3xl font-semibold">{data.event_name}</h1>
          <p className="mt-1 text-muted-foreground">
            {format(new Date(data.event_date), "EEEE d MMMM yyyy")} · {data.bump_in_time?.slice(0, 5)}–
            {data.bump_out_time?.slice(0, 5)} · {data.hours}h
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Badge variant="outline" className={s.className}>{s.label}</Badge>
            {data.tentative_hold_requested && (
              <Badge variant="outline" className="border-amber-300 bg-amber-100 text-amber-900">
                Tentative hold requested
              </Badge>
            )}
          </div>
          {data.tentative_hold_requested && data.status === "enquiry" && (
            <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md border border-amber-300 bg-amber-50 p-2.5 text-xs text-amber-900">
              <span>
                Customer requested a tentative date hold — subject to approval, staffing, documents and deposit.
              </span>
              <label className="ml-auto inline-flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={!!data.staff_can_view_tentative}
                  onChange={async (e) => {
                    await patch({ staff_can_view_tentative: e.target.checked }, "Staff visibility updated");
                  }}
                />
                Visible to staff (read-only)
              </label>
            </div>
          )}
        </div>
        <div className="min-w-[220px]">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Status</label>
          <Select value={data.status} onValueChange={updateStatus}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {BOOKING_STATUSES.map((st) => (
                <SelectItem key={st.v} value={st.v}>{st.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* ACTION BAR */}
      <Card>
        <CardContent className="flex flex-wrap gap-2 p-4">
          <Button size="sm" onClick={approve} disabled={data.status === "approved"}>
            <Check className="mr-1.5 h-4 w-4" /> Approve
          </Button>
          <EditBookingDialog booking={data} onDone={() => qc.invalidateQueries({ queryKey: ["admin"] })} />
          <Button size="sm" variant="outline" asChild>
            <Link to="/admin/booking-document/$id" params={{ id }}>
              <FileText className="mr-1.5 h-4 w-4" /> Estimate / Invoice PDF
            </Link>
          </Button>
          <RejectDialog bookingId={id} onDone={() => qc.invalidateQueries({ queryKey: ["admin"] })} />


          <RequestInfoDialog bookingId={id} current={data.info_request_message} onDone={() => qc.invalidateQueries({ queryKey: ["admin"] })} />
          <DiscountDialog booking={data} onDone={() => qc.invalidateQueries({ queryKey: ["admin"] })} />
          <OverrideDialog booking={data} onDone={() => qc.invalidateQueries({ queryKey: ["admin"] })} />
          <div className="mx-1 h-8 w-px bg-border" />
          <Button size="sm" variant="secondary" onClick={confirmStaffing} disabled={!!data.staffing_confirmed_at}>
            <UserCheck className="mr-1.5 h-4 w-4" />
            {data.staffing_confirmed_at ? "Staffing confirmed" : "Confirm staffing"}
          </Button>
          <Button size="sm" variant="secondary" onClick={markDepositPaid} disabled={!!data.deposit_paid_at}>
            <DollarSign className="mr-1.5 h-4 w-4" />
            {data.deposit_paid_at ? "Deposit paid" : "Mark deposit paid"}
          </Button>
          <Button size="sm" variant="secondary" onClick={markBalancePaid} disabled={!!data.balance_paid_at || !data.deposit_paid_at}>
            <DollarSign className="mr-1.5 h-4 w-4" />
            {data.balance_paid_at ? "Balance paid" : "Mark balance paid"}
          </Button>
        </CardContent>
      </Card>

      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_360px]">
        <div className="space-y-6">
          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Customer</h2>
              <div className="mt-3 grid gap-3 sm:grid-cols-2">
                <Info label="Contact">{c?.contact_name}</Info>
                <Info label="Organisation">{c?.organisation || "—"}</Info>
                <Info label="Email">
                  <a href={`mailto:${c?.email}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                    <Mail className="h-3.5 w-3.5" /> {c?.email}
                  </a>
                </Info>
                <Info label="Phone">
                  {c?.phone ? (
                    <a href={`tel:${c.phone}`} className="inline-flex items-center gap-1.5 text-primary hover:underline">
                      <Phone className="h-3.5 w-3.5" /> {c.phone}
                    </a>
                  ) : (
                    "—"
                  )}
                </Info>
                <Info label="Account">{c?.user_id ? "Linked" : "Anonymous (no account yet)"}</Info>
                <Info label="Submitted">{format(new Date(data.created_at), "d MMM yyyy, h:mma")}</Info>
              </div>
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Rooms & requirements</h2>
              <div className="mt-4">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rooms</div>
                <ul className="mt-2 divide-y divide-border rounded-lg border border-border">
                  {data.booking_rooms?.map((br: any) => (
                    <li key={br.id} className="flex items-center justify-between px-4 py-2.5 text-sm">
                      <span>{br.rooms?.name}</span>
                      <span className="text-muted-foreground">
                        {br.hours > 0 ? `${br.hours}h · ` : ""}
                        {money(Number(br.line_total))}
                      </span>
                    </li>
                  ))}
                </ul>
              </div>
              <div className="mt-5">
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Requirements</div>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {requirements.length === 0 && <span className="text-sm text-muted-foreground">None</span>}
                  {requirements.map((r) => (
                    <span key={r} className="rounded-full bg-accent px-2.5 py-1 text-xs text-accent-foreground">
                      {r}
                    </span>
                  ))}
                </div>
              </div>
              {data.notes && (
                <div className="mt-5 rounded-lg bg-muted p-3 text-sm">
                  <div className="mb-1 flex items-center gap-1.5 text-xs font-medium uppercase tracking-wider text-muted-foreground">
                    <StickyNote className="h-3.5 w-3.5" /> Customer notes
                  </div>
                  <p className="whitespace-pre-wrap">{data.notes}</p>
                </div>
              )}
            </CardContent>
          </Card>

          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Required staff</h2>
              </div>
              <div className="mt-3 rounded-lg border border-primary/25 bg-primary/5 p-4">
                <div className="flex flex-wrap items-baseline justify-between gap-2">
                  <div>
                    <div className="font-medium">Hire Front of House Manager</div>
                    <div className="text-xs text-muted-foreground">
                      Auto-assigned to every hire · required on-site contact
                    </div>
                  </div>
                  <div className="text-sm">
                    <span className="font-semibold">{money(fohAmount)}</span>
                    <span className="ml-1 text-muted-foreground">
                      · {fohHours}h × $80/hr (min 4h)
                    </span>
                  </div>
                </div>
                <div className="mt-3 grid gap-2 text-xs sm:grid-cols-2">
                  <div>
                    <div className="uppercase tracking-wider text-muted-foreground">Hire access</div>
                    <div className="mt-0.5 text-sm">
                      {bk.bump_in_time?.slice(0, 5)}–{bk.bump_out_time?.slice(0, 5)} · {bk.hours}h
                    </div>
                  </div>
                  <div>
                    <div className="uppercase tracking-wider text-muted-foreground">Key contact</div>
                    <div className="mt-0.5 text-sm">
                      {c?.contact_name}
                      {c?.phone ? <span className="text-muted-foreground"> · {c.phone}</span> : null}
                    </div>
                  </div>
                  <div className="sm:col-span-2">
                    <div className="uppercase tracking-wider text-muted-foreground">Rooms hired</div>
                    <div className="mt-0.5 text-sm">
                      {(bk.booking_rooms ?? [])
                        .map((br: any) => br.rooms?.name)
                        .filter(Boolean)
                        .join(", ") || "—"}
                    </div>
                  </div>
                  {bk.notes && (
                    <div className="sm:col-span-2">
                      <div className="uppercase tracking-wider text-muted-foreground">Event day notes</div>
                      <div className="mt-0.5 whitespace-pre-wrap text-sm">{bk.notes}</div>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Documents & attachments */}

          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Documents &amp; attachments</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Customer uploads plus anything you attach — liability certificates, paid invoices, receipts.
              </p>
              <div className="mt-4">
                <AdminAttachments
                  bookingId={id}
                  documents={(data.documents ?? []) as never}
                  onChanged={() => qc.invalidateQueries({ queryKey: ["admin", "booking", id] })}
                />
              </div>
            </CardContent>
          </Card>


          {/* Contract status */}
          <Card>
            <CardContent className="p-6">
              <div className="flex items-center gap-2">
                <FileText className="h-5 w-5 text-primary" />
                <h2 className="font-display text-lg font-semibold">Contract</h2>
              </div>
              {contract ? (
                contract.signed_at ? (
                  <p className="mt-2 text-sm">
                    <CheckCircle2 className="mr-1 inline h-4 w-4 text-emerald-600" />
                    Signed by <strong className="font-display italic">{contract.signed_name}</strong> on{" "}
                    {format(new Date(contract.signed_at), "d MMM yyyy, h:mma")}
                  </p>
                ) : (
                  <p className="mt-2 text-sm text-muted-foreground">Contract created but not yet signed.</p>
                )
              ) : (
                <p className="mt-2 text-sm text-muted-foreground">
                  Contract will be generated when the customer opens their booking.
                </p>
              )}
            </CardContent>
          </Card>

          <EventDayOpsCard booking={data} onDone={() => qc.invalidateQueries({ queryKey: ["admin"] })} />



          <Card>
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Internal notes</h2>
              <Textarea
                rows={4}
                className="mt-3"
                value={adminNotes}
                onChange={(e) => setAdminNotes(e.target.value)}
                placeholder="Notes for the hire coordinator team…"
              />
              <div className="mt-3 flex justify-end">
                <Button onClick={saveNotes} disabled={savingNotes}>
                  {savingNotes ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save notes"}
                </Button>
              </div>
            </CardContent>
          </Card>
        </div>

        <div>
          <Card className="lg:sticky lg:top-24">
            <CardContent className="p-6">
              <h2 className="font-display text-lg font-semibold">Estimate breakdown</h2>
              <div className="mt-4 space-y-1.5 text-sm">
                <Row label="Room hire" value={money(Number(data.room_subtotal))} />
                <Row label="Extras" value={money(Number(data.extras_subtotal))} />
                <Row label="Cleaning" value={money(Number(data.cleaning_subtotal))} />
                <Row label="Staff" value={money(Number(data.staff_subtotal))} />
                {discount > 0 && (
                  <Row label={`Discount${data.discount_reason ? ` — ${data.discount_reason}` : ""}`} value={`- ${money(discount)}`} />
                )}
                <div className="my-2 border-t border-border" />
                <Row label="Subtotal (ex bond)" value={money(Number(data.subtotal_ex_bond) - discount)} bold />
                <Row label="Bond" value={money(Number(data.bond))} />
                <Row label="20% deposit" value={money(Number(data.deposit_amount))} muted />
                <div className="my-2 border-t border-border" />
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-base font-semibold">Total</span>
                  <span className="font-display text-2xl font-semibold text-primary">{money(netTotal)}</span>
                </div>
              </div>

              {data.payments?.length > 0 && (
                <div className="mt-5">
                  <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Payments</div>
                  <ul className="mt-2 space-y-1 text-sm">
                    {data.payments.map((p: any) => (
                      <li key={p.id} className="flex justify-between">
                        <span className="capitalize">{p.kind}</span>
                        <span>{money(Number(p.amount))}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}




function Info({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 text-sm">{children}</div>
    </div>
  );
}

function Row({ label, value, bold, muted }: { label: string; value: string; bold?: boolean; muted?: boolean }) {
  return (
    <div className={`flex items-baseline justify-between ${bold ? "font-semibold" : ""} ${muted ? "text-muted-foreground" : ""}`}>
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

// ============ Dialogs ============

function RejectDialog({ bookingId, onDone }: { bookingId: string; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [reason, setReason] = useState("");
  const [saving, setSaving] = useState(false);
  async function submit() {
    setSaving(true);
    const { error } = await supabase.from("bookings").update({
      status: "rejected",
      rejected_at: new Date().toISOString(),
      rejection_reason: reason.trim() || null,
    }).eq("id", bookingId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Booking rejected");
    setOpen(false);
    onDone();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><X className="mr-1.5 h-4 w-4" /> Reject</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Reject this booking</DialogTitle>
          <DialogDescription>Give the customer a short reason (they will see this).</DialogDescription>
        </DialogHeader>
        <Textarea rows={4} value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. The auditorium is already booked on this date." />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button variant="destructive" onClick={submit} disabled={saving}>
            {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Reject booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function RequestInfoDialog({ bookingId, current, onDone }: { bookingId: string; current?: string | null; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [msg, setMsg] = useState(current ?? "");
  const [saving, setSaving] = useState(false);
  async function submit() {
    if (!msg.trim()) return toast.error("Write a message for the customer");
    setSaving(true);
    const { error } = await supabase.from("bookings").update({
      status: "info_requested",
      info_request_message: msg.trim(),
    }).eq("id", bookingId);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Info requested");
    setOpen(false);
    onDone();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><MessageSquare className="mr-1.5 h-4 w-4" /> Request info</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Request more information</DialogTitle>
          <DialogDescription>The customer will see this message on their booking page.</DialogDescription>
        </DialogHeader>
        <Textarea rows={4} value={msg} onChange={(e) => setMsg(e.target.value)} placeholder="e.g. Please upload your public liability certificate before we can approve this." />
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Send request"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function DiscountDialog({ booking, onDone }: { booking: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [amount, setAmount] = useState<string>(String(booking.discount_amount ?? "0"));
  const [reason, setReason] = useState(booking.discount_reason ?? "");
  const [saving, setSaving] = useState(false);
  async function submit() {
    const a = Math.max(0, Number(amount) || 0);
    setSaving(true);
    const { error } = await supabase.from("bookings").update({
      discount_amount: a,
      discount_reason: reason.trim() || null,
    }).eq("id", booking.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Discount applied");
    setOpen(false);
    onDone();
  }
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline"><DollarSign className="mr-1.5 h-4 w-4" /> Discount</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Apply a discount</DialogTitle>
          <DialogDescription>Reduces the customer's payable total. Bond is unaffected.</DialogDescription>
        </DialogHeader>
        <div className="space-y-3">
          <div>
            <Label>Amount (AUD)</Label>
            <Input type="number" min={0} step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} />
          </div>
          <div>
            <Label>Reason (shown to customer)</Label>
            <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="e.g. Community rate" />
          </div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Apply"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

function OverrideDialog({ booking, onDone }: { booking: any; onDone: () => void }) {
  const [open, setOpen] = useState(false);
  const [saving, setSaving] = useState(false);
  const [f, setF] = useState({
    room_subtotal: String(booking.room_subtotal ?? 0),
    extras_subtotal: String(booking.extras_subtotal ?? 0),
    cleaning_subtotal: String(booking.cleaning_subtotal ?? 0),
    staff_subtotal: String(booking.staff_subtotal ?? 0),
    bond: String(booking.bond ?? 0),
  });

  const room = Number(f.room_subtotal) || 0;
  const extras = Number(f.extras_subtotal) || 0;
  const cleaning = Number(f.cleaning_subtotal) || 0;
  const staff = Number(f.staff_subtotal) || 0;
  const bond = Number(f.bond) || 0;
  const subtotal = room + extras + cleaning + staff;
  const deposit = Math.round(subtotal * 0.2 * 100) / 100;
  const total = subtotal + bond;

  async function submit() {
    setSaving(true);
    const { error } = await supabase.from("bookings").update({
      room_subtotal: room,
      extras_subtotal: extras,
      cleaning_subtotal: cleaning,
      staff_subtotal: staff,
      bond,
      subtotal_ex_bond: subtotal,
      deposit_amount: deposit,
      total_amount: total,
    }).eq("id", booking.id);
    setSaving(false);
    if (error) return toast.error(error.message);
    toast.success("Estimate overridden");
    setOpen(false);
    onDone();
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">Override estimate</Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>Override estimate line items</DialogTitle>
          <DialogDescription>Deposit (20%) and total are recalculated automatically.</DialogDescription>
        </DialogHeader>
        <div className="grid gap-3 sm:grid-cols-2">
          {(["room_subtotal","extras_subtotal","cleaning_subtotal","staff_subtotal","bond"] as const).map((k) => (
            <div key={k}>
              <Label className="capitalize">{k.replace(/_/g, " ")}</Label>
              <Input type="number" min={0} step="0.01" value={f[k]} onChange={(e) => setF({ ...f, [k]: e.target.value })} />
            </div>
          ))}
        </div>
        <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
          <div className="flex justify-between"><span>Subtotal (ex bond)</span><span className="font-medium">{money(subtotal)}</span></div>
          <div className="flex justify-between"><span>Bond</span><span>{money(bond)}</span></div>
          <div className="flex justify-between"><span>20% deposit</span><span>{money(deposit)}</span></div>
          <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold"><span>Total</span><span>{money(total)}</span></div>
        </div>
        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button onClick={submit} disabled={saving}>{saving ? <Loader2 className="h-4 w-4 animate-spin" /> : "Save override"}</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}

// ============ Event Day Ops ============

function EventDayOpsCard({ booking, onDone }: { booking: any; onDone: () => void }) {
  const qc = useQueryClient();
  const [secSaving, setSecSaving] = useState(false);

  const rolesQ = useQuery({
    queryKey: ["staff_roles"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_roles").select("id, name, slug").eq("active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const assignQ = useQuery({
    queryKey: ["admin", "assignments", booking.id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("staff_assignments")
        .select("*, staff_roles(name)")
        .eq("booking_id", booking.id)
        .order("created_at");
      if (error) throw error;
      return data ?? [];
    },
  });

  async function toggleSecurity(v: boolean) {
    setSecSaving(true);
    const { error } = await supabase.from("bookings").update({ security_required: v }).eq("id", booking.id);
    setSecSaving(false);
    if (error) return toast.error(error.message);
    toast.success(v ? "Security marked required" : "Security requirement removed");
    onDone();
  }

  async function generateChecklist() {
    const { data, error } = await supabase.rpc("generate_event_checklist", { _booking_id: booking.id });
    if (error) return toast.error(error.message);
    toast.success(`${data ?? 0} checklist items generated`);
  }

  return (
    <Card>
      <CardContent className="p-6">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 font-display text-lg font-semibold">
            <Calendar className="h-5 w-5 text-primary" /> Event day operations
          </h2>
          <div className="flex gap-2">
            <Link
              to="/staff/events/$id"
              params={{ id: booking.id }}
              className="inline-flex items-center gap-1.5 rounded-md border border-border px-3 py-1.5 text-xs font-medium hover:bg-muted"
            >
              Open event day page
            </Link>
            <Button size="sm" variant="secondary" onClick={generateChecklist}>
              <Sparkles className="mr-1.5 h-4 w-4" /> Generate checklists
            </Button>
          </div>
        </div>

        <label className="mt-4 flex items-start gap-3 rounded-lg border border-dashed border-border p-3">
          <input
            type="checkbox"
            className="mt-0.5 h-4 w-4"
            checked={!!booking.security_required}
            disabled={secSaving}
            onChange={(e) => toggleSecurity(e.target.checked)}
          />
          <div>
            <div className="flex items-center gap-1.5 text-sm font-medium">
              <ShieldAlert className="h-3.5 w-3.5 text-amber-600" /> Security required for this event
            </div>
            <p className="text-xs text-muted-foreground">
              When enabled, security tasks are added to the event day checklist.
            </p>
          </div>
        </label>

        <div className="mt-5">
          <div className="mb-2 flex items-center justify-between">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Staff assignments</div>
          </div>
          {assignQ.isLoading ? (
            <div className="text-sm text-muted-foreground">Loading…</div>
          ) : (assignQ.data ?? []).length === 0 ? (
            <p className="text-sm text-muted-foreground">No staff assigned yet.</p>
          ) : (
            <ul className="divide-y divide-border rounded-lg border border-border">
              {assignQ.data!.map((a: any) => (
                <li key={a.id} className="flex items-center justify-between px-3 py-2 text-sm">
                  <div>
                    <div className="font-medium">{a.name ?? "Unnamed"}</div>
                    <div className="text-xs text-muted-foreground">{a.staff_roles?.name ?? "No role"}</div>
                  </div>
                  <RemoveAssignmentBtn
                    id={a.id}
                    onDone={() => qc.invalidateQueries({ queryKey: ["admin", "assignments", booking.id] })}
                  />
                </li>
              ))}
            </ul>
          )}
          <AddAssignmentForm
            bookingId={booking.id}
            roles={rolesQ.data ?? []}
            onDone={() => qc.invalidateQueries({ queryKey: ["admin", "assignments", booking.id] })}
          />
        </div>
      </CardContent>
    </Card>
  );
}

function AddAssignmentForm({
  bookingId,
  roles,
  onDone,
}: {
  bookingId: string;
  roles: { id: string; name: string; slug: string }[];
  onDone: () => void;
}) {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [roleId, setRoleId] = useState("");
  const [saving, setSaving] = useState(false);

  async function add() {
    if (!roleId) return toast.error("Select a role");
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
    toast.success(userId ? "Assigned & linked to account" : "Assigned (no matching account found)");
    setName("");
    setEmail("");
    setRoleId("");
    onDone();
  }

  return (
    <div className="mt-3 grid gap-2 rounded-lg border border-dashed border-border p-3 sm:grid-cols-[1fr_1fr_1fr_auto]">
      <Input placeholder="Staff name" value={name} onChange={(e) => setName(e.target.value)} />
      <Input placeholder="Email (optional, links account)" value={email} onChange={(e) => setEmail(e.target.value)} />
      <Select value={roleId} onValueChange={setRoleId}>
        <SelectTrigger><SelectValue placeholder="Role" /></SelectTrigger>
        <SelectContent>
          {roles.map((r) => (
            <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
          ))}
        </SelectContent>
      </Select>
      <Button size="sm" onClick={add} disabled={saving || !roleId}>
        {saving ? <Loader2 className="h-4 w-4 animate-spin" /> : <><UserPlus className="mr-1.5 h-4 w-4" /> Assign</>}
      </Button>
    </div>
  );
}

function RemoveAssignmentBtn({ id, onDone }: { id: string; onDone: () => void }) {
  const [busy, setBusy] = useState(false);
  async function remove() {
    setBusy(true);
    const { error } = await supabase.from("staff_assignments").delete().eq("id", id);
    setBusy(false);
    if (error) return toast.error(error.message);
    onDone();
  }
  return (
    <Button size="sm" variant="ghost" onClick={remove} disabled={busy}>
      <Trash2 className="h-3.5 w-3.5" />
    </Button>
  );
}

