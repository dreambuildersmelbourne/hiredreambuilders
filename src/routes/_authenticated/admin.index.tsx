import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock, Inbox, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/pricing";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminEnquiries,
});

const STATUS_META: Record<
  string,
  { label: string; className: string }
> = {
  enquiry: { label: "New enquiry", className: "bg-brand/15 text-brand border-brand/30" },
  reviewing: { label: "Reviewing", className: "bg-accent text-accent-foreground border-accent" },
  staffing_confirmed: { label: "Staffing confirmed", className: "bg-primary/10 text-primary border-primary/30" },
  invoiced: { label: "Invoiced", className: "bg-primary/10 text-primary border-primary/30" },
  deposit_paid: { label: "Deposit paid", className: "bg-green-100 text-green-800 border-green-300" },
  confirmed: { label: "Confirmed", className: "bg-green-100 text-green-800 border-green-300" },
  completed: { label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  cancelled: { label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/30" },
};

function AdminEnquiries() {
  const { data, isLoading } = useQuery({
    queryKey: ["admin", "bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select("id, reference, event_name, event_date, bump_in_time, bump_out_time, status, total_amount, estimated_attendance, created_at, customers(contact_name, organisation, email, phone)")
        .order("created_at", { ascending: false });
      if (error) throw error;
      return data;
    },
  });

  const bookings = data ?? [];
  const grouped = {
    active: bookings.filter((b) => !["completed", "cancelled"].includes(b.status)),
    archive: bookings.filter((b) => ["completed", "cancelled"].includes(b.status)),
  };

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="font-display text-3xl font-semibold">Booking enquiries</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Review incoming enquiries and track them through to confirmation.
          </p>
        </div>
        <div className="flex gap-3">
          <Stat label="Total" value={bookings.length} />
          <Stat label="New" value={bookings.filter((b) => b.status === "enquiry").length} highlight />
          <Stat label="Confirmed" value={bookings.filter((b) => b.status === "confirmed" || b.status === "deposit_paid").length} />
        </div>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading enquiries…
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">No enquiries yet</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              When customers submit a quote it will appear here.
            </p>
          </CardContent>
        </Card>
      ) : (
        <>
          <BookingsList title="Active" items={grouped.active} />
          {grouped.archive.length > 0 && (
            <BookingsList title="Completed & cancelled" items={grouped.archive} muted />
          )}
        </>
      )}
    </div>
  );
}

function Stat({ label, value, highlight }: { label: string; value: number; highlight?: boolean }) {
  return (
    <div
      className={`rounded-lg border px-4 py-2 ${
        highlight ? "border-brand/40 bg-brand/10" : "border-border bg-card"
      }`}
    >
      <div className="text-xs uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className={`font-display text-xl font-semibold ${highlight ? "text-brand" : ""}`}>{value}</div>
    </div>
  );
}

function BookingsList({
  title,
  items,
  muted,
}: {
  title: string;
  items: any[];
  muted?: boolean;
}) {
  if (items.length === 0) return null;
  return (
    <section>
      <h2 className={`mb-3 text-sm font-medium uppercase tracking-widest ${muted ? "text-muted-foreground" : ""}`}>
        {title}
      </h2>
      <div className="grid gap-3">
        {items.map((b) => {
          const s = STATUS_META[b.status] ?? { label: b.status, className: "" };
          return (
            <Link
              key={b.id}
              to="/admin/bookings/$id"
              params={{ id: b.id }}
              className="group rounded-xl border border-border bg-card p-5 shadow-soft transition hover:border-primary/30 hover:shadow-elevated"
            >
              <div className="flex flex-wrap items-start justify-between gap-4">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    <h3 className="truncate font-display text-lg font-semibold group-hover:text-primary">
                      {b.event_name}
                    </h3>
                    <Badge variant="outline" className={s.className}>
                      {s.label}
                    </Badge>
                  </div>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {b.reference} · {b.customers?.contact_name}
                    {b.customers?.organisation ? ` (${b.customers.organisation})` : ""} ·{" "}
                    {b.customers?.email}
                  </div>
                  <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                    <span className="flex items-center gap-1.5 text-muted-foreground">
                      <CalendarClock className="h-4 w-4" />
                      {format(new Date(b.event_date), "EEE d MMM yyyy")} · {b.bump_in_time?.slice(0, 5)}–
                      {b.bump_out_time?.slice(0, 5)}
                    </span>
                    {b.estimated_attendance ? (
                      <span className="text-muted-foreground">{b.estimated_attendance} guests</span>
                    ) : null}
                  </div>
                </div>
                <div className="text-right">
                  <div className="text-xs uppercase tracking-wider text-muted-foreground">Estimate</div>
                  <div className="font-display text-xl font-semibold text-primary">
                    {money(Number(b.total_amount))}
                  </div>
                </div>
              </div>
            </Link>
          );
        })}
      </div>
    </section>
  );
}
