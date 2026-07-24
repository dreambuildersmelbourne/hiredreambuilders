import { auth, defineMcp } from "@lovable.dev/mcp-js";

import listRoomsTool from "./tools/list-rooms";
import listMyBookingsTool from "./tools/list-my-bookings";
import getBookingTool from "./tools/get-booking";
import calculateQuoteTool from "./tools/calculate-quote";

// Direct Supabase issuer host — the .lovable.cloud proxy would fail RFC 8414
// issuer discovery. VITE_SUPABASE_PROJECT_ID is inlined by Vite at build.
const projectRef = import.meta.env.VITE_SUPABASE_PROJECT_ID ?? "project-ref-unset";

export default defineMcp({
  name: "dreambuilders-venue-hire",
  title: "Dreambuilders Venue Hire",
  version: "0.1.0",
  instructions:
    "Tools for Dreambuilders Venue Hire. Browse rooms, price a venue-hire quote, and read the signed-in customer's own bookings. All booking data is scoped to the authenticated user via row-level security.",
  auth: auth.oauth.issuer({
    issuer: `https://${projectRef}.supabase.co/auth/v1`,
    acceptedAudiences: "authenticated",
  }),
  tools: [listRoomsTool, listMyBookingsTool, getBookingTool, calculateQuoteTool],
});
