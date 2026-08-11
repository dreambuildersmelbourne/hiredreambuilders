import { createFileRoute, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BookingCalendar, type CalendarBooking } from "@/components/BookingCalendar";
import { AdminBookingDialog } from "@/components/AdminBookingDialog";

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
          "id, reference, event_name, event_date, bump_in_time, bump_out_time, status, entry_type, tentative_hold_requested, staff_can_view_tentative, estimated_attendance, customers(contact_name, organisation), booking_rooms(rooms(id, name))",
        )
        .order("event_date", { ascending: true });
      if (error) throw error;
      return data as unknown as CalendarBooking[];
    },
  });

  const roomsQ = useQuery({
    queryKey: ["admin", "calendar", "rooms"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Booking calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            All enquiries, bookings and internal blocks by date and room. Click an event to open its record.
          </p>
        </div>
        <AdminBookingDialog onCreated={() => q.refetch()} />
      </div>

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading calendar…
        </div>
      ) : (
        <BookingCalendar
          bookings={q.data ?? []}
          rooms={roomsQ.data ?? []}
          showFilters
          onEventClick={(b) => navigate({ to: "/admin/bookings/$id", params: { id: b.id } })}
        />
      )}
    </div>
  );
}
