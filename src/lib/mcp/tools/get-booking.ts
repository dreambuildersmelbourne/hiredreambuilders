import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { supabaseForUser } from "./list-rooms";

export default defineTool({
  name: "get_booking",
  title: "Get booking details",
  description:
    "Get full details for a single booking the caller owns: event fields, requirements, rooms, and totals. Returns not-found (via RLS) if the booking is not owned by the caller.",
  inputSchema: {
    booking_id: z.string().uuid().describe("Booking id (uuid) from list_my_bookings."),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async ({ booking_id }, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const supabase = supabaseForUser(ctx);
    const { data: booking, error } = await supabase
      .from("bookings")
      .select("*")
      .eq("id", booking_id)
      .maybeSingle();
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };
    if (!booking) {
      return { content: [{ type: "text", text: "Booking not found" }], isError: true };
    }
    const { data: rooms } = await supabase
      .from("booking_rooms")
      .select("hours, line_total, rooms(name, slug)")
      .eq("booking_id", booking_id);
    const payload = { booking, rooms: rooms ?? [] };
    return {
      content: [{ type: "text", text: JSON.stringify(payload, null, 2) }],
      structuredContent: payload,
    };
  },
});
