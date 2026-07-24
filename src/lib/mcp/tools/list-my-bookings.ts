import { defineTool } from "@lovable.dev/mcp-js";
import { supabaseForUser } from "./list-rooms";

export default defineTool({
  name: "list_my_bookings",
  title: "List my bookings",
  description:
    "List the signed-in customer's own venue-hire bookings (event name, date, status, totals). RLS ensures only bookings owned by the caller are returned.",
  inputSchema: {},
  annotations: { readOnlyHint: true, idempotentHint: true, openWorldHint: false },
  handler: async (_input, ctx) => {
    if (!ctx.isAuthenticated()) {
      return { content: [{ type: "text", text: "Not authenticated" }], isError: true };
    }
    const { data, error } = await supabaseForUser(ctx)
      .from("bookings")
      .select(
        "id, reference, event_name, event_date, bump_in_time, bump_out_time, status, deposit_status, total_amount, deposit_amount",
      )
      .order("event_date", { ascending: false });
    if (error) {
      return { content: [{ type: "text", text: error.message }], isError: true };
    }
    return {
      content: [{ type: "text", text: JSON.stringify(data, null, 2) }],
      structuredContent: { bookings: data ?? [] },
    };
  },
});
