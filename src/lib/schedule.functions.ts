import { createServerFn } from "@tanstack/react-start";

// Token-protected, read-only run sheets for approved/confirmed hires.
// The token is the same private calendar feed token managed in admin > Calendar sync.

const APPROVED_STATUSES = [
  "approved",
  "staffing_confirmed",
  "invoiced",
  "deposit_paid",
  "confirmed",
  "completed",
] as const;

async function assertToken(token: string) {
  if (!token || token.length < 16) throw new Error("Not found");
  const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
  const { data, error } = await supabaseAdmin
    .from("calendar_sync_settings")
    .select("feed_token")
    .eq("singleton", true)
    .maybeSingle();
  if (error || !data || data.feed_token !== token) throw new Error("Not found");
  return supabaseAdmin;
}

export const listApprovedRunSheets = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string }) => input)
  .handler(async ({ data }) => {
    const supabaseAdmin = await assertToken(data.token);
    const { data: rows, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, reference, event_name, event_date, bump_in_time, bump_out_time, status, estimated_attendance, entry_type, customers(contact_name, organisation), booking_rooms(rooms(name))",
      )
      .in("status", [...APPROVED_STATUSES])
      .eq("entry_type", "customer")
      .order("event_date", { ascending: true });
    if (error) throw new Error("Could not load hires");
    return (rows ?? []).map((b: any) => ({
      id: b.id as string,
      reference: b.reference as string,
      event_name: b.event_name as string,
      event_date: b.event_date as string,
      bump_in_time: b.bump_in_time as string,
      bump_out_time: b.bump_out_time as string,
      status: b.status as string,
      estimated_attendance: b.estimated_attendance as number | null,
      contact_name: (b.customers?.contact_name ?? null) as string | null,
      organisation: (b.customers?.organisation ?? null) as string | null,
      rooms: (b.booking_rooms ?? []).map((r: any) => r.rooms?.name).filter(Boolean) as string[],
    }));
  });

export const getRunSheet = createServerFn({ method: "GET" })
  .inputValidator((input: { token: string; id: string }) => input)
  .handler(async ({ data }) => {
    const supabaseAdmin = await assertToken(data.token);

    const { data: b, error } = await supabaseAdmin
      .from("bookings")
      .select(
        "id, reference, event_name, event_date, bump_in_time, bump_out_time, status, estimated_attendance, notes, hours, food_served, sound_system, av_screens, theatre_lighting, seating_changes, remove_drums, kitchen, security_required, extra_staff_count, entry_type, customers(contact_name, organisation, email, phone), booking_rooms(hours, rooms(name)), booking_extras(quantity, extras(name)), booking_staff(count, hours, staff_roles(name))",
      )
      .eq("id", data.id)
      .maybeSingle();

    if (error || !b || !(APPROVED_STATUSES as readonly string[]).includes(b.status) || b.entry_type !== "customer") {
      throw new Error("Not found");
    }

    const { data: checklist } = await supabaseAdmin
      .from("event_day_checklists")
      .select("id, item, category, completed, sort_order, note, staff_roles(name)")
      .eq("booking_id", data.id)
      .order("category", { ascending: true })
      .order("sort_order", { ascending: true });

    const { data: assignments } = await supabaseAdmin
      .from("staff_assignments")
      .select("id, name, confirmed, staff_roles(name)")
      .eq("booking_id", data.id);

    return {
      booking: {
        id: b.id as string,
        reference: b.reference as string,
        event_name: b.event_name as string,
        event_date: b.event_date as string,
        bump_in_time: b.bump_in_time as string,
        bump_out_time: b.bump_out_time as string,
        status: b.status as string,
        hours: Number(b.hours),
        estimated_attendance: b.estimated_attendance as number | null,
        notes: (b.notes ?? null) as string | null,
        food_served: !!b.food_served,
        sound_system: !!b.sound_system,
        av_screens: !!b.av_screens,
        theatre_lighting: !!b.theatre_lighting,
        seating_changes: !!b.seating_changes,
        remove_drums: !!b.remove_drums,
        kitchen: !!b.kitchen,
        security_required: !!b.security_required,
      },
      contact: {
        contact_name: (b as any).customers?.contact_name ?? null,
        organisation: (b as any).customers?.organisation ?? null,
        email: (b as any).customers?.email ?? null,
        phone: (b as any).customers?.phone ?? null,
      },
      rooms: ((b as any).booking_rooms ?? []).map((r: any) => ({
        name: r.rooms?.name ?? "Room",
        hours: Number(r.hours),
      })),
      extras: ((b as any).booking_extras ?? []).map((e: any) => ({
        name: e.extras?.name ?? "Extra",
        quantity: Number(e.quantity),
      })),
      crew: ((b as any).booking_staff ?? []).map((s: any) => ({
        name: s.staff_roles?.name ?? "Crew",
        count: Number(s.count),
        hours: Number(s.hours),
      })),
      assignments: (assignments ?? []).map((a: any) => ({
        id: a.id as string,
        name: (a.name ?? null) as string | null,
        confirmed: !!a.confirmed,
        role: a.staff_roles?.name ?? null,
      })),
      checklist: (checklist ?? []).map((c: any) => ({
        id: c.id as string,
        item: c.item as string,
        category: c.category as string,
        completed: !!c.completed,
        note: (c.note ?? null) as string | null,
        role: c.staff_roles?.name ?? null,
      })),
    };
  });
