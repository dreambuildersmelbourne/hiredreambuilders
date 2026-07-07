import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { ChevronLeft, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { EventDayView } from "@/components/EventDayView";

export const Route = createFileRoute("/_authenticated/staff/events/$id")({
  component: StaffEventPage,
});

function StaffEventPage() {
  const { id } = Route.useParams();

  const meQ = useQuery({
    queryKey: ["staff", "myRoleForBooking", id],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return { staffRoleId: null as string | null, isAdmin: false };
      const [rolesRes, assignRes] = await Promise.all([
        supabase.from("user_roles").select("role").eq("user_id", uid),
        supabase.from("staff_assignments").select("staff_role_id").eq("user_id", uid).eq("booking_id", id).maybeSingle(),
      ]);
      const isAdmin = (rolesRes.data ?? []).some((r) => r.role === "admin");
      return { staffRoleId: assignRes.data?.staff_role_id ?? null, isAdmin };
    },
  });

  if (meQ.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading…
      </div>
    );
  }

  const isAdmin = meQ.data?.isAdmin ?? false;
  const staffRoleId = meQ.data?.staffRoleId ?? null;
  const isAssigned = staffRoleId !== null;

  if (!isAdmin && !isAssigned) {
    return (
      <div className="space-y-4">
        <Link to="/staff" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
          <ChevronLeft className="h-4 w-4" /> Back to my events
        </Link>
        <div className="rounded-md border border-border bg-muted/40 p-6 text-center text-sm text-muted-foreground">
          You aren't assigned to this event, so the checklist isn't available. Ask an admin to add you if you should be rostered on.
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <Link to="/staff" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground">
        <ChevronLeft className="h-4 w-4" /> Back to my events
      </Link>
      <EventDayView bookingId={id} staffRoleId={staffRoleId} isAdmin={isAdmin} />
    </div>
  );
}
