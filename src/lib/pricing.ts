// Quote calculation engine for Dreambuilders venue hire.
// Pricing rules mirror the 2026 v1.1 hire contract.

export type Room = {
  id: string;
  slug: string;
  name: string;
  hourly_rate: number;
  min_hours: number;
  bond: number;
  includes_staff: boolean;
  includes_cleaning: boolean;
};

export type Extra = {
  id: string;
  slug: string;
  name: string;
  pricing_type: "flat" | "per_hour" | "per_hour_per_person";
  amount: number;
  min_hours: number;
};

export type QuoteInput = {
  bumpIn: string; // "HH:MM"
  bumpOut: string;
  selectedRoomIds: string[]; // excludes kitchen
  kitchen: boolean;
  foodServed: boolean;
  seatingChanges: boolean;
  removeDrums: boolean;
  extraStaffCount: number;
};

export type QuoteLine = { label: string; amount: number; detail?: string };
export type QuoteResult = {
  hours: number;
  roomLines: QuoteLine[];
  extrasLines: QuoteLine[];
  cleaningLines: QuoteLine[];
  requiredStaffLines: QuoteLine[];
  staffLines: QuoteLine[];
  roomSubtotal: number;
  extrasSubtotal: number;
  cleaningSubtotal: number;
  requiredStaffSubtotal: number;
  staffSubtotal: number;
  bond: number;
  subtotalExBond: number;
  depositAmount: number;
  totalAmount: number;
};

export const FOH_MANAGER_RATE = 80;
export const FOH_MANAGER_MIN_HOURS = 4;


const EXTRA_CREW_RATE = 80;
const EXTRA_CREW_MIN_HOURS = 4;
const EXTRA_CLEANING_RATE = 80;
const EXTRA_CLEANING_MIN_HOURS = 3;
const SEATING_FEE = 200;
const DRUMS_FEE = 200;
const KITCHEN_FEE = 250;

export function hoursBetween(from: string, to: string): number {
  if (!from || !to) return 0;
  const [fh, fm] = from.split(":").map(Number);
  const [th, tm] = to.split(":").map(Number);
  let mins = th * 60 + tm - (fh * 60 + fm);
  if (mins <= 0) mins += 24 * 60; // overnight
  return mins / 60;
}

export function calculateQuote(
  input: QuoteInput,
  rooms: Room[],
): QuoteResult {
  const rawHours = hoursBetween(input.bumpIn, input.bumpOut);
  const hours = Math.round(rawHours * 100) / 100;

  const selectedRooms = rooms.filter((r) => input.selectedRoomIds.includes(r.id));

  // Room subtotals — each room enforces its own minimum hours
  const roomLines: QuoteLine[] = [];
  let roomSubtotal = 0;
  let bond = 0;
  let anyIncludesCleaning = false;
  for (const r of selectedRooms) {
    const chargeHours = Math.max(hours, r.min_hours);
    const line = chargeHours * r.hourly_rate;
    roomLines.push({
      label: r.name,
      amount: line,
      detail: `${chargeHours}h × $${r.hourly_rate}/hr (min ${r.min_hours}h)`,
    });
    roomSubtotal += line;
    bond = Math.max(bond, r.bond);
    if (r.includes_cleaning) anyIncludesCleaning = true;
  }

  // Kitchen: only chargeable when hired alongside another room
  const extrasLines: QuoteLine[] = [];
  let extrasSubtotal = 0;
  if (input.kitchen && selectedRooms.length > 0) {
    extrasLines.push({ label: "Kitchen", amount: KITCHEN_FEE, detail: "Flat fee" });
    extrasSubtotal += KITCHEN_FEE;
  }
  if (input.seatingChanges) {
    extrasLines.push({ label: "Extra / changed auditorium seating", amount: SEATING_FEE, detail: "Flat fee" });
    extrasSubtotal += SEATING_FEE;
  }
  if (input.removeDrums) {
    extrasLines.push({ label: "Remove drums from stage", amount: DRUMS_FEE, detail: "Flat fee" });
    extrasSubtotal += DRUMS_FEE;
  }

  // Cleaning — only when food is served AND cleaning isn't already included
  const cleaningLines: QuoteLine[] = [];
  let cleaningSubtotal = 0;
  if (input.foodServed) {
    const cleanHours = Math.max(hours, EXTRA_CLEANING_MIN_HOURS);
    const amt = cleanHours * EXTRA_CLEANING_RATE;
    cleaningLines.push({
      label: "Additional cleaning (food served)",
      amount: amt,
      detail: `${cleanHours}h × $${EXTRA_CLEANING_RATE}/hr (min ${EXTRA_CLEANING_MIN_HOURS}h)`,
    });
    cleaningSubtotal += amt;
    if (anyIncludesCleaning) {
      // Note: basic cleaning is included with the auditorium, additional food cleaning is on top.
    }
  }

  // Required staff — Front of House Manager is included on every booking
  const requiredStaffLines: QuoteLine[] = [];
  const fohHours = Math.max(hours, FOH_MANAGER_MIN_HOURS);
  const fohAmount = fohHours * FOH_MANAGER_RATE;
  requiredStaffLines.push({
    label: "Hire Front of House Manager",
    amount: fohAmount,
    detail: `${fohHours}h × $${FOH_MANAGER_RATE}/hr (min ${FOH_MANAGER_MIN_HOURS}h)`,
  });
  const requiredStaffSubtotal = fohAmount;

  // Staff — extra crew
  const staffLines: QuoteLine[] = [];
  let staffSubtotal = 0;
  if (input.extraStaffCount > 0) {
    const staffHours = Math.max(hours, EXTRA_CREW_MIN_HOURS);
    const amt = input.extraStaffCount * staffHours * EXTRA_CREW_RATE;
    staffLines.push({
      label: `Extra Dreambuilders crew × ${input.extraStaffCount}`,
      amount: amt,
      detail: `${staffHours}h × $${EXTRA_CREW_RATE}/hr/person (min ${EXTRA_CREW_MIN_HOURS}h)`,
    });
    staffSubtotal += amt;
  }

  const subtotalExBond =
    roomSubtotal + extrasSubtotal + cleaningSubtotal + requiredStaffSubtotal + staffSubtotal;
  const depositAmount = Math.round(subtotalExBond * 0.2 * 100) / 100;
  const totalAmount = Math.round((subtotalExBond + bond) * 100) / 100;

  return {
    hours,
    roomLines,
    extrasLines,
    cleaningLines,
    requiredStaffLines,
    staffLines,
    roomSubtotal,
    extrasSubtotal,
    cleaningSubtotal,
    requiredStaffSubtotal,
    staffSubtotal,
    bond,
    subtotalExBond,
    depositAmount,
    totalAmount,
  };
}


export const money = (n: number) =>
  new Intl.NumberFormat("en-AU", { style: "currency", currency: "AUD" }).format(n);
