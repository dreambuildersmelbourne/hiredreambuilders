import { createFileRoute } from "@tanstack/react-router";
import { calendarStatusFor } from "@/lib/calendar-status";

export const Route = createFileRoute("/api/public/calendar/$token/feed[.]ics")({
  server: {
    handlers: {
      GET: async ({ params }) => {
        const token = params.token;
        if (!token || token.length < 16) {
          return new Response("Not found", { status: 404 });
        }

        const { supabaseAdmin } = await import("@/integrations/supabase/client.server");

        const { data: settings, error: sErr } = await supabaseAdmin
          .from("calendar_sync_settings")
          .select("*")
          .eq("singleton", true)
          .maybeSingle();

        if (sErr || !settings || settings.feed_token !== token) {
          return new Response("Not found", { status: 404 });
        }

        const { data: bookings, error: bErr } = await supabaseAdmin
          .from("bookings")
          .select(
            "id, reference, event_name, event_date, bump_in_time, bump_out_time, status, tentative_hold_requested, estimated_attendance, notes, admin_notes, updated_at, created_at, customers(contact_name, organisation, email, phone), booking_rooms(rooms(name))",
          )
          .order("event_date", { ascending: true });

        if (bErr) {
          return new Response("Server error", { status: 500 });
        }

        const included = new Set<string>(settings.include_statuses ?? []);
        const filtered = (bookings ?? []).filter((b: any) => {
          const bucket = calendarStatusFor(b.status, b.tentative_hold_requested);
          if (bucket === "tentative" && !settings.include_tentative) return false;
          if (bucket === "cancelled" && !settings.include_cancelled) return false;
          return included.has(bucket);
        });

        const ics = buildIcs(filtered, settings);
        return new Response(ics, {
          status: 200,
          headers: {
            "Content-Type": "text/calendar; charset=utf-8",
            "Cache-Control": "no-cache, no-store, must-revalidate",
            "Content-Disposition": 'inline; filename="dreambuilders-hire.ics"',
          },
        });
      },
    },
  },
});

function pad(n: number) {
  return n < 10 ? `0${n}` : `${n}`;
}

// ICS wants YYYYMMDDTHHMMSS in floating local time (no Z) when combined with TZID,
// but for simplicity we emit UTC by combining local date + time as local, then
// converting via a fixed Australia/Melbourne offset would be inaccurate for DST.
// Safer: emit as floating date-time with TZID=Australia/Melbourne. We include the
// VTIMEZONE block below.
function fmtLocal(dateStr: string, timeStr: string) {
  // dateStr: YYYY-MM-DD, timeStr: HH:MM[:SS]
  const [y, m, d] = dateStr.split("-").map(Number);
  const [hh, mm] = timeStr.split(":").map(Number);
  return `${y}${pad(m)}${pad(d)}T${pad(hh)}${pad(mm)}00`;
}

function fmtUtc(iso: string) {
  const d = new Date(iso);
  return (
    `${d.getUTCFullYear()}${pad(d.getUTCMonth() + 1)}${pad(d.getUTCDate())}` +
    `T${pad(d.getUTCHours())}${pad(d.getUTCMinutes())}${pad(d.getUTCSeconds())}Z`
  );
}

function escapeText(s: string) {
  return s
    .replace(/\\/g, "\\\\")
    .replace(/\n/g, "\\n")
    .replace(/,/g, "\\,")
    .replace(/;/g, "\\;");
}

// Fold long lines to <75 octets per RFC 5545.
function fold(line: string) {
  if (line.length <= 74) return line;
  const parts: string[] = [];
  let i = 0;
  while (i < line.length) {
    parts.push((i === 0 ? "" : " ") + line.slice(i, i + 73));
    i += 73;
  }
  return parts.join("\r\n");
}

function buildIcs(bookings: any[], settings: any) {
  const lines: string[] = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Dreambuilders//Venue Hire//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:PUBLISH",
    "X-WR-CALNAME:Dreambuilders venue hire",
    "X-WR-TIMEZONE:Australia/Melbourne",
    // Minimal VTIMEZONE for Australia/Melbourne (AEST/AEDT).
    "BEGIN:VTIMEZONE",
    "TZID:Australia/Melbourne",
    "BEGIN:STANDARD",
    "DTSTART:19700405T030000",
    "TZOFFSETFROM:+1100",
    "TZOFFSETTO:+1000",
    "TZNAME:AEST",
    "RRULE:FREQ=YEARLY;BYMONTH=4;BYDAY=1SU",
    "END:STANDARD",
    "BEGIN:DAYLIGHT",
    "DTSTART:19701004T020000",
    "TZOFFSETFROM:+1000",
    "TZOFFSETTO:+1100",
    "TZNAME:AEDT",
    "RRULE:FREQ=YEARLY;BYMONTH=10;BYDAY=1SU",
    "END:DAYLIGHT",
    "END:VTIMEZONE",
  ];

  for (const b of bookings) {
    const bucket = calendarStatusFor(b.status, b.tentative_hold_requested);
    const rooms = (b.booking_rooms ?? [])
      .map((r: any) => r.rooms?.name)
      .filter(Boolean)
      .join(", ");
    const shortStatus =
      bucket === "confirmed"
        ? "CONFIRMED"
        : bucket === "tentative"
          ? "TENTATIVE"
          : bucket === "cancelled"
            ? "CANCELLED"
            : bucket === "completed"
              ? "COMPLETED"
              : bucket === "pending_approval"
                ? "PENDING"
                : "QUOTE";

    const summary = `[${shortStatus}] ${b.event_name}${rooms ? ` - ${rooms}` : ""}`;

    const descParts: string[] = [
      `Booking: ${b.reference}`,
      `Status: ${shortStatus}`,
      rooms ? `Rooms: ${rooms}` : "",
      typeof b.estimated_attendance === "number"
        ? `Estimated attendance: ${b.estimated_attendance}`
        : "",
      `Bump in: ${b.bump_in_time?.slice(0, 5)}`,
      `Bump out: ${b.bump_out_time?.slice(0, 5)}`,
    ];

    if (settings.include_contact_details && b.customers) {
      descParts.push(
        `Customer: ${b.customers.contact_name ?? ""}${b.customers.organisation ? ` (${b.customers.organisation})` : ""}`,
        b.customers.email ? `Email: ${b.customers.email}` : "",
        b.customers.phone ? `Phone: ${b.customers.phone}` : "",
      );
    }

    if (b.notes) descParts.push(`Notes: ${b.notes}`);
    if (settings.include_internal_notes && b.admin_notes) {
      descParts.push(`Internal notes: ${b.admin_notes}`);
    }

    const description = descParts.filter(Boolean).join("\n");

    // Map to ICS STATUS
    const icsStatus =
      bucket === "cancelled"
        ? "CANCELLED"
        : bucket === "tentative" || bucket === "quote_created" || bucket === "pending_approval"
          ? "TENTATIVE"
          : "CONFIRMED";

    lines.push(
      "BEGIN:VEVENT",
      fold(`UID:booking-${b.id}@dreambuilders`),
      fold(`SUMMARY:${escapeText(summary)}`),
      `DTSTAMP:${fmtUtc(b.updated_at ?? b.created_at ?? new Date().toISOString())}`,
      `DTSTART;TZID=Australia/Melbourne:${fmtLocal(b.event_date, b.bump_in_time)}`,
      `DTEND;TZID=Australia/Melbourne:${fmtLocal(b.event_date, b.bump_out_time)}`,
      `STATUS:${icsStatus}`,
      fold(`DESCRIPTION:${escapeText(description)}`),
      rooms ? fold(`LOCATION:${escapeText(rooms)}, Dreambuilders Church, Hoppers Crossing`) : "LOCATION:Dreambuilders Church, Hoppers Crossing",
      "TRANSP:OPAQUE",
      // Bump SEQUENCE using seconds since updated_at so clients pick up updates.
      `SEQUENCE:${Math.floor(new Date(b.updated_at ?? b.created_at ?? Date.now()).getTime() / 1000)}`,
      "END:VEVENT",
    );
  }

  lines.push("END:VCALENDAR");
  return lines.filter(Boolean).join("\r\n") + "\r\n";
}
