import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BookingCalendar, type CalendarBooking } from "@/components/BookingCalendar";

export const Route = createFileRoute("/_authenticated/admin/calendar")({
  head: () => ({
    meta: [
      { title: "Booking calendar — Dreambuilders Admin" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: AdminCalendarPage,
});

function AdminCalendarPage() {
  const navigate = useNavigate();
  const q = useQuery({
    queryKey: ["admin", "calendar", "bookings"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("bookings")
        .select(
          "id, reference, event_name, event_date, bump_in_time, bump_out_time, status, tentative_hold_requested, staff_can_view_tentative, estimated_attendance, customers(contact_name, organisation), booking_rooms(rooms(name))",
        )
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as unknown as CalendarBooking[];
    },
  });

  return (
    <div className="space-y-6">
      <div>
        <h1 className="font-display text-3xl font-semibold">Booking calendar</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          All hire bookings across statuses. Click an event to open its full booking record.
        </p>
      </div>

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading calendar…
        </div>
      ) : (
        <BookingCalendar
          bookings={q.data ?? []}
          onEventClick={(b) => navigate({ to: "/admin/bookings/$id", params: { id: b.id } })}
        />
      )}
    </div>
  );
}
