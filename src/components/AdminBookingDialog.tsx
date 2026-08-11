import { useMemo, useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { Loader2, Plus } from "lucide-react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { createAdminBooking } from "@/lib/admin-bookings.functions";
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

type Mode = "booking" | "internal";

const TECH_FIELDS = [
  { key: "sound_system", label: "Sound system" },
  { key: "av_screens", label: "AV screens" },
  { key: "theatre_lighting", label: "Theatre lighting" },
  { key: "seating_changes", label: "Seating changes" },
  { key: "remove_drums", label: "Remove drums" },
  { key: "food_served", label: "Food served" },
] as const;

type TechKey = (typeof TECH_FIELDS)[number]["key"];

export function AdminBookingDialog({ onCreated }: { onCreated?: (id: string) => void }) {
  const qc = useQueryClient();
  const create = useServerFn(createAdminBooking);
  const [open, setOpen] = useState(false);
  const [mode, setMode] = useState<Mode>("booking");

  const [eventName, setEventName] = useState("");
  const [eventDate, setEventDate] = useState("");
  const [bumpIn, setBumpIn] = useState("09:00");
  const [bumpOut, setBumpOut] = useState("15:00");
  const [attendance, setAttendance] = useState("");
  const [contactName, setContactName] = useState("");
  const [organisation, setOrganisation] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [notes, setNotes] = useState("");
  const [adminNotes, setAdminNotes] = useState("");
  const [roomIds, setRoomIds] = useState<string[]>([]);
  const [tech, setTech] = useState<Record<TechKey, boolean>>({
    sound_system: false,
    av_screens: false,
    theatre_lighting: false,
    seating_changes: false,
    remove_drums: false,
    food_served: false,
  });

  const roomsQ = useQuery({
    queryKey: ["admin", "rooms", "active"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("rooms")
        .select("id, name, slug")
        .eq("active", true)
        .order("sort_order");
      if (error) throw error;
      return data;
    },
  });

  const kitchenSelected = useMemo(() => {
    const kitchen = (roomsQ.data ?? []).find((r) => r.slug === "kitchen");
    return kitchen ? roomIds.includes(kitchen.id) : false;
  }, [roomsQ.data, roomIds]);

  function reset() {
    setEventName("");
    setEventDate("");
    setBumpIn("09:00");
    setBumpOut("15:00");
    setAttendance("");
    setContactName("");
    setOrganisation("");
    setEmail("");
    setPhone("");
    setNotes("");
    setAdminNotes("");
    setRoomIds([]);
    setTech({
      sound_system: false,
      av_screens: false,
      theatre_lighting: false,
      seating_changes: false,
      remove_drums: false,
      food_served: false,
    });
  }

  const mutation = useMutation({
    mutationFn: async () => {
      return create({
        data: {
          entry_type: mode,
          event_name: eventName,
          event_date: eventDate,
          bump_in: bumpIn,
          bump_out: bumpOut,
          selected_room_ids: roomIds,
          attendance: attendance ? Number(attendance) : undefined,
          notes: notes || undefined,
          admin_notes: adminNotes || undefined,
          contact_name: mode === "booking" ? contactName : undefined,
          organisation: mode === "booking" ? organisation || undefined : undefined,
          email: mode === "booking" ? email : undefined,
          phone: mode === "booking" ? phone || undefined : undefined,
          kitchen: mode === "booking" ? kitchenSelected : false,
          food_served: mode === "booking" ? tech.food_served : false,
          sound_system: mode === "booking" ? tech.sound_system : false,
          av_screens: mode === "booking" ? tech.av_screens : false,
          theatre_lighting: mode === "booking" ? tech.theatre_lighting : false,
          seating_changes: mode === "booking" ? tech.seating_changes : false,
          remove_drums: mode === "booking" ? tech.remove_drums : false,
          extra_staff_count: 0,
        },
      });
    },
    onSuccess: (res) => {
      toast.success(
        mode === "internal" ? "Internal block added" : `Booking ${res.reference} created`,
      );
      qc.invalidateQueries({ queryKey: ["admin"] });
      setOpen(false);
      reset();
      onCreated?.(res.id);
    },
    onError: (err: unknown) => {
      toast.error(err instanceof Error ? err.message : "Could not create entry");
    },
  });

  const valid =
    eventName.trim() &&
    eventDate &&
    bumpIn &&
    bumpOut &&
    roomIds.length > 0 &&
    (mode === "internal" || (contactName.trim() && email.trim()));

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm">
          <Plus className="mr-1.5 h-4 w-4" /> Add entry
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[90vh] overflow-y-auto sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle>Add calendar entry</DialogTitle>
          <DialogDescription>
            Create a customer booking with pricing, or block rooms for an internal church event.
          </DialogDescription>
        </DialogHeader>

        <div className="inline-flex overflow-hidden rounded-md border border-border">
          {(["booking", "internal"] as Mode[]).map((m) => (
            <button
              key={m}
              type="button"
              onClick={() => setMode(m)}
              className={`px-3 py-1.5 text-sm transition ${
                mode === m
                  ? "bg-primary text-primary-foreground"
                  : "bg-background text-muted-foreground hover:bg-muted"
              }`}
            >
              {m === "booking" ? "Customer booking" : "Internal block"}
            </button>
          ))}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <div className="sm:col-span-2">
            <Label htmlFor="ab-name">Event name</Label>
            <Input id="ab-name" value={eventName} onChange={(e) => setEventName(e.target.value)} maxLength={200} />
          </div>
          <div>
            <Label htmlFor="ab-date">Date</Label>
            <Input id="ab-date" type="date" value={eventDate} onChange={(e) => setEventDate(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ab-att">Expected attendance</Label>
            <Input
              id="ab-att"
              type="number"
              min={0}
              value={attendance}
              onChange={(e) => setAttendance(e.target.value)}
            />
          </div>
          <div>
            <Label htmlFor="ab-in">{mode === "internal" ? "Start" : "Bump in"}</Label>
            <Input id="ab-in" type="time" value={bumpIn} onChange={(e) => setBumpIn(e.target.value)} />
          </div>
          <div>
            <Label htmlFor="ab-out">{mode === "internal" ? "End" : "Bump out"}</Label>
            <Input id="ab-out" type="time" value={bumpOut} onChange={(e) => setBumpOut(e.target.value)} />
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
              {(roomsQ.data ?? []).map((r) => (
                <label
                  key={r.id}
                  className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm"
                >
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

        {mode === "booking" && (
          <>
            <div className="grid gap-4 sm:grid-cols-2">
              <div>
                <Label htmlFor="ab-contact">Contact name</Label>
                <Input id="ab-contact" value={contactName} onChange={(e) => setContactName(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ab-org">Organisation</Label>
                <Input id="ab-org" value={organisation} onChange={(e) => setOrganisation(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ab-email">Email</Label>
                <Input id="ab-email" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
              </div>
              <div>
                <Label htmlFor="ab-phone">Phone</Label>
                <Input id="ab-phone" value={phone} onChange={(e) => setPhone(e.target.value)} />
              </div>
            </div>

            <div>
              <Label>Requirements</Label>
              <div className="mt-2 grid gap-2 sm:grid-cols-3">
                {TECH_FIELDS.map((f) => (
                  <label
                    key={f.key}
                    className="flex cursor-pointer items-center gap-2 rounded-md border border-border p-2 text-sm"
                  >
                    <Checkbox
                      checked={tech[f.key]}
                      onCheckedChange={(c) => setTech((prev) => ({ ...prev, [f.key]: Boolean(c) }))}
                    />
                    {f.label}
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <Label htmlFor="ab-notes">Notes</Label>
            <Textarea id="ab-notes" value={notes} onChange={(e) => setNotes(e.target.value)} rows={3} />
          </div>
          <div>
            <Label htmlFor="ab-admin-notes">Internal notes</Label>
            <Textarea
              id="ab-admin-notes"
              value={adminNotes}
              onChange={(e) => setAdminNotes(e.target.value)}
              rows={3}
            />
          </div>
        </div>

        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)}>
            Cancel
          </Button>
          <Button disabled={!valid || mutation.isPending} onClick={() => mutation.mutate()}>
            {mutation.isPending && <Loader2 className="mr-1.5 h-4 w-4 animate-spin" />}
            {mode === "internal" ? "Add block" : "Create booking"}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
