# Admin booking calendar by room + manual entries

## What you'll get

**1. Room view on the admin calendar**

A new "Rooms" view mode next to Month / Week / Day / List:

```text
              Mon 10   Tue 11   Wed 12   Thu 13   Fri 14
Main Aud.     [CONF]            [TENT]
Function 2             [EST]             [CONF]
Lounge                                            [BLOCK]
Kitchen       [CONF]
```

- Each room is a row, each day of the visible week/month a column.
- Cells show colour-coded status chips (Estimate, Tentative, Pending, Confirmed, Cancelled, Completed) using the existing calendar colour system.
- Clicking a chip opens that booking's admin record.
- Bookings using multiple rooms appear once per room row, so double-bookings are obvious at a glance.

**2. Room and status filters on all views**

Filter chips above the calendar: filter by room (multi-select) and by status. These apply to Month, Week, Day, List and the new Rooms view.

**3. Manually add entries from the admin area**

An "Add entry" button on the admin calendar opens a dialog with two modes:

- **Booking** — full details: customer name/email/phone/organisation, event name, date, bump in/out, rooms, attendance, extras and requirements, notes. Pricing is calculated with the same engine used by the public estimate form, and the admin picks the starting status (e.g. Confirmed for a phoned-in booking). Costs can still be overridden afterwards on the booking page.
- **Internal block** — quick form: title, date, bump in/out, rooms, optional notes. No customer, no pricing. Used to reserve rooms for church/internal events. Shown on the calendar in a distinct neutral "Internal" colour and excluded from revenue/enquiry lists.

Both types appear on the calendar, in the room grid, and in the ICS calendar feed (internal blocks included so rooms show as busy).

## Technical notes

**Database migration**
- `bookings.entry_type` text, default `'booking'`, check in (`'booking'`, `'internal'`).
- `bookings.customer_id` made nullable (required only when `entry_type = 'booking'`, enforced by a trigger).
- `bookings.created_by uuid` to record which admin created a manual entry.
- New RLS policies: admin/staff may insert and update `bookings`, `booking_rooms`, `booking_extras`, `booking_staff` via `private.has_role`. Existing public 15-minute insert window stays untouched.
- Reference generation for manual entries reuses the existing reference format.

**Code**
- `src/lib/calendar-status.ts`: add an `internal` status bucket with its own label/colour, and map `entry_type = 'internal'` to it.
- `src/components/BookingCalendar.tsx`: add `rooms` view mode (room rows × date columns), plus room/status filter props; keep existing views intact.
- New `src/components/AdminBookingDialog.tsx`: the two-mode create form (zod-validated), reusing `QuoteRoomPicker` room data and `src/lib/pricing.ts` for the booking mode.
- New `src/lib/admin-bookings.functions.ts`: `createAdminBooking` server function behind `requireSupabaseAuth`, verifying admin/staff role, computing pricing server-side, and inserting the booking with its room/extra/staff lines in one call.
- `src/routes/_authenticated/admin.calendar.tsx`: fetch rooms alongside bookings, render filters, view switch and the Add entry button.
- `src/routes/api/public/calendar.$token.feed[.]ics.ts`: include internal blocks, titled `[INTERNAL] Title - Rooms`.
- `src/routes/_authenticated/staff.calendar.tsx` and `admin.bookings.$id.tsx`: tolerate rows with no customer so internal blocks render safely.
