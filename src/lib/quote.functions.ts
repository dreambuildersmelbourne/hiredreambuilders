import { createServerFn } from "@tanstack/react-start";
import { z } from "zod";
import { calculateQuote, money } from "@/lib/pricing";
import type { NewEnquiryEmailProps } from "@/lib/email-templates/new-enquiry";

const quoteInputSchema = z.object({
  event_name: z.string().trim().min(1, "Event name is required").max(200),
  event_date: z.string().min(1, "Event date is required"),
  bump_in: z.string().min(1, "Bump in time is required"),
  bump_out: z.string().min(1, "Bump out time is required"),
  attendance: z.coerce.number().int().min(0).max(10000).optional(),
  contact_name: z.string().trim().min(1, "Your name is required").max(120),
  organisation: z.string().trim().max(200).optional(),
  email: z.string().trim().email("Enter a valid email").max(255),
  phone: z.string().trim().max(50).optional(),
  notes: z.string().trim().max(2000).optional(),
  selected_room_ids: z.array(z.string()).min(1, "Select at least one room"),
  kitchen: z.boolean().optional().default(false),
  food_served: z.boolean().optional().default(false),
  sound_system: z.boolean().optional().default(false),
  av_screens: z.boolean().optional().default(false),
  theatre_lighting: z.boolean().optional().default(false),
  seating_changes: z.boolean().optional().default(false),
  remove_drums: z.boolean().optional().default(false),
  extra_staff_count: z.coerce.number().int().min(0).optional().default(0),
  tentative_hold: z.boolean().optional().default(false),
});

export const submitQuote = createServerFn({ method: "POST" })
  .validator((input) => quoteInputSchema.parse(input))
  .handler(async ({ data }) => {
    const [{ supabaseAdmin }, { render }, { sendLovableEmail }] = await Promise.all([
      import("@/integrations/supabase/client.server"),
      import("@react-email/render"),
      import("@lovable.dev/email-js"),
    ]);

    const apiKey = process.env.LOVABLE_API_KEY;
    if (!apiKey) {
      console.warn("LOVABLE_API_KEY is missing; email notifications cannot be sent");
    }

    // Fetch active rooms
    const { data: rooms, error: roomsError } = await supabaseAdmin
      .from("rooms")
      .select("*")
      .eq("active", true)
      .order("sort_order");
    if (roomsError) throw new Error(`Failed to load rooms: ${roomsError.message}`);

    const nonKitchenRooms = rooms?.filter((r) => r.slug !== "kitchen") ?? [];
    const kitchenRoom = rooms?.find((r) => r.slug === "kitchen");
    const selectedRoomIds = data.selected_room_ids;

    const quote = calculateQuote(
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

    // Create customer
    const { data: customer, error: customerError } = await supabaseAdmin
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

    // Create booking
    const noteParts: string[] = [];
    if (data.sound_system) noteParts.push("Sound system required");
    if (data.av_screens) noteParts.push("AV screens required");
    if (data.theatre_lighting) noteParts.push("Theatre lighting required");
    if (data.notes?.trim()) noteParts.push(data.notes.trim());

    const { data: booking, error: bookingError } = await supabaseAdmin
      .from("bookings")
      .insert({
        customer_id: customer.id,
        event_name: data.event_name,
        event_date: data.event_date,
        bump_in_time: data.bump_in,
        bump_out_time: data.bump_out,
        estimated_attendance: data.attendance ?? null,
        food_served: data.food_served,
        sound_system: data.sound_system,
        av_screens: data.av_screens,
        theatre_lighting: data.theatre_lighting,
        seating_changes: data.seating_changes,
        remove_drums: data.remove_drums,
        kitchen: data.kitchen,
        extra_staff_count: data.extra_staff_count,
        notes: noteParts.join("\n") || null,
        hours: quote.hours,
        room_subtotal: quote.roomSubtotal,
        extras_subtotal: quote.extrasSubtotal,
        cleaning_subtotal: quote.cleaningSubtotal,
        staff_subtotal: quote.requiredStaffSubtotal + quote.staffSubtotal,
        bond: quote.bond,
        subtotal_ex_bond: quote.subtotalExBond,
        deposit_amount: quote.depositAmount,
        total_amount: quote.totalAmount,
        status: "enquiry",
        tentative_hold_requested: data.tentative_hold,
      })
      .select("id, reference")
      .single();
    if (bookingError) throw new Error(`Failed to create booking: ${bookingError.message}`);

    // Booking rooms
    const bookingRoomsRows = nonKitchenRooms
      .filter((r) => selectedRoomIds.includes(r.id))
      .map((r) => {
        const chargeHours = Math.max(quote.hours, r.min_hours);
        return {
          booking_id: booking.id,
          room_id: r.id,
          hours: chargeHours,
          line_total: chargeHours * r.hourly_rate,
        };
      });
    if (data.kitchen && kitchenRoom) {
      bookingRoomsRows.push({
        booking_id: booking.id,
        room_id: kitchenRoom.id,
        hours: 0,
        line_total: 250,
      });
    }
    if (bookingRoomsRows.length > 0) {
      const { error: roomsInsertError } = await supabaseAdmin.from("booking_rooms").insert(bookingRoomsRows);
      if (roomsInsertError) throw new Error(`Failed to create booking rooms: ${roomsInsertError.message}`);
    }

    // Send email notification if configured
    try {
      if (apiKey) {
        const { data: settings } = await supabaseAdmin
          .from("app_settings")
          .select("key, value")
          .in("key", ["notification_email", "sender_domain"])
          .order("key");

        const settingMap = Object.fromEntries((settings ?? []).map((s) => [s.key, s.value]));
        const notificationEmail = settingMap["notification_email"];
        const senderDomain = settingMap["sender_domain"];

        if (notificationEmail && senderDomain) {
          const { NewEnquiryEmail } = await import("@/lib/email-templates/new-enquiry");
          const selectedRoomNames = rooms
            ?.filter((r) => selectedRoomIds.includes(r.id) || (data.kitchen && r.slug === "kitchen"))
            .map((r) => r.name) ?? [];

          const bookingLink = `${process.env.SITE_URL ?? "https://hiredreambuilders.lovable.app"}/admin/bookings/${booking.id}`;

          const emailProps: NewEnquiryEmailProps = {
            eventName: data.event_name,
            eventDate: data.event_date,
            bumpInTime: data.bump_in,
            bumpOutTime: data.bump_out,
            rooms: selectedRoomNames,
            attendance: data.attendance ?? null,
            customerName: data.contact_name,
            customerEmail: data.email,
            customerPhone: data.phone ?? null,
            customerOrganisation: data.organisation ?? null,
            totalAmount: money(Number(quote.totalAmount)),
            depositAmount: money(Number(quote.depositAmount)),
            bookingReference: booking.reference,
            bookingLink,
            notes: data.notes ?? null,
            kitchenRequired: data.kitchen,
            foodServed: data.food_served,
            soundRequired: data.sound_system,
            avRequired: data.av_screens,
            lightingRequired: data.theatre_lighting,
            seatingChanges: data.seating_changes,
            drumsRemoved: data.remove_drums,
            extraStaffCount: data.extra_staff_count,
            tentativeHold: data.tentative_hold,
          };

          const html = await render(NewEnquiryEmail(emailProps));
          const text = await render(NewEnquiryEmail(emailProps), { plainText: true });

          const sendRes = await sendLovableEmail(
            {
              to: notificationEmail,
              from: `Dreambuilders Venue Hire <hire@${senderDomain}>`,
              sender_domain: senderDomain,
              subject: `New hire enquiry: ${data.event_name}`,
              html,
              text,
              purpose: "transactional",
              idempotency_key: `quote-enquiry-${booking.id}`,
            },
            { apiKey },
          );
          if (!sendRes.success) {
            console.warn("Email send returned unsuccessful", sendRes);
          }
        } else {
          console.warn(
            "Skipping quote notification email; missing app_settings:",
            !notificationEmail ? "notification_email" : "sender_domain",
          );
        }
      }
    } catch (emailErr) {
      // Booking was created successfully; do not fail the submission if email fails.
      console.error("Failed to send quote notification email:", emailErr);
    }

    return { id: booking.id, reference: booking.reference, tentative: data.tentative_hold };
  });
