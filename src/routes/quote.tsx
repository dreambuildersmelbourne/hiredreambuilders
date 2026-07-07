import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useMemo, useState } from "react";
import { useQuery } from "@tanstack/react-query";
import { z } from "zod";
import { toast } from "sonner";
import { CheckCircle2, ChevronLeft, Loader2 } from "lucide-react";

import { SiteHeader } from "@/components/SiteHeader";
import { supabase } from "@/integrations/supabase/client";
import { calculateQuote, money, type Room } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Card, CardContent } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";

export const Route = createFileRoute("/quote")({
  validateSearch: (s: Record<string, unknown>) => ({
    rooms: typeof s.rooms === "string" ? s.rooms : undefined,
    inspection: s.inspection === "1" || s.inspection === true ? true : undefined,
  }),
  head: () => ({
    meta: [
      { title: "Get a Quote — Dreambuilders Venue Hire" },
      {
        name: "description",
        content:
          "Configure your rooms, extras and staffing to get an instant baseline hire quote from Dreambuilders Church.",
      },
    ],
  }),
  component: QuotePage,
});

const enquirySchema = z.object({
  event_name: z.string().trim().min(1, "Event name is required").max(200),
  event_date: z.string().min(1, "Event date is required"),
  bump_in: z.string().min(1),
  bump_out: z.string().min(1),
  attendance: z.number().int().min(0).max(10000).optional(),
  contact_name: z.string().trim().min(1, "Your name is required").max(120),
  organisation: z.string().trim().max(200).optional(),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(2000).optional(),
});

function QuotePage() {
  const navigate = useNavigate();
  const search = Route.useSearch();
  const initialRoomIds = search.rooms ? search.rooms.split(",").filter(Boolean) : [];
  const inspectionRequested = !!search.inspection;
  const roomsQuery = useQuery({
    queryKey: ["rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data as unknown as Room[];
    },
  });

  const [form, setForm] = useState({
    event_name: "",
    event_date: "",
    bump_in: "09:00",
    bump_out: "13:00",
    attendance: "" as string,
    selectedRoomIds: initialRoomIds as string[],
    kitchen: false,
    foodServed: false,
    soundSystem: false,
    avScreens: false,
    theatreLighting: false,
    seatingChanges: false,
    removeDrums: false,
    extraStaffCount: 0,
    contact_name: "",
    organisation: "",
    email: "",
    phone: "",
    notes: "",
  });
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState<null | { ref: string }>(null);

  const rooms = roomsQuery.data ?? [];
  const nonKitchenRooms = useMemo(
    () => rooms.filter((r) => r.slug !== "kitchen"),
    [rooms],
  );
  const kitchenRoom = rooms.find((r) => r.slug === "kitchen");

  const quote = useMemo(
    () =>
      calculateQuote(
        {
          bumpIn: form.bump_in,
          bumpOut: form.bump_out,
          selectedRoomIds: form.selectedRoomIds,
          kitchen: form.kitchen,
          foodServed: form.foodServed,
          seatingChanges: form.seatingChanges,
          removeDrums: form.removeDrums,
          extraStaffCount: form.extraStaffCount,
        },
        nonKitchenRooms,
      ),
    [form, nonKitchenRooms],
  );

  const canSubmit =
    form.event_name.trim() &&
    form.event_date &&
    form.selectedRoomIds.length > 0 &&
    form.contact_name.trim() &&
    form.email.trim();

  const toggleRoom = (id: string) => {
    setForm((f) => ({
      ...f,
      selectedRoomIds: f.selectedRoomIds.includes(id)
        ? f.selectedRoomIds.filter((x) => x !== id)
        : [...f.selectedRoomIds, id],
    }));
  };

  async function submit() {
    const parse = enquirySchema.safeParse({
      event_name: form.event_name,
      event_date: form.event_date,
      bump_in: form.bump_in,
      bump_out: form.bump_out,
      attendance: form.attendance ? Number(form.attendance) : undefined,
      contact_name: form.contact_name,
      organisation: form.organisation || undefined,
      email: form.email,
      phone: form.phone || undefined,
      notes: form.notes || undefined,
    });
    if (!parse.success) {
      toast.error(parse.error.issues[0]?.message ?? "Please check the form");
      return;
    }
    if (form.selectedRoomIds.length === 0) {
      toast.error("Select at least one room");
      return;
    }

    setSubmitting(true);
    try {
      // Create customer
      const { data: customer, error: cErr } = await supabase
        .from("customers")
        .insert({
          contact_name: parse.data.contact_name,
          organisation: parse.data.organisation ?? null,
          email: parse.data.email,
          phone: parse.data.phone ?? null,
        })
        .select("id")
        .single();
      if (cErr) throw cErr;

      // Create booking
      const noteParts: string[] = [];
      if (form.soundSystem) noteParts.push("Sound system required");
      if (form.avScreens) noteParts.push("AV screens required");
      if (form.theatreLighting) noteParts.push("Theatre lighting required");
      if (form.notes.trim()) noteParts.push(form.notes.trim());

      const { data: booking, error: bErr } = await supabase
        .from("bookings")
        .insert({
          customer_id: customer.id,
          event_name: parse.data.event_name,
          event_date: parse.data.event_date,
          bump_in_time: parse.data.bump_in,
          bump_out_time: parse.data.bump_out,
          estimated_attendance: parse.data.attendance ?? null,
          food_served: form.foodServed,
          sound_system: form.soundSystem,
          av_screens: form.avScreens,
          theatre_lighting: form.theatreLighting,
          seating_changes: form.seatingChanges,
          remove_drums: form.removeDrums,
          kitchen: form.kitchen,
          extra_staff_count: form.extraStaffCount,
          notes: noteParts.join("\n") || null,
          hours: quote.hours,
          room_subtotal: quote.roomSubtotal,
          extras_subtotal: quote.extrasSubtotal,
          cleaning_subtotal: quote.cleaningSubtotal,
          staff_subtotal: quote.staffSubtotal,
          bond: quote.bond,
          subtotal_ex_bond: quote.subtotalExBond,
          deposit_amount: quote.depositAmount,
          total_amount: quote.totalAmount,
          status: "enquiry",
        })
        .select("id, reference")
        .single();
      if (bErr) throw bErr;

      // Booking rooms
      const bookingRoomsRows = nonKitchenRooms
        .filter((r) => form.selectedRoomIds.includes(r.id))
        .map((r) => {
          const chargeHours = Math.max(quote.hours, r.min_hours);
          return {
            booking_id: booking.id,
            room_id: r.id,
            hours: chargeHours,
            line_total: chargeHours * r.hourly_rate,
          };
        });
      if (form.kitchen && kitchenRoom) {
        bookingRoomsRows.push({
          booking_id: booking.id,
          room_id: kitchenRoom.id,
          hours: 0,
          line_total: 250,
        });
      }
      if (bookingRoomsRows.length) {
        const { error } = await supabase.from("booking_rooms").insert(bookingRoomsRows);
        if (error) throw error;
      }

      setSubmitted({ ref: booking.reference });
      window.scrollTo({ top: 0, behavior: "smooth" });
    } catch (err) {
      console.error(err);
      toast.error("Could not submit enquiry. Please try again or email hire@dreambuilders.church");
    } finally {
      setSubmitting(false);
    }
  }

  if (submitted) {
    return (
      <div className="min-h-screen bg-background">
        <SiteHeader />
        <div className="mx-auto max-w-2xl px-4 py-16 sm:px-6">
          <div className="rounded-2xl border border-border bg-card p-8 text-center shadow-soft">
            <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-accent">
              <CheckCircle2 className="h-7 w-7 text-brand" />
            </div>
            <h1 className="mt-5 font-display text-2xl font-semibold sm:text-3xl">Enquiry received</h1>
            <p className="mt-3 text-muted-foreground">
              Thank you — your booking enquiry <span className="font-semibold text-foreground">{submitted.ref}</span>{" "}
              has been sent to our hire coordinator. We'll be in touch to confirm staff availability and next steps.
            </p>
            <div className="mt-6 rounded-lg border border-brand/30 bg-brand/5 p-4 text-left">
              <div className="font-display text-base font-semibold">Create an account to manage this booking</div>
              <p className="mt-1 text-sm text-muted-foreground">
                Sign up with the same email ({form.email}) to upload your public liability insurance,
                Streatrader approval and advertising material — and to sign your hire contract online.
              </p>
              <Button
                asChild
                className="mt-3"
                size="sm"
              >
                <Link to="/auth" search={{ mode: "signup", email: form.email, next: "/account" }}>
                  Create my account
                </Link>
              </Button>
            </div>
            <p className="mt-4 text-sm text-muted-foreground">
              The figures shown are a baseline estimate; final pricing is confirmed once your event
              details and staffing are reviewed.
            </p>
            <div className="mt-6 flex justify-center gap-3">
              <Button asChild variant="secondary">
                <Link to="/">Back to home</Link>
              </Button>
              <Button onClick={() => { setSubmitted(null); navigate({ to: "/quote" }); }}>
                Start another quote
              </Button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <SiteHeader />
      <div className="mx-auto max-w-6xl px-4 py-10 sm:px-6 lg:py-14">
        <Link
          to="/"
          className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground"
        >
          <ChevronLeft className="h-4 w-4" /> Back
        </Link>
        <div className="mt-4">
          <h1 className="font-display text-3xl font-semibold sm:text-4xl">Get a hire quote</h1>
          <p className="mt-2 max-w-2xl text-muted-foreground">
            Configure your event on the left and see your baseline quote on the right. Submit when
            you're happy — no obligation.
          </p>
        </div>

        <div className="mt-8 grid gap-8 lg:grid-cols-[minmax(0,1fr)_380px]">
          {/* FORM */}
          <div className="space-y-6">
            <Section title="Event details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Event name" required>
                  <Input
                    value={form.event_name}
                    onChange={(e) => setForm({ ...form, event_name: e.target.value })}
                    placeholder="e.g. Community concert"
                  />
                </Field>
                <Field label="Event date" required>
                  <Input
                    type="date"
                    value={form.event_date}
                    onChange={(e) => setForm({ ...form, event_date: e.target.value })}
                  />
                </Field>
                <Field label="Bump in time" required>
                  <Input
                    type="time"
                    value={form.bump_in}
                    onChange={(e) => setForm({ ...form, bump_in: e.target.value })}
                  />
                </Field>
                <Field label="Bump out time" required>
                  <Input
                    type="time"
                    value={form.bump_out}
                    onChange={(e) => setForm({ ...form, bump_out: e.target.value })}
                  />
                </Field>
                <Field label="Estimated attendance">
                  <Input
                    type="number"
                    inputMode="numeric"
                    min={0}
                    value={form.attendance}
                    onChange={(e) => setForm({ ...form, attendance: e.target.value })}
                    placeholder="e.g. 80"
                  />
                </Field>
                <Field label="Total hire hours">
                  <div className="flex h-10 items-center rounded-md border border-input bg-muted px-3 text-sm text-muted-foreground">
                    {quote.hours ? `${quote.hours} hours` : "—"}
                  </div>
                </Field>
              </div>
            </Section>

            <Section title="Rooms" description="Select every space you need. Minimum 4-hour booking.">
              {roomsQuery.isLoading ? (
                <div className="flex items-center gap-2 text-muted-foreground">
                  <Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…
                </div>
              ) : (
                <div className="grid gap-3 sm:grid-cols-2">
                  {nonKitchenRooms.map((r) => {
                    const selected = form.selectedRoomIds.includes(r.id);
                    return (
                      <button
                        type="button"
                        key={r.id}
                        onClick={() => toggleRoom(r.id)}
                        className={`text-left rounded-xl border p-4 transition ${
                          selected
                            ? "border-primary bg-primary/5 shadow-soft"
                            : "border-border bg-card hover:border-primary/40"
                        }`}
                      >
                        <div className="flex items-start justify-between gap-2">
                          <div>
                            <div className="font-semibold">{r.name}</div>
                            <div className="text-xs text-muted-foreground">
                              ${r.hourly_rate}/hr · min {r.min_hours}h · bond ${r.bond}
                            </div>
                          </div>
                          <Checkbox checked={selected} onCheckedChange={() => toggleRoom(r.id)} />
                        </div>
                      </button>
                    );
                  })}
                </div>
              )}
              <div className="mt-4 flex items-start gap-3 rounded-lg border border-dashed border-border p-3">
                <Checkbox
                  id="kitchen"
                  checked={form.kitchen}
                  onCheckedChange={(v) => setForm({ ...form, kitchen: !!v })}
                />
                <div>
                  <Label htmlFor="kitchen" className="font-medium">
                    Kitchen (+$250 flat fee)
                  </Label>
                  <p className="text-xs text-muted-foreground">
                    Only chargeable when hired alongside another room.
                  </p>
                </div>
              </div>
            </Section>

            <Section title="Extras & requirements">
              <div className="grid gap-3 sm:grid-cols-2">
                {[
                  ["foodServed", "Food will be served (adds cleaning fee)"],
                  ["soundSystem", "Sound system needed"],
                  ["avScreens", "AV screens needed"],
                  ["theatreLighting", "Theatre lighting needed"],
                  ["seatingChanges", "Extra / changed seating (+$200)"],
                  ["removeDrums", "Remove drums from stage (+$200)"],
                ].map(([key, label]) => (
                  <label
                    key={key}
                    className="flex items-start gap-3 rounded-lg border border-border bg-card p-3 hover:border-primary/30"
                  >
                    <Checkbox
                      checked={form[key as keyof typeof form] as boolean}
                      onCheckedChange={(v) => setForm({ ...form, [key]: !!v })}
                    />
                    <span className="text-sm">{label}</span>
                  </label>
                ))}
              </div>
              <div className="mt-4">
                <Field label="Extra Dreambuilders crew required">
                  <Input
                    type="number"
                    min={0}
                    max={20}
                    value={form.extraStaffCount}
                    onChange={(e) =>
                      setForm({ ...form, extraStaffCount: Math.max(0, Number(e.target.value) || 0) })
                    }
                  />
                  <p className="mt-1 text-xs text-muted-foreground">
                    $80/hr per person, minimum 4 hours each.
                  </p>
                </Field>
              </div>
            </Section>

            <Section title="Your details">
              <div className="grid gap-4 sm:grid-cols-2">
                <Field label="Contact name" required>
                  <Input
                    value={form.contact_name}
                    onChange={(e) => setForm({ ...form, contact_name: e.target.value })}
                  />
                </Field>
                <Field label="Organisation">
                  <Input
                    value={form.organisation}
                    onChange={(e) => setForm({ ...form, organisation: e.target.value })}
                  />
                </Field>
                <Field label="Email" required>
                  <Input
                    type="email"
                    value={form.email}
                    onChange={(e) => setForm({ ...form, email: e.target.value })}
                  />
                </Field>
                <Field label="Phone">
                  <Input
                    value={form.phone}
                    onChange={(e) => setForm({ ...form, phone: e.target.value })}
                  />
                </Field>
                <Field label="Anything else we should know?" className="sm:col-span-2">
                  <Textarea
                    rows={3}
                    value={form.notes}
                    onChange={(e) => setForm({ ...form, notes: e.target.value })}
                    placeholder="Tell us about the event, layout preferences, or any special requests."
                  />
                </Field>
              </div>
            </Section>
          </div>

          {/* QUOTE SUMMARY */}
          <div className="lg:sticky lg:top-24 lg:h-fit">
            <Card className="shadow-elevated">
              <CardContent className="p-6">
                <h2 className="font-display text-xl font-semibold">Your quote</h2>
                <p className="text-xs text-muted-foreground">Baseline estimate — pending approval</p>

                <div className="mt-5 space-y-4 text-sm">
                  <SummaryBlock title="Room hire" total={quote.roomSubtotal} lines={quote.roomLines} />
                  <SummaryBlock title="Extras" total={quote.extrasSubtotal} lines={quote.extrasLines} />
                  <SummaryBlock title="Cleaning" total={quote.cleaningSubtotal} lines={quote.cleaningLines} />
                  <SummaryBlock title="Staff" total={quote.staffSubtotal} lines={quote.staffLines} />

                  <Separator />
                  <Row label="Subtotal (ex bond)" value={money(quote.subtotalExBond)} bold />
                  <Row label="Bond (refundable)" value={money(quote.bond)} />
                  <Row label="20% deposit" value={money(quote.depositAmount)} muted />
                  <Separator />
                  <div className="flex items-baseline justify-between">
                    <span className="font-display text-lg font-semibold">Total</span>
                    <span className="font-display text-2xl font-semibold text-primary">
                      {money(quote.totalAmount)}
                    </span>
                  </div>
                </div>

                <Button
                  className="mt-6 w-full"
                  size="lg"
                  disabled={!canSubmit || submitting}
                  onClick={submit}
                >
                  {submitting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Submitting…
                    </>
                  ) : (
                    "Submit booking enquiry"
                  )}
                </Button>

                <p className="mt-3 text-[11px] leading-relaxed text-muted-foreground">
                  This is a baseline estimate only. Final pricing is confirmed by our hire coordinator
                  once staffing and event details are reviewed. Prices include GST. A 20% deposit is
                  required within 7 days of invoice to secure your booking.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
}

function Section({
  title,
  description,
  children,
}: {
  title: string;
  description?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="rounded-2xl border border-border bg-card p-5 shadow-soft sm:p-6">
      <h2 className="font-display text-lg font-semibold">{title}</h2>
      {description && <p className="mt-1 text-sm text-muted-foreground">{description}</p>}
      <div className="mt-4">{children}</div>
    </section>
  );
}

function Field({
  label,
  required,
  children,
  className,
}: {
  label: string;
  required?: boolean;
  children: React.ReactNode;
  className?: string;
}) {
  return (
    <div className={className}>
      <Label className="mb-1.5 block text-sm">
        {label} {required && <span className="text-destructive">*</span>}
      </Label>
      {children}
    </div>
  );
}

function Row({
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
    <div
      className={`flex items-baseline justify-between ${bold ? "font-semibold" : ""} ${
        muted ? "text-muted-foreground" : ""
      }`}
    >
      <span>{label}</span>
      <span>{value}</span>
    </div>
  );
}

function SummaryBlock({
  title,
  total,
  lines,
}: {
  title: string;
  total: number;
  lines: { label: string; amount: number; detail?: string }[];
}) {
  if (lines.length === 0) {
    return (
      <div className="flex items-baseline justify-between text-muted-foreground">
        <span>{title}</span>
        <span>—</span>
      </div>
    );
  }
  return (
    <div>
      <div className="flex items-baseline justify-between font-medium">
        <span>{title}</span>
        <span>{money(total)}</span>
      </div>
      <ul className="mt-1 space-y-0.5 text-xs text-muted-foreground">
        {lines.map((l, i) => (
          <li key={i} className="flex items-baseline justify-between gap-3">
            <span>
              {l.label}
              {l.detail && <span className="opacity-70"> · {l.detail}</span>}
            </span>
            <span>{money(l.amount)}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
