import { createFileRoute, Link } from "@tanstack/react-router";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { useMemo, useState, useEffect } from "react";
import { format, parseISO } from "date-fns";
import { CalendarDays, CheckCircle2, ClipboardList, DoorOpen, Loader2, Lock, User } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";

export const Route = createFileRoute("/_authenticated/staff/checklist")({
  head: () => ({
    meta: [
      { title: "Event day checklist — Dreambuilders Staff" },
      { name: "robots", content: "noindex, nofollow" },
    ],
  }),
  component: StaffChecklistPage,
});

const CATEGORY_LABELS: Record<string, string> = {
  bump_in: "Bump in",
  during: "During event",
  bump_out: "Bump out",
  bond_release: "Bond release",
};
const CATEGORY_ORDER = ["bump_in", "during", "bump_out", "bond_release"];

type Assignment = {
  id: string;
  booking_id: string;
  staff_role_id: string | null;
  staff_roles: { name: string | null; slug: string | null } | null;
  bookings: {
    id: string;
    reference: string;
    event_name: string;
    event_date: string;
    bump_in_time: string;
    bump_out_time: string;
    status: string;
    booking_rooms: Array<{ rooms: { name: string | null } | null }> | null;
  } | null;
};

type ChecklistItem = {
  id: string;
  booking_id: string;
  category: string;
  item: string;
  note: string | null;
  sort_order: number;
  staff_role_id: string | null;
  completed: boolean;
  completed_at: string | null;
  completed_by: string | null;
  staff_roles: { name: string | null } | null;
};

function StaffChecklistPage() {
  const qc = useQueryClient();
  const [selectedBooking, setSelectedBooking] = useState<string | null>(null);
  const [showAllRoles, setShowAllRoles] = useState(false);
  const [hideCompleted, setHideCompleted] = useState(false);

  const meQ = useQuery({
    queryKey: ["me", "assignmentsWithBookings"],
    queryFn: async () => {
      const { data: userRes } = await supabase.auth.getUser();
      const uid = userRes.user?.id ?? null;
      if (!uid) return { uid, assignments: [] as Assignment[] };
      const { data, error } = await supabase
        .from("staff_assignments")
        .select(
          "id, booking_id, staff_role_id, staff_roles(name, slug), bookings(id, reference, event_name, event_date, bump_in_time, bump_out_time, status, booking_rooms(rooms(name)))",
        )
        .eq("user_id", uid);
      if (error) throw error;
      const rows = ((data ?? []) as unknown as Assignment[]).filter((a) => a.bookings);
      rows.sort((a, b) => (a.bookings!.event_date < b.bookings!.event_date ? -1 : 1));
      return { uid, assignments: rows };
    },
  });

  const assignments = meQ.data?.assignments ?? [];
  const uid = meQ.data?.uid ?? null;

  const today = new Date().toISOString().slice(0, 10);
  const upcoming = assignments.filter((a) => a.bookings!.event_date >= today);
  const past = assignments.filter((a) => a.bookings!.event_date < today);

  // Default selection: today's booking, else next upcoming, else most recent past
  useEffect(() => {
    if (selectedBooking || assignments.length === 0) return;
    const todays = assignments.find((a) => a.bookings!.event_date === today);
    const next = upcoming[0] ?? past[past.length - 1];
    setSelectedBooking((todays ?? next)?.booking_id ?? null);
  }, [assignments, selectedBooking, today, upcoming, past]);

  const currentAssignment = assignments.find((a) => a.booking_id === selectedBooking) ?? null;

  const checklistQ = useQuery({
    queryKey: ["staff", "checklist", selectedBooking],
    enabled: !!selectedBooking,
    queryFn: async () => {
      const { data, error } = await supabase
        .from("event_day_checklists")
        .select("*, staff_roles(name)")
        .eq("booking_id", selectedBooking!)
        .order("category")
        .order("sort_order");
      if (error) throw error;
      return (data ?? []) as unknown as ChecklistItem[];
    },
  });

  const items = checklistQ.data ?? [];
  const myRoleId = currentAssignment?.staff_role_id ?? null;

  const scoped = useMemo(() => {
    let list = items;
    if (!showAllRoles && myRoleId) {
      list = list.filter((i) => i.staff_role_id === myRoleId || i.staff_role_id === null);
    }
    if (hideCompleted) list = list.filter((i) => !i.completed);
    return list;
  }, [items, showAllRoles, myRoleId, hideCompleted]);

  const grouped = useMemo(() => {
    const g: Record<string, ChecklistItem[]> = {};
    for (const it of scoped) (g[it.category || "during"] ||= []).push(it);
    return g;
  }, [scoped]);

  const totals = useMemo(() => {
    const total = scoped.length;
    const done = scoped.filter((i) => i.completed).length;
    return { total, done, pct: total ? Math.round((done / total) * 100) : 0 };
  }, [scoped]);

  async function toggle(item: ChecklistItem, checked: boolean) {
    // Optimistic UI
    qc.setQueryData<ChecklistItem[]>(["staff", "checklist", selectedBooking], (prev) =>
      (prev ?? []).map((i) =>
        i.id === item.id
          ? { ...i, completed: checked, completed_at: checked ? new Date().toISOString() : null, completed_by: checked ? uid : null }
          : i,
      ),
    );
    const { error } = await supabase
      .from("event_day_checklists")
      .update({
        completed: checked,
        completed_at: checked ? new Date().toISOString() : null,
        completed_by: checked ? uid : null,
      })
      .eq("id", item.id);
    if (error) {
      toast.error(error.message);
      qc.invalidateQueries({ queryKey: ["staff", "checklist", selectedBooking] });
    }
  }

  if (meQ.isLoading) {
    return (
      <div className="flex items-center gap-2 text-muted-foreground">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading your assignments…
      </div>
    );
  }

  if (assignments.length === 0) {
    return (
      <div className="space-y-4">
        <Header />
        <Card>
          <CardContent className="flex flex-col items-center gap-3 p-10 text-center text-muted-foreground">
            <Lock className="h-8 w-8 opacity-60" />
            <div>
              <p className="font-medium text-foreground">No assignments yet</p>
              <p className="mt-1 text-sm">
                You'll only see checklists for events you've been rostered on. Ask an admin to add you to an event.
              </p>
            </div>
            <Button asChild variant="outline" size="sm">
              <Link to="/staff/calendar">View calendar</Link>
            </Button>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Header />

      {/* Booking picker + summary */}
      <Card>
        <CardContent className="grid gap-3 p-4 sm:grid-cols-[1fr_auto] sm:items-center">
          <div className="space-y-1.5">
            <label className="text-xs font-medium text-muted-foreground">Assigned event</label>
            <Select value={selectedBooking ?? ""} onValueChange={setSelectedBooking}>
              <SelectTrigger><SelectValue placeholder="Select an assigned event" /></SelectTrigger>
              <SelectContent>
                {upcoming.length > 0 && (
                  <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Upcoming</div>
                )}
                {upcoming.map((a) => (
                  <SelectItem key={a.booking_id} value={a.booking_id}>
                    {format(parseISO(a.bookings!.event_date), "EEE d MMM")} · {a.bookings!.event_name}
                    {a.bookings!.event_date === today && " · Today"}
                  </SelectItem>
                ))}
                {past.length > 0 && (
                  <div className="px-2 pb-1 pt-2 text-[10px] font-semibold uppercase tracking-wider text-muted-foreground">Past</div>
                )}
                {past.map((a) => (
                  <SelectItem key={a.booking_id} value={a.booking_id}>
                    {format(parseISO(a.bookings!.event_date), "EEE d MMM")} · {a.bookings!.event_name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          <div className="text-sm text-muted-foreground sm:text-right">
            {currentAssignment && (
              <>
                <div className="flex items-center gap-1.5 sm:justify-end">
                  <User className="h-3.5 w-3.5" /> Your role: <span className="font-medium text-foreground">{currentAssignment.staff_roles?.name ?? "Unassigned role"}</span>
                </div>
                <div className="mt-1 flex items-center gap-1.5 sm:justify-end">
                  <CheckCircle2 className="h-3.5 w-3.5" /> {totals.done}/{totals.total} complete ({totals.pct}%)
                </div>
              </>
            )}
          </div>
        </CardContent>
      </Card>

      {currentAssignment?.bookings && (
        <Card>
          <CardContent className="grid gap-2 p-4 sm:grid-cols-4">
            <Info label="Reference">{currentAssignment.bookings.reference}</Info>
            <Info label="Date" icon={<CalendarDays className="h-3.5 w-3.5" />}>
              {format(parseISO(currentAssignment.bookings.event_date), "EEE d MMM yyyy")}
            </Info>
            <Info label="Bump in / out">
              {currentAssignment.bookings.bump_in_time?.slice(0, 5)} – {currentAssignment.bookings.bump_out_time?.slice(0, 5)}
            </Info>
            <Info label="Rooms" icon={<DoorOpen className="h-3.5 w-3.5" />}>
              {(currentAssignment.bookings.booking_rooms ?? [])
                .map((r) => r.rooms?.name)
                .filter(Boolean)
                .join(", ") || "—"}
            </Info>
          </CardContent>
        </Card>
      )}

      {/* Controls */}
      <div className="flex flex-wrap items-center gap-3 text-sm">
        <label className="inline-flex items-center gap-2">
          <Checkbox checked={showAllRoles} onCheckedChange={(v) => setShowAllRoles(!!v)} />
          Show items for all roles
        </label>
        <label className="inline-flex items-center gap-2">
          <Checkbox checked={hideCompleted} onCheckedChange={(v) => setHideCompleted(!!v)} />
          Hide completed
        </label>
        <div className="ml-auto">
          <Button asChild size="sm" variant="outline" disabled={!selectedBooking}>
            <Link to="/staff/events/$id" params={{ id: selectedBooking ?? "" }}>
              Full event day view
            </Link>
          </Button>
        </div>
      </div>

      {/* Checklist */}
      {checklistQ.isLoading ? (
        <div className="flex items-center gap-2 text-muted-foreground">
          <Loader2 className="h-4 w-4 animate-spin" /> Loading checklist…
        </div>
      ) : scoped.length === 0 ? (
        <Card>
          <CardContent className="p-8 text-center text-sm text-muted-foreground">
            {items.length === 0
              ? "No checklist items have been generated for this event yet. Ask an admin to generate the checklist."
              : "No items match your current filters."}
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {CATEGORY_ORDER.filter((c) => grouped[c]?.length).map((cat) => (
            <Card key={cat}>
              <CardHeader className="pb-2">
                <CardTitle className="flex items-center justify-between text-base">
                  <span>{CATEGORY_LABELS[cat] ?? cat}</span>
                  <Badge variant="outline">
                    {grouped[cat].filter((i) => i.completed).length}/{grouped[cat].length}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-2">
                {grouped[cat].map((item) => (
                  <ChecklistRow key={item.id} item={item} myRoleId={myRoleId} onToggle={toggle} />
                ))}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}

function Header() {
  return (
    <div className="flex flex-wrap items-start justify-between gap-3">
      <div>
        <h1 className="font-display text-3xl font-semibold">Event day checklist</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Complete checklist items for events you're rostered on. You can only tick items for your own assigned bookings.
        </p>
      </div>
      <Badge variant="outline" className="gap-1.5">
        <ClipboardList className="h-3.5 w-3.5" /> Assigned bookings only
      </Badge>
    </div>
  );
}

function ChecklistRow({
  item,
  myRoleId,
  onToggle,
}: {
  item: ChecklistItem;
  myRoleId: string | null;
  onToggle: (item: ChecklistItem, checked: boolean) => void;
}) {
  // A staff member can complete items that either target their role or are shared (no role).
  const canComplete = !myRoleId ? false : item.staff_role_id === null || item.staff_role_id === myRoleId;
  const roleLabel = item.staff_roles?.name;

  return (
    <div
      className={`flex items-start gap-3 rounded-md border p-3 transition ${
        item.completed ? "bg-muted/40" : "bg-background"
      }`}
    >
      <Checkbox
        className="mt-0.5"
        checked={item.completed}
        disabled={!canComplete}
        onCheckedChange={(v) => onToggle(item, !!v)}
        aria-label={item.item}
      />
      <div className="min-w-0 flex-1">
        <div className={`text-sm font-medium ${item.completed ? "text-muted-foreground line-through" : ""}`}>
          {item.item}
        </div>
        {item.note && <div className="mt-0.5 text-xs text-muted-foreground">{item.note}</div>}
        <div className="mt-1.5 flex flex-wrap items-center gap-1.5">
          {roleLabel ? (
            <Badge variant="secondary" className="text-[10px]">{roleLabel}</Badge>
          ) : (
            <Badge variant="outline" className="text-[10px]">Shared</Badge>
          )}
          {item.completed && item.completed_at && (
            <span className="text-[10px] text-muted-foreground">
              Done {format(parseISO(item.completed_at), "d MMM · HH:mm")}
            </span>
          )}
          {!canComplete && !item.completed && (
            <span className="text-[10px] text-muted-foreground">Assigned to another role</span>
          )}
        </div>
      </div>
    </div>
  );
}

function Info({ label, icon, children }: { label: string; icon?: React.ReactNode; children: React.ReactNode }) {
  return (
    <div>
      <div className="text-[10px] font-medium uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-0.5 inline-flex items-center gap-1.5 text-sm">{icon}{children}</div>
    </div>
  );
}
