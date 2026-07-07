// Shared booking status metadata and document kinds.

export const BOOKING_STATUSES = [
  { v: "enquiry", label: "New enquiry", className: "bg-brand/15 text-brand border-brand/30" },
  { v: "reviewing", label: "Reviewing", className: "bg-accent text-accent-foreground border-accent" },
  { v: "info_requested", label: "Info requested", className: "bg-amber-100 text-amber-900 border-amber-300" },
  { v: "approved", label: "Approved", className: "bg-emerald-100 text-emerald-900 border-emerald-300" },
  { v: "rejected", label: "Rejected", className: "bg-destructive/10 text-destructive border-destructive/30" },
  { v: "staffing_confirmed", label: "Staffing confirmed", className: "bg-primary/10 text-primary border-primary/30" },
  { v: "invoiced", label: "Invoiced", className: "bg-primary/10 text-primary border-primary/30" },
  { v: "deposit_paid", label: "Deposit paid", className: "bg-green-100 text-green-800 border-green-300" },
  { v: "confirmed", label: "Confirmed", className: "bg-green-100 text-green-800 border-green-300" },
  { v: "completed", label: "Completed", className: "bg-muted text-muted-foreground border-border" },
  { v: "cancelled", label: "Cancelled", className: "bg-destructive/10 text-destructive border-destructive/30" },
] as const;

export type BookingStatus = (typeof BOOKING_STATUSES)[number]["v"];

export function statusMeta(v: string) {
  return BOOKING_STATUSES.find((s) => s.v === v) ?? { v, label: v, className: "" };
}

export const DOC_KINDS = [
  {
    v: "public_liability",
    label: "Public liability insurance certificate",
    hint: "Required. Certificate of currency from your insurer.",
  },
  {
    v: "streatrader",
    label: "Streatrader approval",
    hint: "Required only if food will be served or sold.",
  },
  {
    v: "advertising",
    label: "Advertising material",
    hint: "Posters / flyers / social graphics for approval.",
  },
  {
    v: "other",
    label: "Other supporting document",
    hint: "Anything else the hire coordinator has requested.",
  },
] as const;

export type DocKind = (typeof DOC_KINDS)[number]["v"];
