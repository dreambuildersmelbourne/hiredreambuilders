import { useEffect, useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Pencil } from "lucide-react";
import { toast } from "sonner";

import { supabase } from "@/integrations/supabase/client";
import { updateAdminBooking } from "@/lib/admin-bookings.functions";
import { calculateQuote, money } from "@/lib/pricing";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

const TECH_FIELDS = [
  { key: "sound_system", label: "Sound system" },
  { key: "av_screens", label: "AV screens" },
  { key: "theatre_lighting", label: "Theatre lighting" },
  { key: "seating_changes", label: "Expanded seating" },
  { key: "remove_drums", label: "Remove drums" },
  { key: "food_served", label: "Food served" },
] as const;

type TechKey = (typeof TECH_FIELDS)[number]["key"];

export function EditBookingDialog({ booking, onDone }: { booking: any; onDone: () => void }) {
  const qc = useQueryClient();
  const update = useServerFn(updateAdminBooking);
  const [open, setOpen] = useState(false);

  const isInternal = booking.entry_type === "internal";

  const [eventName, setEventName] = useState(booking.event_name ?? "");
  const [eventDate, setEventDate] = useState(booking.event_date ?? "");
  const [bumpIn, setBumpIn] = useState((booking.bump_in_time ?? "09:00").slice(0, 5));
  const [bumpOut, setBumpOut] = useState((booking.bump_out_time ?? "15:00").slice(0, 5));
  const [attendance, setAttendance] = useState(
    booking.estimated_attendance != null ? String(booking.estimated_attendance) : "",
  );
  const [contactName, setContactName] = useState(booking.customers?.contact_name ?? "");
  const [organisation, setOrganisation] = useState(booking.customers?.organisation ?? "");
  const [email, setEmail] = useState(booking.customers?.email ?? "");
  const [phone, setPhone] = useState(booking.customers?.phone ?? "");
  const [notes, setNotes] = useState(booking.notes ?? "");
  const [extraStaff, setExtraStaff] = useState(String(booking.extra_staff_count ?? 0));
  const [roomIds, setRoomIds] = useState<string[]>(
    (booking.booking_rooms ?? []).map((br: any) => br.room_id),
  );
  const [tech, setTech] = useState<Record<TechKey, boolean>>({
    sound_system: !!booking.sound_system,
    av_screens: !!booking.av_screens,
    theatre_lighting: !!booking.theatre_lighting,
    seating_changes: !!booking.seating_changes,
    remove_drums: !!booking.remove_drums,
    food_served: !!booking.food_served,
  });

  // Re-sync when the dialog is (re)opened after external changes
  useEffect(() => {
    if (!open) return;
    setEventName(booking.event_name ?? "");
    setEventDate(booking.event_date ?? "");
    setBumpIn((booking.bump_in_time ?? "09:00").slice(0, 5));
    setBumpOut((booking.bump_out_time ?? "15:00").slice(0, 5));
    setAttendance(booking.estimated_attendance != null ? String(booking.estimated_attendance) : "");
    setContactName(booking.customers?.contact_name ?? "");
    setOrganisation(booking.customers?.organisation ?? "");
    setEmail(booking.customers?.email ?? "");
    setPhone(booking.customers?.phone ?? "");
    setNotes(booking.notes ?? "");
    setExtraStaff(String(booking.extra_staff_count ?? 0));
    setRoomIds((booking.booking_rooms ?? []).map((br: any) => br.room_id));
    setTech({
      sound_system: !!booking.sound_system,
      av_screens: !!booking.av_screens,
      theatre_lighting: !!booking.theatre_lighting,
      seating_changes: !!booking.seating_changes,
      remove_drums: !!booking.remove_drums,
      food_served: !!booking.food_served,
    });
  }, [open, booking]);

  const roomsQ = useQuery({
    queryKey: ["admin", "rooms", "active", "full"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("*")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
    enabled: open,
  });

  const allRooms = roomsQ.data ?? [];
  const kitchenRoom = allRooms.find((r) => r.slug === "kitchen");
  const kitchenSelected = kitchenRoom ? roomIds.includes(kitchenRoom.id) : false;

  const preview = useMemo(() => {
    if (isInternal || allRooms.length === 0) return null;
    return calculateQuote(
      {
        bumpIn,
        bumpOut,
        selectedRoomIds: roomIds,
        kitchen: kitchenSelected,
        foodServed: tech.food_served,
        seatingChanges: tech.seating_changes,
        removeDrums: tech.remove_drums,
        soundSystem: tech.sound_system,
        avScreens: tech.av_screens,
        theatreLighting: tech.theatre_lighting,
        extraStaffCount: Number(extraStaff) || 0,
      },
      allRooms.filter((r) => r.slug !== "kitchen") as never,
    );
  }, [isInternal, allRooms, bumpIn, bumpOut, roomIds, kitchenSelected, tech, extraStaff]);

  const mutation = useMutation({
    mutationFn: async () =>
      update({
        data: {
          booking_id: booking.id,
          entry_type: isInternal ? "internal" : "booking",
          event_name: eventName,
          event_date: eventDate,
          bump_in: bumpIn,
          bump_out: bumpOut,
          selected_room_ids: roomIds,
          attendance: attendance ? Number(attendance) : undefined,
          notes: notes || undefined,
          contact_name: isInternal ? undefined : contactName,
          organisation: isInternal ? undefined : organisation || undefined,
          email: isInternal ? undefined : email,
          phone: isInternal ? undefined : phone || undefined,
          kitchen: isInternal ? false : kitchenSelected,
          food_served: isInternal ? false : tech.food_served,
          sound_system: isInternal ? false : tech.sound_system,
          av_screens: isInternal ? false : tech.av_screens,
          theatre_lighting: isInternal ? false : tech.theatre_lighting,
          seating_changes: isInternal ? false : tech.seating_changes,
          remove_drums: isInternal ? false : tech.remove_drums,
          extra_staff_count: isInternal ? 0 : Number(extraStaff) || 0,
        },
      }),
    onSuccess: () => {
      toast.success("Enquiry updated and estimate recalculated");
      qc.invalidateQueries({ queryKey: ["admin"] });
      setOpen(false);
      onDone();
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Could not update enquiry");
    },
  });

  const valid =
    eventName.trim() && eventDate && bumpIn && bumpOut && roomIds.length > 0 &&
    (isInternal || (contactName.trim() && email.trim()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" variant="outline">
          <Pencil className="mr-1.5 h-4 w-4" /> Edit enquiry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Edit enquiry</DialogTitle>
          <DialogDescription>
            Change rooms, times, requirements or staff — the estimate is recalculated on save.
            Any manual override or discount applied afterwards will be replaced.
          </DialogDescription>
        </DialogHeader>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="eb-name">Event name</Label>
            <Input id="eb-name" value={eventName} onChange={(e) => setEventName(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="eb-date">Date</Label>
            <Input id="eb-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="eb-att">Expected attendance</Label>
            <Input id="eb-att" type="number" min={0} value={attendance} onChange={(e) => setAttendance(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="eb-in">Bump in</Label>
            <Input id="eb-in" type="time" value={bumpIn} onChange={(e) => setBumpIn(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="eb-out">Bump out</Label>
            <Input id="eb-out" type="time" value={bumpOut} onChange={(e) => setBumpOut(e.target.value)} />
          </div>
        </div>

        <div>
          <Label>Rooms</Label>
          {roomsQ.isLoading ? (
            <div className="mt-2 flex items-center gap-2 text-sm text-muted-foreground">
              <Loader2 className="h-4 w-4 animate-spin" /> Loading rooms…
            </div>
          ) : (
            <div className="mt-2 grid gap-2 sm:grid-cols-3">
              {allRooms.map((r) => (
                <label key={r.id} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm">
                  <Checkbox
                    checked={roomIds.includes(r.id)}
                    onCheckedChange={(c) =>
                      setRoomIds((prev) => (c ? [...prev, r.id] : prev.filter((id) => id !== r.id)))
                    }
                  />
                  {r.name}
                </label>
              ))}
            </div>
          )}
        </div>

        {!isInternal && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="eb-contact">Contact name</Label>
                <Input id="eb-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="eb-org">Organisation</Label>
                <Input id="eb-org" value={organisation} onChange={(e) => setOrganisation(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="eb-email">Email</Label>
                <Input id="eb-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="eb-phone">Phone</Label>
                <Input id="eb-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Requirements</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {TECH_FIELDS.map((f) => (
                  <label key={f.key} className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm">
                    <Checkbox
                      checked={tech[f.key]}
                      onCheckedChange={(c) => setTech((prev) => ({ ...prev, [f.key]: Boolean(c) }))}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>

            <div className="sm:max-w-[220px]">
              <Label htmlFor="eb-staff">Extra crew</Label>
              <Input
                id="eb-staff"
                type="number"
                min={0}
                max={50}
                value={extraStaff}
                onChange={(e) => setExtraStaff(e.target.value)}
              />
            </div>
          </>
        )}

        <div>
          <Label htmlFor="eb-notes">Customer notes</Label>
          <Textarea id="eb-notes" rows={3} value={notes} onChange={(e) => setNotes(e.target.value)} />
        </div>

        {preview && (
          <div className="rounded-md border border-border bg-muted/40 p-3 text-sm">
            <div className="mb-1 text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Recalculated estimate
            </div>
            <div className="flex justify-between"><span>Room hire</span><span>{money(preview.roomSubtotal)}</span></div>
            <div className="flex justify-between"><span>Extras</span><span>{money(preview.extrasSubtotal)}</span></div>
            <div className="flex justify-between"><span>Cleaning</span><span>{money(preview.cleaningSubtotal)}</span></div>
            <div className="flex justify-between">
              <span>Staff</span>
              <span>{money(preview.requiredStaffSubtotal + preview.staffSubtotal)}</span>
            </div>
            <div className="flex justify-between"><span>Bond</span><span>{money(preview.bond)}</span></div>
            <div className="mt-1 flex justify-between border-t border-border pt-1 font-semibold">
              <span>Total</span><span>{money(preview.totalAmount)}</span>
            </div>
          </div>
        )}

        <DialogFooter>
          <Button variant="ghost" onClick={() => setOpen(false)}>Cancel</Button>
          <Button disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            Save changes
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
