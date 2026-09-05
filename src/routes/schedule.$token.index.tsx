import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { CalendarClock, Copy, Loader2, MapPin } from "lucide-react";
import { toast } from "sonner";

import { listApprovedRunSheets } from "@/lib/schedule.functions";
import { statusMeta } from "@/lib/booking-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/schedule/$token/")({
  head: () => ({
    meta: [
      { title: "Confirmed hires — run sheets" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Private run sheet index for confirmed venue hires." },
      { property: "og:title", content: "Confirmed hires — run sheets" },
      { property: "og:description", content: "Private run sheet index for confirmed venue hires." },
      { property: "og:type", content: "website" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: ScheduleIndex,
});

function ScheduleIndex() {
  const { token } = Route.useParams();
  const list = useServerFn(listApprovedRunSheets);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["schedule", token],
    queryFn: () => list({ data: { token } }),
    retry: false,
  });

  const copy = async (url: string) => {
    try {
      await navigator.clipboard.writeText(url);
      toast.success("Link copied — paste it into the calendar event");
    } catch {
      toast.error("Could not copy the link");
    }
  };

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading hires…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-2xl font-semibold">Link not valid</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This private link is out of date. Generate a fresh one from Calendar sync.
        </p>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10">
      <header>
        <h1 className="font-display text-3xl font-semibold">Confirmed hires</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Private run sheets for approved and confirmed hires. Copy a link and paste it into the
          matching Google Calendar event description.
        </p>
      </header>

      {data.length === 0 ? (
        <Card>
          <CardContent className="py-14 text-center text-sm text-muted-foreground">
            No approved hires yet.
          </CardContent>
        </Card>
      ) : (
        <div className="grid gap-3">
          {data.map((b) => {
            const s = statusMeta(b.status);
            const url =
              typeof window === "undefined"
                ? ""
                : `${window.location.origin}/schedule/${token}/${b.id}`;
            return (
              <div
                key={b.id}
                className="rounded-xl border border-border bg-card p-5 shadow-soft transition hover:border-primary/30"
              >
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link
                        to="/schedule/$token/$id"
                        params={{ token, id: b.id }}
                        className="font-display text-lg font-semibold hover:text-primary"
                      >
                        {b.event_name}
                      </Link>
                      <Badge variant="outline" className={s.className}>
                        {s.label}
                      </Badge>
                    </div>
                    <div className="mt-1 text-xs text-muted-foreground">
                      {b.reference}
                      {b.contact_name ? ` · ${b.contact_name}` : ""}
                      {b.organisation ? ` (${b.organisation})` : ""}
                    </div>
                    <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
                      <span className="flex items-center gap-1.5">
                        <CalendarClock className="h-4 w-4" />
                        {format(new Date(b.event_date), "EEE d MMM yyyy")} ·{" "}
                        {b.bump_in_time?.slice(0, 5)}–{b.bump_out_time?.slice(0, 5)}
                      </span>
                      {b.rooms.length > 0 && (
                        <span className="flex items-center gap-1.5">
                          <MapPin className="h-4 w-4" />
                          {b.rooms.join(", ")}
                        </span>
                      )}
                    </div>
                  </div>
                  <Button variant="outline" size="sm" onClick={() => copy(url)}>
                    <Copy className="mr-1.5 h-4 w-4" /> Copy link
                  </Button>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
