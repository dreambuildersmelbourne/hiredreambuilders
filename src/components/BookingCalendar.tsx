import { useMemo, useState } from "react";
import {
  addDays,
  addMonths,
  addWeeks,
  eachDayOfInterval,
  endOfMonth,
  endOfWeek,
  format,
  isSameDay,
  isSameMonth,
  isToday,
  startOfMonth,
  startOfWeek,
  parseISO,
} from "date-fns";
import { ChevronLeft, ChevronRight, CalendarDays } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import {
  CALENDAR_STATUS_META,
  calendarEventTitle,
  calendarStatusFor,
  type CalendarStatus,
} from "@/lib/calendar-status";

export type CalendarBooking = {
  id: string;
  reference: string;
  event_name: string;
  event_date: string; // yyyy-mm-dd
  bump_in_time: string;
  bump_out_time: string;
  status: string;
  tentative_hold_requested?: boolean | null;
  staff_can_view_tentative?: boolean | null;
  estimated_attendance?: number | null;
  customers?: { contact_name?: string | null; organisation?: string | null } | null;
  booking_rooms?: Array<{ rooms?: { name?: string | null } | null }> | null;
};

type View = "month" | "week" | "day" | "list";

function bookingDate(b: CalendarBooking) {
  return parseISO(b.event_date);
}

function roomsFor(b: CalendarBooking) {
  return (b.booking_rooms ?? [])
    .map((r) => r.rooms?.name)
    .filter(Boolean)
    .join(", ");
}

export function BookingCalendar({
  bookings,
  onEventClick,
  hiddenStatuses,
}: {
  bookings: CalendarBooking[];
  onEventClick: (b: CalendarBooking) => void;
  hiddenStatuses?: CalendarStatus[];
}) {
  const [view, setView] = useState<View>("month");
  const [cursor, setCursor] = useState<Date>(new Date());

  const visible = useMemo(() => {
    if (!hiddenStatuses?.length) return bookings;
    const hide = new Set(hiddenStatuses);
    return bookings.filter(
      (b) => !hide.has(calendarStatusFor(b.status, b.tentative_hold_requested)),
    );
  }, [bookings, hiddenStatuses]);

  const range = useMemo(() => {
    if (view === "month") {
      const s = startOfWeek(startOfMonth(cursor), { weekStartsOn: 1 });
      const e = endOfWeek(endOfMonth(cursor), { weekStartsOn: 1 });
      return { start: s, end: e };
    }
    if (view === "week") {
      const s = startOfWeek(cursor, { weekStartsOn: 1 });
      return { start: s, end: endOfWeek(cursor, { weekStartsOn: 1 }) };
    }
    if (view === "day") return { start: cursor, end: cursor };
    // list: upcoming 60 days
    return { start: cursor, end: addDays(cursor, 60) };
  }, [view, cursor]);

  const days = useMemo(
    () => eachDayOfInterval({ start: range.start, end: range.end }),
    [range],
  );

  const eventsByDate = useMemo(() => {
    const map = new Map<string, CalendarBooking[]>();
    for (const b of visible) {
      const key = b.event_date;
      const arr = map.get(key) ?? [];
      arr.push(b);
      map.set(key, arr);
    }
    return map;
  }, [visible]);

  function shift(dir: -1 | 1) {
    if (view === "month") setCursor((c) => addMonths(c, dir));
    else if (view === "week") setCursor((c) => addWeeks(c, dir));
    else if (view === "day") setCursor((c) => addDays(c, dir));
    else setCursor((c) => addDays(c, dir * 30));
  }

  const title =
    view === "month"
      ? format(cursor, "MMMM yyyy")
      : view === "week"
        ? `Week of ${format(startOfWeek(cursor, { weekStartsOn: 1 }), "d MMM")}`
        : view === "day"
          ? format(cursor, "EEEE d MMM yyyy")
          : "Upcoming bookings";

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex items-center gap-2">
          <Button size="icon" variant="outline" onClick={() => shift(-1)} aria-label="Previous">
            <ChevronLeft className="h-4 w-4" />
          </Button>
          <Button size="sm" variant="outline" onClick={() => setCursor(new Date())}>
            Today
          </Button>
          <Button size="icon" variant="outline" onClick={() => shift(1)} aria-label="Next">
            <ChevronRight className="h-4 w-4" />
          </Button>
          <div className="ml-2 font-display text-lg font-semibold">{title}</div>
        </div>
        <div className="inline-flex overflow-hidden rounded-md border border-border">
          {(["month", "week", "day", "list"] as View[]).map((v) => (
            <button
              key={v}
              onClick={() => setView(v)}
              className={`px-3 py-1.5 text-sm capitalize transition ${
                view === v
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {v}
            </button>
          ))}
        </div>
      </div>

      {/* Legend */}
      <div className="flex flex-wrap gap-2 text-xs">
        {(Object.keys(CALENDAR_STATUS_META) as CalendarStatus[]).map((k) => {
          const m = CALENDAR_STATUS_META[k];
          return (
            <span key={k} className="inline-flex items-center gap-1.5 rounded-full border border-border bg-card px-2.5 py-1">
              <span className={`h-2.5 w-2.5 rounded-full ${m.dot}`} />
              {m.label}
            </span>
          );
        })}
      </div>

      {view === "month" && (
        <MonthView cursor={cursor} days={days} eventsByDate={eventsByDate} onEventClick={onEventClick} />
      )}
      {view === "week" && (
        <WeekOrDayView days={days} eventsByDate={eventsByDate} onEventClick={onEventClick} />
      )}
      {view === "day" && (
        <WeekOrDayView days={days} eventsByDate={eventsByDate} onEventClick={onEventClick} />
      )}
      {view === "list" && (
        <ListView bookings={visible} onEventClick={onEventClick} from={range.start} to={range.end} />
      )}
    </div>
  );
}

function MonthView({
  cursor,
  days,
  eventsByDate,
  onEventClick,
}: {
  cursor: Date;
  days: Date[];
  eventsByDate: Map<string, CalendarBooking[]>;
  onEventClick: (b: CalendarBooking) => void;
}) {
  const weekdays = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  return (
    <div className="overflow-hidden rounded-lg border border-border bg-card">
      <div className="grid grid-cols-7 border-b border-border bg-muted/50 text-xs font-medium uppercase tracking-wider text-muted-foreground">
        {weekdays.map((d) => (
          <div key={d} className="p-2 text-center">
            {d}
          </div>
        ))}
      </div>
      <div className="grid grid-cols-7">
        {days.map((day) => {
          const key = format(day, "yyyy-MM-dd");
          const events = eventsByDate.get(key) ?? [];
          const outside = !isSameMonth(day, cursor);
          return (
            <div
              key={key}
              className={`min-h-[110px] border-b border-r border-border p-1.5 text-xs ${
                outside ? "bg-muted/30 text-muted-foreground" : "bg-background"
              }`}
            >
              <div className={`mb-1 flex justify-between ${isToday(day) ? "font-bold text-primary" : ""}`}>
                <span>{format(day, "d")}</span>
                {events.length > 2 && (
                  <span className="rounded-full bg-muted px-1.5 text-[10px]">
                    {events.length}
                  </span>
                )}
              </div>
              <div className="space-y-1">
                {events.slice(0, 3).map((b) => {
                  const status = calendarStatusFor(b.status, b.tentative_hold_requested);
                  const m = CALENDAR_STATUS_META[status];
                  return (
                    <button
                      key={b.id}
                      onClick={() => onEventClick(b)}
                      className={`w-full truncate rounded border px-1.5 py-1 text-left text-[11px] leading-tight transition hover:opacity-80 ${m.className}`}
                      title={calendarEventTitle(status, b.event_name, roomsFor(b))}
                    >
                      <span className="font-medium">{b.bump_in_time?.slice(0, 5)}</span>{" "}
                      <span className="truncate">{b.event_name}</span>
                    </button>
                  );
                })}
                {events.length > 3 && (
                  <div className="text-[10px] text-muted-foreground">+{events.length - 3} more</div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function WeekOrDayView({
  days,
  eventsByDate,
  onEventClick,
}: {
  days: Date[];
  eventsByDate: Map<string, CalendarBooking[]>;
  onEventClick: (b: CalendarBooking) => void;
}) {
  return (
    <div className={`grid gap-3 ${days.length > 1 ? "md:grid-cols-7" : "md:grid-cols-1"}`}>
      {days.map((day) => {
        const key = format(day, "yyyy-MM-dd");
        const events = (eventsByDate.get(key) ?? []).sort((a, b) =>
          a.bump_in_time.localeCompare(b.bump_in_time),
        );
        return (
          <div key={key} className="rounded-lg border border-border bg-card">
            <div className={`border-b border-border px-3 py-2 text-sm font-medium ${isToday(day) ? "text-primary" : ""}`}>
              {format(day, "EEE d MMM")}
            </div>
            <div className="space-y-2 p-2 min-h-[80px]">
              {events.length === 0 ? (
                <div className="p-2 text-xs text-muted-foreground">—</div>
              ) : (
                events.map((b) => {
                  const status = calendarStatusFor(b.status, b.tentative_hold_requested);
                  const m = CALENDAR_STATUS_META[status];
                  const rooms = roomsFor(b);
                  return (
                    <button
                      key={b.id}
                      onClick={() => onEventClick(b)}
                      className={`w-full rounded border-l-4 p-2 text-left text-xs transition hover:brightness-95 ${m.bar}`}
                    >
                      <div className="flex items-center justify-between gap-2">
                        <span className="font-semibold">
                          {b.bump_in_time?.slice(0, 5)}–{b.bump_out_time?.slice(0, 5)}
                        </span>
                        <Badge variant="outline" className={m.className}>
                          {m.short}
                        </Badge>
                      </div>
                      <div className="mt-1 font-medium">{b.event_name}</div>
                      {rooms && <div className="text-[11px] text-muted-foreground">{rooms}</div>}
                      {b.customers?.contact_name && (
                        <div className="text-[11px] text-muted-foreground">{b.customers.contact_name}</div>
                      )}
                    </button>
                  );
                })
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}

function ListView({
  bookings,
  onEventClick,
  from,
  to,
}: {
  bookings: CalendarBooking[];
  onEventClick: (b: CalendarBooking) => void;
  from: Date;
  to: Date;
}) {
  const items = bookings
    .filter((b) => {
      const d = bookingDate(b);
      return d >= from && d <= to;
    })
    .sort((a, b) => a.event_date.localeCompare(b.event_date) || a.bump_in_time.localeCompare(b.bump_in_time));

  if (items.length === 0) {
    return (
      <Card>
        <CardContent className="flex flex-col items-center justify-center py-12 text-center text-muted-foreground">
          <CalendarDays className="mb-2 h-6 w-6" />
          No bookings in this range.
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="divide-y divide-border overflow-hidden rounded-lg border border-border bg-card">
      {items.map((b) => {
        const status = calendarStatusFor(b.status, b.tentative_hold_requested);
        const m = CALENDAR_STATUS_META[status];
        const rooms = roomsFor(b);
        return (
          <button
            key={b.id}
            onClick={() => onEventClick(b)}
            className="flex w-full flex-wrap items-center justify-between gap-3 p-4 text-left transition hover:bg-muted/40"
          >
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-2">
                <Badge variant="outline" className={m.className}>
                  {m.short}
                </Badge>
                <span className="font-semibold">{b.event_name}</span>
                {rooms && <span className="text-sm text-muted-foreground">— {rooms}</span>}
              </div>
              <div className="mt-1 text-xs text-muted-foreground">
                {format(bookingDate(b), "EEE d MMM yyyy")} · {b.bump_in_time?.slice(0, 5)}–
                {b.bump_out_time?.slice(0, 5)}
                {b.customers?.contact_name ? ` · ${b.customers.contact_name}` : ""}
                {b.customers?.organisation ? ` (${b.customers.organisation})` : ""}
                {typeof b.estimated_attendance === "number" ? ` · ${b.estimated_attendance} guests` : ""}
              </div>
            </div>
            <div className="text-xs text-muted-foreground">{b.reference}</div>
          </button>
        );
      })}
    </div>
  );
}
