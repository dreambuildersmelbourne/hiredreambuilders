import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useQuery } from "@tanstack/react-query";
import { useMemo, useState } from "react";
import { addDays, endOfMonth, endOfWeek, format, isSameDay, isWithinInterval, parseISO, startOfMonth, startOfWeek } from "date-fns";
import { CalendarDays, ClipboardList, DoorOpen, Info, Loader2, Users, UserCog } from "lucide-react";
import { supabase } from "@/integrations/supabase/client";
import { BookingCalendar, type CalendarBooking } from "@/components/BookingCalendar";
import { RoleAssignmentModal } from "@/components/RoleAssignmentModal";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { CALENDAR_STATUS_META, calendarStatusFor } from "@/lib/calendar-status";

export const Route = createFileRoute("/_authenticated/staff/calendar")({
  head: () => ({
    meta: [
      { title: "Booking calendar — Dreambuilders Staff" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffCalendarPage,
});

type Assignment = {
  booking_id: string;
  staff_role_id: string | null;
  staff_roles?: { name: string | null } | null;
};

type StaffBooking = Omit<CalendarBooking, "booking_rooms"> & {
  booking_rooms?: Array<{ rooms?: { id?: string | null; name?: string | null } | null }> | null;
  booking_staff?: Array<{
    count: number | null;
    staff_roles?: { id: string; name: string | null; slug: string | null } | null;
  }> | null;
  staff_assignments?: Array<{
    user_id: string | null;
    staff_roles?: { name: string | null } | null;
  }> | null;
};

type Scope = "all" | "mine" | "confirmed" | "tentative";
type When = "any" | "today" | "week" | "month" | "upcoming7";

function StaffCalendarPage() {
  const navigate = useNavigate();
  const [scope, setScope] = useState<Scope>("all");
  const [when, setWhen] = useState<When>("any");
  const [roomId, setRoomId] = useState<string>("all");
  const [staffRoleId, setStaffRoleId] = useState<string>("all");
  const [assignFor, setAssignFor] = useState<StaffBooking | null>(null);

  const isAdminQ = useQuery({
    queryKey: ["me", "isAdmin"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;
      if (!uid) return false;
      const { data } = await supabase.from("user_roles").select("role").eq("user_id", uid);
      return (data ?? []).some((r) => r.role === "admin");
    },
  });
  const isAdmin = !!isAdminQ.data;

  const roomsQ = useQuery({
    queryKey: ["rooms", "list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("rooms").select("id, name").order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const staffRolesQ = useQuery({
    queryKey: ["staff_roles", "list"],
    queryFn: async () => {
      const { data, error } = await supabase.from("staff_roles").select("id, name").eq("active", true).order("name");
      if (error) throw error;
      return data ?? [];
    },
  });

  const q = useQuery({
    queryKey: ["staff", "calendar", "bookings"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id;

      const [{ data: bookings, error }, assignRes] = await Promise.all([
        supabase
          .from("bookings")
          .select(
            "id, reference, event_name, event_date, bump_in_time, bump_out_time, status, tentative_hold_requested, staff_can_view_tentative, estimated_attendance, customers(contact_name, organisation), booking_rooms(rooms(id, name)), booking_staff(count, staff_roles(id, name, slug)), staff_assignments(user_id, staff_roles(name))",
          )
          .order("event_date", { ascending: true }),
        uid
          ? supabase
              .from("staff_assignments")
              .select("booking_id, staff_role_id, staff_roles(name)")
              .eq("user_id", uid)
          : Promise.resolve({ data: [] as Assignment[], error: null }),
      ]);
      if (error) throw error;

      const assignments = (assignRes.data ?? []) as unknown as Assignment[];
      const assignedIds = new Set(assignments.map((r) => r.booking_id));
      const myRoleByBooking = new Map(
        assignments.map((r) => [r.booking_id, r.staff_roles?.name ?? null] as const),
      );

      const filtered = (bookings ?? []).filter((b) => {
        if (assignedIds.has(b.id)) return true;
        if (b.status === "confirmed" || b.status === "deposit_paid" || b.status === "completed") return true;
        if (b.status === "enquiry" && b.tentative_hold_requested && b.staff_can_view_tentative) return true;
        return false;
      });

      return {
        bookings: filtered as unknown as StaffBooking[],
        assignedIds,
        myRoleByBooking,
        uid: uid ?? null,
      };
    },
  });

  const now = new Date();
  const todayKey = format(now, "yyyy-MM-dd");

  const filtered = useMemo(() => {
    const list = q.data?.bookings ?? [];
    const assignedIds = q.data?.assignedIds ?? new Set<string>();
    return list.filter((b) => {
      const cs = calendarStatusFor(b.status, b.tentative_hold_requested);

      // Scope
      if (scope === "mine" && !assignedIds.has(b.id)) return false;
      if (scope === "confirmed" && cs !== "confirmed") return false;
      if (scope === "tentative" && cs !== "tentative") return false;

      // Time window
      const d = parseISO(b.event_date);
      if (when === "today" && b.event_date !== todayKey) return false;
      if (when === "upcoming7") {
        if (!isWithinInterval(d, { start: now, end: addDays(now, 7) })) return false;
      }
      if (when === "week") {
        const s = startOfWeek(now, { weekStartsOn: 1 });
        const e = endOfWeek(now, { weekStartsOn: 1 });
        if (!isWithinInterval(d, { start: s, end: e })) return false;
      }
      if (when === "month") {
        if (!isWithinInterval(d, { start: startOfMonth(now), end: endOfMonth(now) })) return false;
      }

      // Room
      if (roomId !== "all") {
        const has = (b.booking_rooms ?? []).some((r) => r.rooms?.id === roomId);
        if (!has) return false;
      }

      // Staff role required
      if (staffRoleId !== "all") {
        const needs = (b.booking_staff ?? []).some((s) => s.staff_roles?.id === staffRoleId);
        if (!needs) return false;
      }

      return true;
    });
  }, [q.data, scope, when, roomId, staffRoleId, todayKey]);

  const todays = useMemo(
    () => (q.data?.bookings ?? []).filter((b) => b.event_date === todayKey),
    [q.data, todayKey],
  );
  const next7 = useMemo(
    () =>
      (q.data?.bookings ?? [])
        .filter((b) => {
          const d = parseISO(b.event_date);
          return isWithinInterval(d, { start: now, end: addDays(now, 7) }) && b.event_date !== todayKey;
        })
        .slice(0, 8),
    [q.data, todayKey],
  );

  function go(b: StaffBooking) {
    navigate({ to: "/staff/events/$id", params: { id: b.id } });
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="font-display text-3xl font-semibold">Event calendar</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            Confirmed events, events you're assigned to, and tentative bookings admins have shared with staff.
          </p>
        </div>
        <Badge variant="outline" className="gap-1.5">
          <Info className="h-3.5 w-3.5" /> Read only — contact an admin to change bookings
        </Badge>
      </div>

      {/* Filters */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-2 lg:grid-cols-4">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Bookings</label>
            <Select value={scope} onValueChange={(v) => setScope(v as Scope)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All visible</SelectItem>
                <SelectItem value="mine">My assigned</SelectItem>
                <SelectItem value="confirmed">Confirmed only</SelectItem>
                <SelectItem value="tentative">Tentative only</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">When</label>
            <Select value={when} onValueChange={(v) => setWhen(v as When)}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="any">Any date</SelectItem>
                <SelectItem value="today">Today</SelectItem>
                <SelectItem value="upcoming7">Upcoming 7 days</SelectItem>
                <SelectItem value="week">This week</SelectItem>
                <SelectItem value="month">This month</SelectItem>
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Room</label>
            <Select value={roomId} onValueChange={setRoomId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All rooms</SelectItem>
                {(roomsQ.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Staff role required</label>
            <Select value={staffRoleId} onValueChange={setStaffRoleId}>
              <SelectTrigger><SelectValue /></SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Any role</SelectItem>
                {(staffRolesQ.data ?? []).map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </CardContent>
      </Card>

      {q.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading calendar…
        </div>
      ) : (
        <>
          {/* Today + Upcoming quick lists */}
          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-primary" /> Today · {format(now, "EEE d MMM")}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {todays.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No events today.</p>
                ) : (
                  todays.map((b) => (
                    <EventRow
                      key={b.id}
                      b={b}
                      assigned={q.data?.assignedIds.has(b.id) ?? false}
                      myRole={q.data?.myRoleByBooking.get(b.id) ?? null}
                      onOpen={() => go(b)} isAdmin={isAdmin} onAssign={() => setAssignFor(b)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
            <Card>
              <CardHeader className="pb-3">
                <CardTitle className="flex items-center gap-2 text-base">
                  <CalendarDays className="h-4 w-4 text-primary" /> Upcoming 7 days
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {next7.length === 0 ? (
                  <p className="text-sm text-muted-foreground">Nothing scheduled in the next 7 days.</p>
                ) : (
                  next7.map((b) => (
                    <EventRow
                      key={b.id}
                      b={b}
                      assigned={q.data?.assignedIds.has(b.id) ?? false}
                      myRole={q.data?.myRoleByBooking.get(b.id) ?? null}
                      onOpen={() => go(b)} isAdmin={isAdmin} onAssign={() => setAssignFor(b)}
                    />
                  ))
                )}
              </CardContent>
            </Card>
          </div>

          {/* Calendar */}
          <BookingCalendar bookings={filtered} onEventClick={(b) => go(b as StaffBooking)} />

          {/* Filtered list */}
          <Card>
            <CardHeader className="pb-3">
              <CardTitle className="text-base">Filtered events ({filtered.length})</CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {filtered.length === 0 ? (
                <p className="text-sm text-muted-foreground">No events match the current filters.</p>
              ) : (
                filtered.map((b) => (
                  <EventRow
                    key={b.id}
                    b={b}
                    assigned={q.data?.assignedIds.has(b.id) ?? false}
                    myRole={q.data?.myRoleByBooking.get(b.id) ?? null}
                    onOpen={() => go(b)} isAdmin={isAdmin} onAssign={() => setAssignFor(b)}
                    showDate
                  />
                ))
              )}
            </CardContent>
          </Card>
        </>
      )}

      <RoleAssignmentModal
        open={!!assignFor}
        onOpenChange={(v) => !v && setAssignFor(null)}
        booking={
          assignFor
            ? {
                id: assignFor.id,
                reference: assignFor.reference,
                event_name: assignFor.event_name,
                event_date: assignFor.event_date,
              }
            : null
        }
      />
    </div>
  );
}

function EventRow({
  b,
  assigned,
  myRole,
  onOpen,
  showDate,
}: {
  b: StaffBooking;
  assigned: boolean;
  myRole: string | null;
  onOpen: () => void;
  showDate?: boolean;
}) {
  const cs = calendarStatusFor(b.status, b.tentative_hold_requested);
  const meta = CALENDAR_STATUS_META[cs];
  const rooms = (b.booking_rooms ?? []).map((r) => r.rooms?.name).filter(Boolean).join(", ");
  const requiredRoles = (b.booking_staff ?? [])
    .map((s) => `${s.staff_roles?.name ?? ""}${(s.count ?? 1) > 1 ? ` ×${s.count}` : ""}`)
    .filter(Boolean);

  return (
    <div className={`rounded-md border border-l-4 p-3 ${meta.bar}`}>
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-medium">{b.event_name || b.reference}</span>
            <Badge variant="outline" className={meta.className}>{meta.label}</Badge>
            {assigned && (
              <Badge variant="secondary" className="gap-1">
                <ClipboardList className="h-3 w-3" /> Assigned{myRole ? ` · ${myRole}` : ""}
              </Badge>
            )}
          </div>
          <div className="mt-1.5 flex flex-wrap gap-x-4 gap-y-1 text-xs text-muted-foreground">
            {showDate && <span>{format(parseISO(b.event_date), "EEE d MMM yyyy")}</span>}
            <span>Bump in {b.bump_in_time?.slice(0, 5)} → Bump out {b.bump_out_time?.slice(0, 5)}</span>
            {rooms && (
              <span className="inline-flex items-center gap-1">
                <DoorOpen className="h-3 w-3" /> {rooms}
              </span>
            )}
            {requiredRoles.length > 0 && (
              <span className="inline-flex items-center gap-1">
                <Users className="h-3 w-3" /> {requiredRoles.join(", ")}
              </span>
            )}
          </div>
        </div>
        <div className="flex gap-2">
          {assigned && (
            <Button asChild size="sm" variant="default">
              <Link to="/staff/events/$id" params={{ id: b.id }}>
                <ClipboardList className="mr-1 h-3.5 w-3.5" /> Checklist
              </Link>
            </Button>
          )}
          <Button size="sm" variant="outline" onClick={onOpen}>Open</Button>
        </div>
      </div>
    </div>
  );
}
