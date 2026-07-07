import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, Loader2, Mail, Phone, StickyNote } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/pricing";
import { Card, CardContent } from "@/components/ui/card";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { Button } from "@/components/ui/button";
import { useState, useEffect } from "react";

export const Route = createFileRoute("/_authenticated/admin/bookings/$id")({
  component: BookingDetail,
});

const STATUSES = [
  { v: "enquiry", label: "New enquiry" },
  { v: "reviewing", label: "Reviewing" },
  { v: "staffing_confirmed", label: "Staffing confirmed" },
  { v: "invoiced", label: "Invoiced" },
  { v: "deposit_paid", label: "Deposit paid" },
  { v: "confirmed", label: "Confirmed" },
  { v: "completed", label: "Completed" },
  { v: "cancelled", label: "Cancelled" },
];

function BookingDetail() {
  const { id } = Route.useParams();
  const qc = useQueryClient();
  const [savingStatus, setSavingStatus] = useState(false);
  const [adminNotes, setAdminNotes] = useState("");
  const [savingNotes, setSavingNotes] = useState(false);

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "booking", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, customers(*), booking_rooms(*, rooms(name, hourly_rate))")
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

  async function updateStatus(v: string) {
    setSavingStatus(true);
    const { error } = await supabase.from("bookings").update({ status: v as any }).eq("id", id);
    setSavingStatus(false);
    if (error) return toast.error(error.message);
    toast.success("Status updated");
    qc.invalidateQueries({ queryKey: ["admin"] });
  }

  async function saveNotes() {
    setSavingNotes(true);
    const { error } = await supabase.from("bookings").update({ admin_notes: adminNotes }).eq("id", id);
    setSavingNotes(false);
    if (error) return toast.error(error.message);
    toast.success("Notes saved");
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
        </div>
        <div className="min-w-[220px]">
          <label className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
            Status
          </label>
          <Select value={data.status} onValueChange={updateStatus} disabled={savingStatus}>
            <SelectTrigger className="mt-1.5">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {STATUSES.map((s) => (
                <SelectItem key={s.v} value={s.v}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

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
                <Info label="Estimated attendance">{data.estimated_attendance ?? "—"}</Info>
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
                <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                  Requirements
                </div>
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
              <h2 className="font-display text-lg font-semibold">Quote breakdown</h2>
              <div className="mt-4 space-y-1.5 text-sm">
                <Row label="Room hire" value={money(Number(data.room_subtotal))} />
                <Row label="Extras" value={money(Number(data.extras_subtotal))} />
                <Row label="Cleaning" value={money(Number(data.cleaning_subtotal))} />
                <Row label="Staff" value={money(Number(data.staff_subtotal))} />
                <div className="my-2 border-t border-border" />
                <Row label="Subtotal (ex bond)" value={money(Number(data.subtotal_ex_bond))} bold />
                <Row label="Bond" value={money(Number(data.bond))} />
                <Row label="20% deposit" value={money(Number(data.deposit_amount))} muted />
                <div className="my-2 border-t border-border" />
                <div className="flex items-baseline justify-between">
                  <span className="font-display text-base font-semibold">Total</span>
                  <span className="font-display text-2xl font-semibold text-primary">
                    {money(Number(data.total_amount))}
                  </span>
                </div>
              </div>
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
