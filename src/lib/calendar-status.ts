// Maps booking DB status + tentative_hold_requested flag to the
// customer-facing calendar status buckets.

export type CalendarStatus =
  | "quote_created"
  | "tentative"
  | "pending_approval"
  | "confirmed"
  | "cancelled"
  | "completed"
  | "internal";


export const CALENDAR_STATUS_META: Record<
  CalendarStatus,
  { label: string; short: string; className: string; dot: string; bar: string }
> = {
  quote_created: {
    label: "Estimate Created",
    short: "ESTIMATE",
    className: "bg-slate-100 text-slate-800 border-slate-300",
    dot: "bg-slate-400",
    bar: "border-l-slate-400 bg-slate-50",
  },
  tentative: {
    label: "Tentative Booking",
    short: "TENTATIVE",
    className: "bg-amber-100 text-amber-900 border-amber-300",
    dot: "bg-amber-500",
    bar: "border-l-amber-500 bg-amber-50",
  },
  pending_approval: {
    label: "Pending Approval",
    short: "PENDING",
    className: "bg-blue-100 text-blue-900 border-blue-300",
    dot: "bg-blue-500",
    bar: "border-l-blue-500 bg-blue-50",
  },
  confirmed: {
    label: "Confirmed Booking",
    short: "CONFIRMED",
    className: "bg-emerald-100 text-emerald-900 border-emerald-300",
    dot: "bg-emerald-500",
    bar: "border-l-emerald-500 bg-emerald-50",
  },
  cancelled: {
    label: "Cancelled",
    short: "CANCELLED",
    className: "bg-red-100 text-red-900 border-red-300",
    dot: "bg-red-500",
    bar: "border-l-red-500 bg-red-50",
  },
  completed: {
    label: "Completed",
    short: "COMPLETED",
    className: "bg-muted text-muted-foreground border-border",
    dot: "bg-muted-foreground/50",
    bar: "border-l-muted-foreground/40 bg-muted",
  },
  internal: {
    label: "Internal block",
    short: "INTERNAL",
    className: "bg-violet-100 text-violet-900 border-violet-300",
    dot: "bg-violet-500",
    bar: "border-l-violet-500 bg-violet-50",
  },
};


export function calendarStatusFor(
  dbStatus: string,
  tentativeHoldRequested?: boolean | null,
  entryType?: string | null,
): CalendarStatus {
  if (entryType === "internal") return "internal";
  if (dbStatus === "completed") return "completed";

  if (dbStatus === "cancelled" || dbStatus === "rejected") return "cancelled";
  if (dbStatus === "confirmed" || dbStatus === "deposit_paid") return "confirmed";
  if (
    dbStatus === "reviewing" ||
    dbStatus === "info_requested" ||
    dbStatus === "approved" ||
    dbStatus === "staffing_confirmed" ||
    dbStatus === "invoiced"
  ) {
    return "pending_approval";
  }
  // enquiry
  if (tentativeHoldRequested) return "tentative";
  return "quote_created";
}

export function calendarEventTitle(
  status: CalendarStatus,
  eventName: string,
  rooms?: string,
) {
  const meta = CALENDAR_STATUS_META[status];
  return `[${meta.short}] ${eventName}${rooms ? ` - ${rooms}` : ""}`;
}
