import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { format } from "date-fns";
import { CalendarDays, ChevronRight, Loader2 } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";

export const Route = createFileRoute("/_authenticated/staff/")({
  component: StaffIndex,
});

function StaffIndex() {
  const q = useQuery({
    queryKey: ["staff", "myAssignments"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return [];
      const { data, error } = await supabase
        .from("staff_assignments")
        .select("*, staff_roles(name, slug), bookings(id, reference, event_name, event_date, bump_in_time, bump_out_time, status)")
        .eq("user_id", uid)
        .order("created_at", { ascending: false });
      if (error) throw error;
      return (data ?? []).filter((a) => a.bookings);
    },
  });

  if (q.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading assignments…
      </div>
    );
  }

  const rows = q.data ?? [];
  const upcoming = rows.filter((a) => a.bookings!.event_date >= new Date().toISOString().slice(0, 10));
  const past = rows.filter((a) => a.bookings!.event_date < new Date().toISOString().slice(0, 10));

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-3xl font-semibold">My events</h1>
        <p className="mt-1 text-muted-foreground">Your role-specific checklist appears on each event day page.</p>
      </div>

      <Section title="Upcoming" items={upcoming} empty="No upcoming events assigned yet." />
      {past.length > 0 && <Section title="Past" items={past} empty="" />}
    </div>
  );
}

function Section({ title, items, empty }: { title: string; items: any[]; empty: string }) {
  return (
    <div>
      <h2 className="mb-3 font-display text-lg font-semibold">{title}</h2>
      {items.length === 0 ? (
        <p className="text-sm text-muted-foreground">{empty}</p>
      ) : (
        <div className="grid gap-3">
          {items.map((a) => (
            <Link
              key={a.id}
              to="/staff/events/$id"
              params={{ id: a.bookings.id }}
              className="block"
            >
              <Card className="transition hover:border-primary/50">
                <CardContent className="flex items-center justify-between p-4">
                  <div>
                    <div className="text-xs uppercase tracking-widest text-muted-foreground">
                      {a.bookings.reference}
                    </div>
                    <div className="mt-0.5 font-semibold">{a.bookings.event_name}</div>
                    <div className="mt-1 flex items-center gap-2 text-sm text-muted-foreground">
                      <CalendarDays className="h-3.5 w-3.5" />
                      {format(new Date(a.bookings.event_date), "EEE d MMM yyyy")} ·{" "}
                      {a.bookings.bump_in_time?.slice(0, 5)}–{a.bookings.bump_out_time?.slice(0, 5)}
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <Badge variant="outline">{a.staff_roles?.name ?? "Unassigned role"}</Badge>
                    <ChevronRight className="h-4 w-4 text-muted-foreground" />
                  </div>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
