import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";
import { calculateQuote } from "@/lib/pricing";

const adminEntrySchema = z.object({
  entry_type: z.enum(["booking", "internal"]),
  event_name: z.string().trim().min(1, "Event name is required").max(200),
  event_date: z.string().min(1, "Event date is required"),
  bump_in: z.string().min(1, "Start time is required"),
  bump_out: z.string().min(1, "End time is required"),
  selected_room_ids: z.array(z.string()).min(1, "Select at least one room"),
  attendance: z.coerce.number().int().min(0).max(10000).optional(),
  notes: z.string().trim().max(2000).optional(),
  admin_notes: z.string().trim().max(2000).optional(),
  status: z.string().optional(),
  // Booking-only fields
  contact_name: z.string().trim().max(120).optional(),
  organisation: z.string().trim().max(200).optional(),
  email: z.string().trim().max(255).optional(),
  phone: z.string().trim().max(50).optional(),
  kitchen: z.boolean().optional().default(false),
  food_served: z.boolean().optional().default(false),
  sound_system: z.boolean().optional().default(false),
  av_screens: z.boolean().optional().default(false),
  theatre_lighting: z.boolean().optional().default(false),
  seating_changes: z.boolean().optional().default(false),
  remove_drums: z.boolean().optional().default(false),
  extra_staff_count: z.coerce.number().int().min(0).optional().default(0),
});

export const createAdminBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adminEntrySchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleError) throw new Error("Unable to verify access");
    const allowed = (roleRows ?? []).some((r) => r.role === "admin" || r.role === "staff");
    if (!allowed) throw new Error("Forbidden");

    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (roomsError) throw new Error(`Failed to load rooms: ${roomsError.message}`);

    const allRooms = rooms ?? [];
    const nonKitchenRooms = allRooms.filter((r) => r.slug !== "kitchen");
    const kitchenRoom = allRooms.find((r) => r.slug === "kitchen");
    const selectedRoomIds = data.selected_room_ids;
    const isInternal = data.entry_type === "internal";

    const quote = isInternal
      ? null
      : calculateQuote(
          {
            bumpIn: data.bump_in,
            bumpOut: data.bump_out,
            selectedRoomIds,
            kitchen: data.kitchen,
            foodServed: data.food_served,
            seatingChanges: data.seating_changes,
            removeDrums: data.remove_drums,
            soundSystem: data.sound_system,
            avScreens: data.av_screens,
            theatreLighting: data.theatre_lighting,
            extraStaffCount: data.extra_staff_count,
          },
          nonKitchenRooms,
        );

    let customerId: string | null = null;
    if (!isInternal) {
      if (!data.contact_name || !data.email) {
        throw new Error("Contact name and email are required for a customer booking");
      }
      const { data: customer, error: customerError } = await supabase
        .from("customers")
        .insert({
          contact_name: data.contact_name,
          organisation: data.organisation ?? null,
          email: data.email,
          phone: data.phone ?? null,
        })
        .select("id")
        .single();
      if (customerError) throw new Error(`Failed to create customer: ${customerError.message}`);
      customerId = customer.id;
    }

    const hours = quote
      ? quote.hours
      : Math.max(
          0,
          (Number(data.bump_out.slice(0, 2)) * 60 + Number(data.bump_out.slice(3, 5)) -
            (Number(data.bump_in.slice(0, 2)) * 60 + Number(data.bump_in.slice(3, 5)))) /
            60,
        );

    const { data: booking, error: bookingError } = await supabase
      .from("bookings")
      .insert({
        entry_type: data.entry_type,
        created_by: userId,
        customer_id: customerId,
        event_name: data.event_name,
        event_date: data.event_date,
        bump_in_time: data.bump_in,
        bump_out_time: data.bump_out,
        estimated_attendance: data.attendance ?? null,
        food_served: isInternal ? false : data.food_served,
        sound_system: isInternal ? false : data.sound_system,
        av_screens: isInternal ? false : data.av_screens,
        theatre_lighting: isInternal ? false : data.theatre_lighting,
        seating_changes: isInternal ? false : data.seating_changes,
        remove_drums: isInternal ? false : data.remove_drums,
        kitchen: isInternal ? false : data.kitchen,
        extra_staff_count: isInternal ? 0 : data.extra_staff_count,
        notes: data.notes?.trim() || null,
        admin_notes: data.admin_notes?.trim() || null,
        hours,
        room_subtotal: quote?.roomSubtotal ?? 0,
        extras_subtotal: quote?.extrasSubtotal ?? 0,
        cleaning_subtotal: quote?.cleaningSubtotal ?? 0,
        staff_subtotal: quote ? quote.requiredStaffSubtotal + quote.staffSubtotal : 0,
        bond: quote?.bond ?? 0,
        subtotal_ex_bond: quote?.subtotalExBond ?? 0,
        deposit_amount: quote?.depositAmount ?? 0,
        total_amount: quote?.totalAmount ?? 0,
        status: (data.status as never) ?? (isInternal ? "confirmed" : "enquiry"),
      })
      .select("id, reference")
      .single();
    if (bookingError) throw new Error(`Failed to create entry: ${bookingError.message}`);

    const rows = allRooms
      .filter((r) => selectedRoomIds.includes(r.id))
      .map((r) => {
        if (isInternal) {
          return { booking_id: booking.id, room_id: r.id, hours, line_total: 0 };
        }
        if (kitchenRoom && r.id === kitchenRoom.id) {
          return { booking_id: booking.id, room_id: r.id, hours: 0, line_total: 250 };
        }
        const chargeHours = Math.max(quote?.hours ?? 0, r.min_hours);
        return {
          booking_id: booking.id,
          room_id: r.id,
          hours: chargeHours,
          line_total: chargeHours * r.hourly_rate,
        };
      });

    if (rows.length > 0) {
      const { error: rowsError } = await supabase.from("booking_rooms").insert(rows);
      if (rowsError) throw new Error(`Failed to attach rooms: ${rowsError.message}`);
    }

    return { id: booking.id, reference: booking.reference, entry_type: data.entry_type };
  });

const adminUpdateSchema = adminEntrySchema.extend({
  booking_id: z.string().uuid(),
  extra_staff_count: z.coerce.number().int().min(0).max(50).optional().default(0),
});

export const updateAdminBooking = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .inputValidator((input: unknown) => adminUpdateSchema.parse(input))
  .handler(async ({ data, context }) => {
    const { supabase, userId } = context;

    const { data: roleRows, error: roleError } = await supabase
      .from("user_roles")
      .select("role")
      .eq("user_id", userId);
    if (roleError) throw new Error("Unable to verify access");
    const allowed = (roleRows ?? []).some((r) => r.role === "admin" || r.role === "staff");
    if (!allowed) throw new Error("Forbidden");

    const { data: existing, error: existingError } = await supabase
      .from("bookings")
      .select("id, customer_id, entry_type, discount_amount")
      .eq("id", data.booking_id)
      .single();
    if (existingError || !existing) throw new Error("Booking not found");

    const { data: rooms, error: roomsError } = await supabase
      .from("rooms")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (roomsError) throw new Error(`Failed to load rooms: ${roomsError.message}`);

    const allRooms = rooms ?? [];
    const nonKitchenRooms = allRooms.filter((r) => r.slug !== "kitchen");
    const kitchenRoom = allRooms.find((r) => r.slug === "kitchen");
    const selectedRoomIds = data.selected_room_ids;
    const isInternal = data.entry_type === "internal";

    const quote = isInternal
      ? null
      : calculateQuote(
          {
            bumpIn: data.bump_in,
            bumpOut: data.bump_out,
            selectedRoomIds,
            kitchen: data.kitchen,
            foodServed: data.food_served,
            seatingChanges: data.seating_changes,
            removeDrums: data.remove_drums,
            soundSystem: data.sound_system,
            avScreens: data.av_screens,
            theatreLighting: data.theatre_lighting,
            extraStaffCount: data.extra_staff_count,
          },
          nonKitchenRooms,
        );

    // Keep contact details in sync when provided
    if (!isInternal && existing.customer_id && (data.contact_name || data.email)) {
      const { error: custError } = await supabase
        .from("customers")
        .update({
          ...(data.contact_name ? { contact_name: data.contact_name } : {}),
          ...(data.email ? { email: data.email } : {}),
          organisation: data.organisation ?? null,
          phone: data.phone ?? null,
        })
        .eq("id", existing.customer_id);
      if (custError) throw new Error(`Failed to update customer: ${custError.message}`);
    }

    const hours = quote
      ? quote.hours
      : Math.max(
          0,
          (Number(data.bump_out.slice(0, 2)) * 60 + Number(data.bump_out.slice(3, 5)) -
            (Number(data.bump_in.slice(0, 2)) * 60 + Number(data.bump_in.slice(3, 5)))) /
            60,
        );

    const { error: updateError } = await supabase
      .from("bookings")
      .update({
        event_name: data.event_name,
        event_date: data.event_date,
        bump_in_time: data.bump_in,
        bump_out_time: data.bump_out,
        estimated_attendance: data.attendance ?? null,
        food_served: isInternal ? false : data.food_served,
        sound_system: isInternal ? false : data.sound_system,
        av_screens: isInternal ? false : data.av_screens,
        theatre_lighting: isInternal ? false : data.theatre_lighting,
        seating_changes: isInternal ? false : data.seating_changes,
        remove_drums: isInternal ? false : data.remove_drums,
        kitchen: isInternal ? false : data.kitchen,
        extra_staff_count: isInternal ? 0 : data.extra_staff_count,
        notes: data.notes?.trim() || null,
        admin_notes: data.admin_notes?.trim() || null,
        hours,
        room_subtotal: quote?.roomSubtotal ?? 0,
        extras_subtotal: quote?.extrasSubtotal ?? 0,
        cleaning_subtotal: quote?.cleaningSubtotal ?? 0,
        staff_subtotal: quote ? quote.requiredStaffSubtotal + quote.staffSubtotal : 0,
        bond: quote?.bond ?? 0,
        subtotal_ex_bond: quote?.subtotalExBond ?? 0,
        deposit_amount: quote?.depositAmount ?? 0,
        total_amount: quote?.totalAmount ?? 0,
        ...(data.status ? { status: data.status as never } : {}),
      })
      .eq("id", data.booking_id);
    if (updateError) throw new Error(`Failed to update entry: ${updateError.message}`);

    const { error: delError } = await supabase
      .from("booking_rooms")
      .delete()
      .eq("booking_id", data.booking_id);
    if (delError) throw new Error(`Failed to update rooms: ${delError.message}`);

    const rows = allRooms
      .filter((r) => selectedRoomIds.includes(r.id))
      .map((r) => {
        if (isInternal) {
          return { booking_id: data.booking_id, room_id: r.id, hours, line_total: 0 };
        }
        if (kitchenRoom && r.id === kitchenRoom.id) {
          return { booking_id: data.booking_id, room_id: r.id, hours: 0, line_total: 250 };
        }
        const chargeHours = Math.max(quote?.hours ?? 0, r.min_hours);
        return {
          booking_id: data.booking_id,
          room_id: r.id,
          hours: chargeHours,
          line_total: chargeHours * r.hourly_rate,
        };
      });

    if (rows.length > 0) {
      const { error: rowsError } = await supabase.from("booking_rooms").insert(rows);
      if (rowsError) throw new Error(`Failed to attach rooms: ${rowsError.message}`);
    }

    return { id: data.booking_id, hours, total_amount: quote?.totalAmount ?? 0 };
  });
