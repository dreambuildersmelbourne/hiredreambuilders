import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BookingCalendar, type CalendarBooking } from "@/components/BookingCalendar";

export const Route = createFileRoute("/_authenticated/staff/calendar")({
  head: () => ({
    meta: [
      { title: "Booking calendar — Dreambuilders Staff" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffCalendarPage,
});

function StaffCalendarPage() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["staff", "calendar", "bookings"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;

      const [{ data: bookings, error }, assignRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, reference, event_name, event_date, bump_in_time, bump_out_time, status, tentative_hold_requested, staff_can_view_tentative, estimated_attendance, customers(contact_name, organisation), booking_rooms(rooms(name))",
          )
          .order("event_date", { ascending: true }),
        uid
          ? supabase.from("staff_assignments").select("booking_id").eq("user_id", uid)
          : Promise.resolve({ data: [] as { booking_id: string }[], error: null }),
      ]);
      if (error) throw error;

      const assignedIds = new Set(((assignRes.data ?? []) as { booking_id: string }[]).map((r) => r.booking_id));

      // Staff visibility rule:
      // - Confirmed / completed bookings: visible to all staff
      // - Bookings they are assigned to: always visible
      // - Tentative bookings: only if admin marked staff_can_view_tentative
      // - Everything else (quote_created, pending_approval, cancelled): hidden unless assigned
      const filtered = (bookings ?? []).filter((b) => {
        if (assignedIds.has(b.id)) return true;
        if (b.status === "confirmed" || b.status === "deposit_paid" || b.status === "completed") return true;
        if (b.status === "enquiry" && b.tentative_hold_requested && b.staff_can_view_tentative) return true;
        return false;
      });

      return { bookings: filtered as unknown as CalendarBooking[], assignedIds };
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Event calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Confirmed events, events you are assigned to, and tentative bookings admins have marked visible to staff.
        </p>
      </div>

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading calendar…
        </div>
      ) : (
        <BookingCalendar
          bookings={q.data?.bookings ?? []}
          onEventClick={(b) => {
            if (q.data?.assignedIds.has(b.id)) {
              navigate({ to: "/staff/events/$id", params: { id: b.id } });
            } else {
              // Read-only staff view: open the assigned events page anyway; it handles unassigned gracefully
              navigate({ to: "/staff/events/$id", params: { id: b.id } });
            }
          }}
        />
      )}
    </div>
  );
}
