import { defineTool } from "@lovable.dev/mcp-js";
import { z } from "zod";
import { calculateQuote } from "@/lib/pricing";
import { supabaseForUser } from "./list-rooms";

export default defineTool({
  name: "calculate_quote",
  title: "Calculate a venue-hire quote",
  description:
    "Preview pricing for a venue-hire enquiry without saving anything. Returns hours, per-room line items, extras, cleaning, required staff, bond, deposit, and total.",
  inputSchema: {
    bump_in: z.string().regex(/^\d{2}:\d{2}$/).describe("Start time, HH:MM (24h)."),
    bump_out: z.string().regex(/^\d{2}:\d{2}$/).describe("End time, HH:MM (24h)."),
    selected_room_slugs: z
      .array(z.string())
      .min(1)
      .describe("Room slugs to hire (excluding kitchen). Get from list_rooms."),
    kitchen: z.boolean().optional().default(false),
    food_served: z.boolean().optional().default(false),
    seating_changes: z.boolean().optional().default(false),
    remove_drums: z.boolean().optional().default(false),
    sound_system: z.boolean().optional().default(false),
    av_screens: z.boolean().optional().default(false),
    theatre_lighting: z.boolean().optional().default(false),
    extra_staff_count: z.number().int().min(0).optional().default(0),
  },
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data: rooms, error } = await supabaseForUser(ctx)
      .from("rooms")
      .select("*")
      .eq("active", true);
    if (error) return { content: [{ type: "text", text: error.message }], isError: true };

    const selected = (rooms ?? []).filter((r) =>
      input.selected_room_slugs.includes(r.slug) && r.slug !== "kitchen",
    );
    if (selected.length === 0) {
      return {
        content: [{ type: "text", text: "No matching rooms for those slugs" }],
        isError: true,
      };
    }

    const quote = calculateQuote(
      {
        bumpIn: input.bump_in,
        bumpOut: input.bump_out,
        selectedRoomIds: selected.map((r) => r.id),
        kitchen: input.kitchen,
        foodServed: input.food_served,
        seatingChanges: input.seating_changes,
        removeDrums: input.remove_drums,
        soundSystem: input.sound_system,
        avScreens: input.av_screens,
        theatreLighting: input.theatre_lighting,
        extraStaffCount: input.extra_staff_count,
      },
      (rooms ?? []).filter((r) => r.slug !== "kitchen"),
    );
    return {
      content: [{ type: "text", text: JSON.stringify(quote, null, 2) }],
      structuredContent: quote,
    };
  },
});
