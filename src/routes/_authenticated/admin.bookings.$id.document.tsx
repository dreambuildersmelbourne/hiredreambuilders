import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { ChevronLeft, Loader2, Printer } from "lucide-react";
import { Fragment, useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { money, FOH_MANAGER_RATE, FOH_MANAGER_MIN_HOURS } from "@/lib/pricing";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/bookings/$id/document")({
  component: BookingDocument,
});

const VENUE = {
  name: "Dreambuilders Church",
  line1: "Venue Hire",
  email: "hire@dreambuilders.church",
  abnLabel: "",
};

const CREW_RATE = 80;
const CREW_MIN_HOURS = 4;

type Line = { label: string; detail?: string; amount: number };

function BookingDocument() {
  const { id } = Route.useParams();
  const [mode, setMode] = useState<"estimate" | "invoice">("estimate");

  const { data, isLoading } = useQuery({
    queryKey: ["admin", "booking-document", id],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("*, customers(*), booking_rooms(*, rooms(name, hourly_rate)), payments(*)")
        .eq("id", id)
        .single();
      if (error) throw error;
      return data;
    },
  });

  if (isLoading || !data) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const b: any = data;
  const c = b.customers;
  const hours = Number(b.hours ?? 0);

  const roomLines: Line[] = (b.booking_rooms ?? []).map((br: any) => ({
    label: br.rooms?.name ?? "Room hire",
    detail:
      br.rooms?.hourly_rate && Number(br.hours) > 0
        ? `${Number(br.hours)}h × ${money(Number(br.rooms.hourly_rate))}/hr`
        : undefined,
    amount: Number(br.line_total ?? 0),
  }));
  const roomsTotal = roomLines.reduce((s, l) => s + l.amount, 0);
  const roomDiff = Number(b.room_subtotal ?? 0) - roomsTotal;
  if (Math.abs(roomDiff) > 0.005) {
    roomLines.push({ label: "Room hire adjustment", amount: roomDiff });
  }

  const extrasLines: Line[] = [];
  if (b.kitchen) extrasLines.push({ label: "Commercial kitchen access", detail: "Flat fee", amount: 250 });
  if (b.seating_changes)
    extrasLines.push({ label: "Expanded auditorium seating configuration", detail: "Flat fee", amount: 200 });
  if (b.remove_drums) extrasLines.push({ label: "Remove drums from stage", detail: "Flat fee", amount: 200 });
  const extrasKnown = extrasLines.reduce((s, l) => s + l.amount, 0);
  const extrasDiff = Number(b.extras_subtotal ?? 0) - extrasKnown;
  if (Math.abs(extrasDiff) > 0.005) extrasLines.push({ label: "Other extras", amount: extrasDiff });

  const cleaningLines: Line[] = [];
  if (Number(b.cleaning_subtotal ?? 0) > 0) {
    cleaningLines.push({
      label: "Additional cleaning",
      detail: b.food_served ? "Food served at event" : undefined,
      amount: Number(b.cleaning_subtotal),
    });
  }

  const staffHours = Math.max(hours, CREW_MIN_HOURS);
  const staffLines: Line[] = [
    {
      label: "Front of House Manager",
      detail: `${Math.max(hours, FOH_MANAGER_MIN_HOURS)}h × ${money(FOH_MANAGER_RATE)}/hr (min ${FOH_MANAGER_MIN_HOURS}h)`,
      amount: Math.max(hours, FOH_MANAGER_MIN_HOURS) * FOH_MANAGER_RATE,
    },
  ];
  const opDetail = `${staffHours}h × ${money(CREW_RATE)}/hr (min ${CREW_MIN_HOURS}h)`;
  if (b.sound_system) staffLines.push({ label: "Sound Operator", detail: opDetail, amount: staffHours * CREW_RATE });
  if (b.av_screens)
    staffLines.push({ label: "Multimedia / AV Operator", detail: opDetail, amount: staffHours * CREW_RATE });
  if (b.theatre_lighting)
    staffLines.push({ label: "Lighting Operator", detail: opDetail, amount: staffHours * CREW_RATE });
  if (Number(b.extra_staff_count ?? 0) > 0) {
    staffLines.push({
      label: `Additional crew × ${b.extra_staff_count}`,
      detail: `${staffHours}h × ${money(CREW_RATE)}/hr per person`,
      amount: Number(b.extra_staff_count) * staffHours * CREW_RATE,
    });
  }
  const staffKnown = staffLines.reduce((s, l) => s + l.amount, 0);
  const staffTotal = Number(b.staff_subtotal ?? 0);
  const staffDiff = staffTotal - staffKnown;
  if (Math.abs(staffDiff) > 0.005) staffLines.push({ label: "Staffing adjustment", amount: staffDiff });

  const sections = [
    { title: "Room hire", lines: roomLines },
    { title: "Extras & facilities", lines: extrasLines },
    { title: "Cleaning", lines: cleaningLines },
    { title: "Staffing", lines: staffLines },
  ].filter((s) => s.lines.length > 0);

  const discount = Number(b.discount_amount ?? 0);
  const subtotal = Number(b.subtotal_ex_bond ?? 0) - discount;
  const bond = Number(b.bond ?? 0);
  const total = Number(b.total_amount ?? 0) - discount;
  const deposit = Number(b.deposit_amount ?? 0);
  const paid = (b.payments ?? [])
    .filter((p: any) => p.paid_at && p.kind !== "refund")
    .reduce((s: number, p: any) => s + Number(p.amount), 0);
  const balance = total - paid;

  const title = mode === "invoice" ? "Tax Invoice" : "Estimate";

  return (
    <div className="space-y-5">
      <style>{`
        @media print {
          body * { visibility: hidden !important; }
          #hire-doc, #hire-doc * { visibility: visible !important; }
          #hire-doc { position: absolute; left: 0; top: 0; width: 100%; padding: 0; border: 0; box-shadow: none; }
          @page { size: A4; margin: 16mm; }
        }
      `}</style>

      <div className="flex flex-wrap items-center justify-between gap-3 print:hidden">
        <Link
          to="/admin/bookings/$id"
          params={{ id }}
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back to enquiry
        </Link>
        <div className="flex items-center gap-2">
          <div className="flex rounded-md border border-border p-0.5">
            {(["estimate", "invoice"] as const).map((m) => (
              <button
                key={m}
                onClick={() => setMode(m)}
                className={`rounded px-3 py-1.5 text-sm capitalize transition ${
                  mode === m ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:text-foreground"
                }`}
              >
                {m}
              </button>
            ))}
          </div>
          <Button size="sm" onClick={() => window.print()}>
            <Printer className="mr-1.5 h-4 w-4" /> Print / Save as PDF
          </Button>
        </div>
      </div>

      <div
        id="hire-doc"
        className="mx-auto w-full max-w-[820px] rounded-xl border border-border bg-card p-10 text-sm shadow-soft"
      >
        <header className="flex flex-wrap items-start justify-between gap-6 border-b border-border pb-6">
          <div>
            <div className="font-display text-xl font-semibold">{VENUE.name}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              {VENUE.line1}
              <br />
              {VENUE.email}
            </div>
          </div>
          <div className="text-right">
            <div className="font-display text-3xl font-semibold tracking-tight">{title}</div>
            <div className="mt-1 text-xs text-muted-foreground">
              Reference {b.reference}
              <br />
              Issued {format(new Date(), "d MMMM yyyy")}
            </div>
          </div>
        </header>

        <section className="grid gap-6 py-6 sm:grid-cols-2">
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Billed to</div>
            <div className="mt-1.5">
              {c?.organisation && <div className="font-medium">{c.organisation}</div>}
              <div>{c?.contact_name ?? "Internal booking"}</div>
              {c?.email && <div className="text-muted-foreground">{c.email}</div>}
              {c?.phone && <div className="text-muted-foreground">{c.phone}</div>}
            </div>
          </div>
          <div>
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Event</div>
            <div className="mt-1.5">
              <div className="font-medium">{b.event_name}</div>
              <div>{format(new Date(b.event_date), "EEEE d MMMM yyyy")}</div>
              <div className="text-muted-foreground">
                {b.bump_in_time?.slice(0, 5)}–{b.bump_out_time?.slice(0, 5)} · {hours}h access
              </div>
              {b.estimated_attendance ? (
                <div className="text-muted-foreground">{b.estimated_attendance} expected guests</div>
              ) : null}
            </div>
          </div>
        </section>

        <table className="w-full border-collapse text-sm">
          <thead>
            <tr className="border-y border-border text-xs uppercase tracking-wider text-muted-foreground">
              <th className="py-2 text-left font-medium">Description</th>
              <th className="py-2 text-right font-medium">Amount</th>
            </tr>
          </thead>
          <tbody>
            {sections.map((sec) => (
              <Fragment key={sec.title}>
                <tr>
                  <td colSpan={2} className="pt-4 pb-1 text-xs font-semibold uppercase tracking-wider text-primary">
                    {sec.title}
                  </td>
                </tr>
                {sec.lines.map((l, i) => (
                  <tr key={`${sec.title}-${i}`} className="border-b border-border/60">
                    <td className="py-2 pr-4">
                      <div>{l.label}</div>
                      {l.detail && <div className="text-xs text-muted-foreground">{l.detail}</div>}
                    </td>
                    <td className="py-2 text-right tabular-nums">{money(l.amount)}</td>
                  </tr>
                ))}
              </Fragment>
            ))}
          </tbody>
        </table>

        <div className="mt-6 flex justify-end">
          <div className="w-full max-w-[320px] space-y-1.5">
            {discount > 0 && (
              <TotalRow
                label={`Discount${b.discount_reason ? ` — ${b.discount_reason}` : ""}`}
                value={`- ${money(discount)}`}
              />
            )}
            <TotalRow label="Subtotal (ex bond)" value={money(subtotal)} bold />
            <TotalRow label="Refundable bond" value={money(bond)} />
            <div className="my-1 border-t border-border" />
            <div className="flex items-baseline justify-between">
              <span className="font-medium">Total payable</span>
              <span className="font-display text-2xl font-semibold text-primary tabular-nums">{money(total)}</span>
            </div>
            <TotalRow label="20% deposit to secure date" value={money(deposit)} muted />
            {paid > 0 && <TotalRow label="Payments received" value={`- ${money(paid)}`} />}
            <TotalRow label="Balance outstanding" value={money(balance)} bold />
          </div>
        </div>

        {b.notes && (
          <div className="mt-6 border-t border-border pt-4">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Notes</div>
            <p className="mt-1 whitespace-pre-wrap text-sm">{b.notes}</p>
          </div>
        )}

        <footer className="mt-8 border-t border-border pt-4 text-xs text-muted-foreground">
          {mode === "estimate" ? (
            <p>
              This estimate is valid for 30 days and is not a confirmed booking. The date is secured once the
              agreement is signed, required documents are supplied and the 20% deposit is received.
            </p>
          ) : (
            <p>
              Please pay the balance by the due date agreed with the hire coordinator. The bond is refundable after the
              event subject to inspection. Reference {b.reference} on all payments.
            </p>
          )}
        </footer>
      </div>
    </div>
  );
}

function TotalRow({
  label,
  value,
  bold,
  muted,
}: {
  label: string;
  value: string;
  bold?: boolean;
  muted?: boolean;
}) {
  return (
    <div className={`flex justify-between ${muted ? "text-muted-foreground" : ""}`}>
      <span className={bold ? "font-medium" : ""}>{label}</span>
      <span className={`tabular-nums ${bold ? "font-semibold" : ""}`}>{value}</span>
    </div>
  );
}
