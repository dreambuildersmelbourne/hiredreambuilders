import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock, Inbox, Loader2 } from "lucide-react";
import { useState } from "react";

import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/pricing";
import { statusMeta } from "@/lib/booking-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/admin/")({
  component: AdminEnquiries,
});


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

  const [filter, setFilter] = useState<"all" | "new" | "pending" | "approved">("all");

  const bookings = data ?? [];
  const filtered =
    filter === "all"
      ? bookings
      : filter === "new"
      ? bookings.filter((b) => b.status === "enquiry")
      : filter === "pending"
      ? bookings.filter((b) => ["reviewing", "info_requested", "staffing_confirmed", "invoiced"].includes(b.status))
      : bookings.filter((b) => ["approved", "deposit_paid", "confirmed"].includes(b.status));

  const grouped = {
    active: filtered.filter((b) => !["completed", "cancelled"].includes(b.status)),
    archive: filtered.filter((b) => ["completed", "cancelled"].includes(b.status)),
  };

  const FILTERS: { key: "all" | "new" | "pending" | "approved"; label: string; className: string }[] = [
    { key: "all", label: "All", className: "bg-muted text-muted-foreground border-border" },
    { key: "new", label: "New", className: statusMeta("enquiry").className },
    { key: "pending", label: "Pending", className: statusMeta("reviewing").className },
    { key: "approved", label: "Approved", className: statusMeta("approved").className },
  ];

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

      <div className="flex flex-wrap gap-2">
        {FILTERS.map((f) => {
          const active = filter === f.key;
          return (
            <Button
              key={f.key}
              type="button"
              variant="outline"
              size="sm"
              onClick={() => setFilter(f.key)}
              className={`rounded-full border px-4 transition ${active ? "ring-2 ring-ring ring-offset-2" : ""}`}
            >
              <span className={`mr-2 inline-block h-2 w-2 rounded-full ${f.className.split(" ")[0]}`} />
              {f.label}
              <span className="ml-2 text-xs text-muted-foreground">
                {f.key === "all"
                  ? bookings.length
                  : f.key === "new"
                  ? bookings.filter((b) => b.status === "enquiry").length
                  : f.key === "pending"
                  ? bookings.filter((b) => ["reviewing", "info_requested", "staffing_confirmed", "invoiced"].includes(b.status)).length
                  : bookings.filter((b) => ["approved", "deposit_paid", "confirmed"].includes(b.status)).length}
              </span>
            </Button>
          );
        })}
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
              When customers submit an estimate it will appear here.
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
