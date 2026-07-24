import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarClock, Inbox, Loader2 } from "lucide-react";

import { supabase } from "@/integrations/supabase/client";
import { money } from "@/lib/pricing";
import { statusMeta } from "@/lib/booking-meta";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";

export const Route = createFileRoute("/_authenticated/account/")({
  head: () => ({ meta: [{ title: "My bookings — Dreambuilders Venue Hire" }] }),
  component: MyBookings,
});

function MyBookings() {
  const { data, isLoading } = useQuery({
    queryKey: ["account", "bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, reference, event_name, event_date, bump_in_time, bump_out_time, status, total_amount, created_at",
        )
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data;
    },
  });

  const bookings = data ?? [];

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">My bookings</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Track your enquiries, upload required documents and sign your hire contract.
        </p>
      </div>

      {isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading…
        </div>
      ) : bookings.length === 0 ? (
        <Card>
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-muted">
              <Inbox className="h-6 w-6 text-muted-foreground" />
            </div>
            <h3 className="mt-4 font-display text-lg font-semibold">No bookings yet</h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              If you already sent an enquiry using this email address, it will appear here shortly. Otherwise,
              start a new one.
            </p>
            <Button asChild className="mt-5">
              <Link to="/quote">Start an estimate</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {bookings.map((b) => {
            const s = statusMeta(b.status);
            return (
              <Link
                key={b.id}
                to="/account/bookings/$id"
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
                    <div className="mt-1 text-xs text-muted-foreground">{b.reference}</div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm">
                      <span className="flex items-center gap-1.5 text-muted-foreground">
                        <CalendarClock className="h-4 w-4" />
                        {format(new Date(b.event_date), "EEE d MMM yyyy")} ·{" "}
                        {b.bump_in_time?.slice(0, 5)}–{b.bump_out_time?.slice(0, 5)}
                      </span>
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
      )}
    </div>
  );
}
