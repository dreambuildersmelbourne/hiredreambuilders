import React from "react";
import { format } from "date-fns";

function money(n: number) {
  return new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n || 0);
}

function SectionTitle({ children }: { children: React.ReactNode }) {
  return <div className="mb-1.5 font-display text-sm font-semibold uppercase tracking-wider">{children}</div>;
}

function Def({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd className="font-medium">{children}</dd>
    </div>
  );
}

function FeeRow({ label, v, bold, muted }: { label: string; v: number; bold?: boolean; muted?: boolean }) {
  return (
    <div
      className={`flex items-baseline justify-between border-b border-border px-3 py-1.5 last:border-b-0 ${
        bold ? "font-semibold" : ""
      } ${muted ? "text-xs text-muted-foreground" : ""}`}
    >
      <span>{label}</span>
      <span>{money(v)}</span>
    </div>
  );
}

export function ContractDocument({ booking, contract }: { booking: any; contract: any }) {
  const c = booking.customers;
  const requirements: string[] = [];
  if (booking.food_served) requirements.push("Food will be served (additional cleaning applies)");
  if (booking.sound_system) requirements.push("Sound system");
  if (booking.av_screens) requirements.push("AV screens");
  if (booking.theatre_lighting) requirements.push("Theatre lighting");
  if (booking.seating_changes) requirements.push("Extra / changed seating");
  if (booking.remove_drums) requirements.push("Remove drums from stage");
  if (booking.kitchen) requirements.push("Kitchen access");
  if (booking.extra_staff_count > 0) requirements.push(`${booking.extra_staff_count} extra Dreambuilders crew`);

  const discount = Number(booking.discount_amount ?? 0);
  const netSubtotal = Number(booking.subtotal_ex_bond) - discount;
  const netTotal = Number(booking.total_amount) - discount;

  return (
    <div className="rounded-lg border border-border bg-background p-6 text-sm leading-relaxed">
      <div className="text-center">
        <div className="text-xs uppercase tracking-widest text-muted-foreground">
          Dreambuilders Church — Venue Hire Agreement
        </div>
        <div className="mt-1 font-display text-xl font-semibold">Contract {booking.reference}</div>
        <div className="text-xs text-muted-foreground">Version {contract?.version ?? "v1.1"}</div>
      </div>

      <section className="mt-6">
        <SectionTitle>1. Parties</SectionTitle>
        <p>
          This agreement is made between <strong>Dreambuilders Church</strong> (the Venue) and{" "}
          <strong>{c?.organisation || c?.contact_name}</strong> (the Hirer), represented by {c?.contact_name} (
          {c?.email}
          {c?.phone ? `, ${c.phone}` : ""}).
        </p>
      </section>

      <section className="mt-5">
        <SectionTitle>2. Event &amp; rooms</SectionTitle>
        <dl className="grid gap-2 sm:grid-cols-2">
          <Def label="Event">{booking.event_name}</Def>
          <Def label="Date">{format(new Date(booking.event_date), "EEEE d MMMM yyyy")}</Def>
          <Def label="Bump in / out">
            {booking.bump_in_time?.slice(0, 5)} – {booking.bump_out_time?.slice(0, 5)} ({booking.hours}h)
          </Def>
          <Def label="Estimated attendance">{booking.estimated_attendance ?? "—"}</Def>
        </dl>
        <div className="mt-3">
          <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Rooms</div>
          <ul className="mt-1 list-disc pl-5">
            {booking.booking_rooms?.map((br: any) => (
              <li key={br.id}>
                {br.rooms?.name}
                {br.hours > 0 ? ` — ${br.hours}h @ $${br.rooms?.hourly_rate}/hr` : ""} ={" "}
                {money(Number(br.line_total))}
              </li>
            ))}
          </ul>
        </div>
        {requirements.length > 0 && (
          <div className="mt-3">
            <div className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Requirements</div>
            <ul className="mt-1 list-disc pl-5">
              {requirements.map((r) => (
                <li key={r}>{r}</li>
              ))}
            </ul>
          </div>
        )}
      </section>

      <section className="mt-5">
        <SectionTitle>3. Fees</SectionTitle>
        <div className="rounded-md border border-border">
          <FeeRow label="Room hire" v={Number(booking.room_subtotal)} />
          <FeeRow label="Extras" v={Number(booking.extras_subtotal)} />
          <FeeRow label="Cleaning" v={Number(booking.cleaning_subtotal)} />
          <FeeRow label="Staff" v={Number(booking.staff_subtotal)} />
          {discount > 0 && (
            <FeeRow
              label={`Discount${booking.discount_reason ? ` (${booking.discount_reason})` : ""}`}
              v={-discount}
            />
          )}
          <FeeRow label="Subtotal (ex bond)" v={netSubtotal} bold />
          <FeeRow label="Refundable bond" v={Number(booking.bond)} />
          <FeeRow label="Total payable" v={netTotal} bold />
          <FeeRow label="20% deposit due to confirm" v={Number(booking.deposit_amount)} muted />
        </div>
      </section>

      <section className="mt-5">
        <SectionTitle>4. Payment terms</SectionTitle>
        <p>
          A 20% deposit is required to confirm the booking. The remaining balance and bond are due no later than 14
          days before the event date. The bond is refundable within 14 days after the event, less any deductions for
          damage or breach of these terms.
        </p>
      </section>

      <section className="mt-5">
        <SectionTitle>5. Insurance &amp; compliance</SectionTitle>
        <p>
          The Hirer must provide a current Certificate of Public Liability Insurance for a minimum of $20M cover.
          Where food is prepared, served or sold, the Hirer must hold a valid Streatrader / local council food
          registration. All advertising material must be approved by the Venue prior to distribution.
        </p>
      </section>

      <section className="mt-5">
        <SectionTitle>6. Cancellation</SectionTitle>
        <p>
          Cancellations more than 30 days before the event forfeit 50% of the deposit. Cancellations within 30 days
          forfeit the full deposit. Cancellations within 7 days of the event forfeit all fees paid.
        </p>
      </section>

      <section className="mt-5">
        <SectionTitle>7. Conduct</SectionTitle>
        <p>
          The Hirer is responsible for the conduct of all attendees. Alcohol is not permitted on the premises without
          prior written consent. The Venue reserves the right to end an event without refund if these terms are
          breached.
        </p>
      </section>

      <section className="mt-6 border-t border-border pt-4">
        <SectionTitle>8. Signature</SectionTitle>
        {contract?.signed_at ? (
          <p>
            Signed by <strong className="font-display italic">{contract.signed_name}</strong> on{" "}
            {format(new Date(contract.signed_at), "d MMMM yyyy 'at' h:mma")}
            {contract.signed_method === "upload" ? " (signed copy uploaded)" : " (signed electronically)"}.
          </p>
        ) : (
          <div className="grid gap-6 pt-2 sm:grid-cols-2">
            <div>
              <div className="h-10 border-b border-foreground/40" />
              <div className="mt-1 text-xs text-muted-foreground">Signature of Hirer</div>
            </div>
            <div>
              <div className="h-10 border-b border-foreground/40" />
              <div className="mt-1 text-xs text-muted-foreground">Full name &amp; date</div>
            </div>
          </div>
        )}
      </section>
    </div>
  );
}
