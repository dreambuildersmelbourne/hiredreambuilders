import { Users } from "lucide-react";

import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { StaffAssignmentPicker } from "@/components/StaffAssignmentPicker";

type BookingBrief = {
  id: string;
  reference: string;
  event_name: string;
  event_date: string;
};

export function RoleAssignmentModal({
  open,
  onOpenChange,
  booking,
}: {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  booking: BookingBrief | null;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" /> Assign staff
          </DialogTitle>
          <DialogDescription>
            {booking ? (
              <>
                <span className="font-medium text-foreground">{booking.event_name}</span> · {booking.reference}
              </>
            ) : (
              "Select a booking"
            )}
          </DialogDescription>
        </DialogHeader>

        {booking && <StaffAssignmentPicker bookingId={booking.id} />}

        <DialogFooter>
          <Button variant="outline" onClick={() => onOpenChange(false)}>
            Close
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
