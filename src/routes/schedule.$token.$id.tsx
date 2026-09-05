import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { format } from "date-fns";
import { ArrowLeft, CalendarClock, CheckCircle2, Circle, Loader2, MapPin, Printer } from "lucide-react";

import { getRunSheet } from "@/lib/schedule.functions";
import { statusMeta } from "@/lib/booking-meta";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";

export const Route = createFileRoute("/schedule/$token/$id")({
  head: () => ({
    meta: [
      { title: "Hire run sheet" },
      { name: "robots", content: "noindex, nofollow" },
      { name: "description", content: "Private run sheet for a confirmed venue hire." },
      { property: "og:title", content: "Hire run sheet" },
      { property: "og:description", content: "Private run sheet for a confirmed venue hire." },
      { property: "og:type", content: "article" },
      { name: "twitter:card", content: "summary" },
    ],
  }),
  component: RunSheet,
});

function RunSheet() {
  const { token, id } = Route.useParams();
  const fetchSheet = useServerFn(getRunSheet);

  const { data, isLoading, isError } = useQuery({
    queryKey: ["schedule", token, id],
    queryFn: () => fetchSheet({ data: { token, id } }),
    retry: false,
  });

  if (isLoading) {
    return (
      <div className="mx-auto flex max-w-3xl items-center gap-2 px-4 py-16 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading run sheet…
      </div>
    );
  }

  if (isError || !data) {
    return (
      <div className="mx-auto max-w-3xl px-4 py-16">
        <h1 className="font-display text-2xl font-semibold">Run sheet not available</h1>
        <p className="mt-2 text-sm text-muted-foreground">
          This link is out of date, or the hire is no longer approved.
        </p>
      </div>
    );
  }

  const { booking, contact, rooms, extras, crew, assignments, checklist } = data;
  const s = statusMeta(booking.status);

  const requirements = [
    booking.food_served && "Food served",
    booking.sound_system && "Sound system",
    booking.av_screens && "AV screens",
    booking.theatre_lighting && "Theatre lighting",
    booking.seating_changes && "Seating changes",
    booking.remove_drums && "Remove drums",
    booking.kitchen && "Kitchen",
    booking.security_required && "Security required",
  ].filter(Boolean) as string[];

  const categories = Array.from(new Set(checklist.map((c) => c.category)));

  return (
    <div className="mx-auto max-w-3xl space-y-6 px-4 py-10 print:py-0">
      <div className="flex items-center justify-between print:hidden">
        <Button asChild variant="ghost" size="sm">
          <Link to="/schedule/$token" params={{ token }}>
            <ArrowLeft className="mr-1.5 h-4 w-4" /> All hires
          </Link>
        </Button>
        <Button variant="outline" size="sm" onClick={() => window.print()}>
          <Printer className="mr-1.5 h-4 w-4" /> Print
        </Button>
      </div>

      <header>
        <div className="flex flex-wrap items-center gap-2">
          <h1 className="font-display text-3xl font-semibold">{booking.event_name}</h1>
          <Badge variant="outline" className={s.className}>
            {s.label}
          </Badge>
        </div>
        <div className="mt-1 text-xs text-muted-foreground">{booking.reference}</div>
        <div className="mt-3 flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-muted-foreground">
          <span className="flex items-center gap-1.5">
            <CalendarClock className="h-4 w-4" />
            {format(new Date(booking.event_date), "EEEE d MMMM yyyy")} ·{" "}
            {booking.bump_in_time?.slice(0, 5)}–{booking.bump_out_time?.slice(0, 5)} ({booking.hours}h)
          </span>
          {booking.estimated_attendance ? <span>{booking.estimated_attendance} guests</span> : null}
        </div>
      </header>

      <Section title="Contact">
        <dl className="grid gap-2 text-sm sm:grid-cols-2">
          <Field label="Name" value={contact.contact_name} />
          <Field label="Organisation" value={contact.organisation} />
          <Field label="Email" value={contact.email} />
          <Field label="Phone" value={contact.phone} />
        </dl>
      </Section>

      <Section title="Spaces">
        {rooms.length === 0 ? (
          <p className="text-sm text-muted-foreground">No rooms recorded.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {rooms.map((r, i) => (
              <li key={i} className="flex items-center gap-2">
                <MapPin className="h-4 w-4 text-muted-foreground" />
                {r.name} <span className="text-muted-foreground">· {r.hours}h</span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      {requirements.length > 0 && (
        <Section title="Requirements">
          <div className="flex flex-wrap gap-2">
            {requirements.map((r) => (
              <Badge key={r} variant="outline">
                {r}
              </Badge>
            ))}
          </div>
        </Section>
      )}

      {extras.length > 0 && (
        <Section title="Extras">
          <ul className="space-y-1.5 text-sm">
            {extras.map((e, i) => (
              <li key={i}>
                {e.name}
                {e.quantity > 1 ? ` × ${e.quantity}` : ""}
              </li>
            ))}
          </ul>
        </Section>
      )}

      <Section title="Crew">
        {crew.length === 0 ? (
          <p className="text-sm text-muted-foreground">No crew recorded.</p>
        ) : (
          <ul className="space-y-1.5 text-sm">
            {crew.map((c, i) => (
              <li key={i}>
                {c.count} × {c.name} <span className="text-muted-foreground">· {c.hours}h</span>
              </li>
            ))}
          </ul>
        )}
        {assignments.length > 0 && (
          <ul className="mt-3 space-y-1.5 border-t border-border pt-3 text-sm">
            {assignments.map((a) => (
              <li key={a.id}>
                {a.role ?? "Crew"}: {a.name ?? "Unassigned"}{" "}
                <span className="text-muted-foreground">
                  {a.confirmed ? "· confirmed" : "· not confirmed"}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Section>

      <Section title="Event day checklist">
        {checklist.length === 0 ? (
          <p className="text-sm text-muted-foreground">No checklist generated yet.</p>
        ) : (
          <div className="space-y-4">
            {categories.map((cat) => (
              <div key={cat}>
                <h3 className="mb-2 text-xs font-medium uppercase tracking-widest text-muted-foreground">
                  {cat}
                </h3>
                <ul className="space-y-1.5 text-sm">
                  {checklist
                    .filter((c) => c.category === cat)
                    .map((c) => (
                      <li key={c.id} className="flex items-start gap-2">
                        {c.completed ? (
                          <CheckCircle2 className="mt-0.5 h-4 w-4 text-emerald-600" />
                        ) : (
                          <Circle className="mt-0.5 h-4 w-4 text-muted-foreground" />
                        )}
                        <span className={c.completed ? "text-muted-foreground line-through" : ""}>
                          {c.item}
                          {c.role ? <span className="text-muted-foreground"> · {c.role}</span> : null}
                          {c.note ? (
                            <span className="block text-xs text-muted-foreground">{c.note}</span>
                          ) : null}
                        </span>
                      </li>
                    ))}
                </ul>
              </div>
            ))}
          </div>
        )}
      </Section>

      {booking.notes ? (
        <Section title="Customer notes">
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">{booking.notes}</p>
        </Section>
      ) : null}
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-6">
        <h2 className="font-display text-lg font-semibold">{title}</h2>
        {children}
      </CardContent>
    </Card>
  );
}

function Field({ label, value }: { label: string; value: string | null }) {
  return (
    <div>
      <dt className="text-xs uppercase tracking-wider text-muted-foreground">{label}</dt>
      <dd>{value || "—"}</dd>
    </div>
  );
}
