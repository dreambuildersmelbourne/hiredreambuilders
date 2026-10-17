import { describe, expect, test } from "bun:test";
import { calculateQuote, type QuoteInput, type Room } from "./pricing";

const room: Room = {
  id: "auditorium", slug: "main-auditorium", name: "Main Auditorium",
  hourly_rate: 400, min_hours: 4, bond: 500,
  includes_staff: false, includes_cleaning: true,
};
const input: QuoteInput = {
  bumpIn: "09:00", bumpOut: "13:00", selectedRoomIds: [room.id],
  kitchen: false, foodServed: true, seatingChanges: false, removeDrums: false,
  soundSystem: false, avScreens: false, theatreLighting: false, extraStaffCount: 0,
};

describe("mandatory food-service charges", () => {
  test("serving food adds the $250 kitchen fee even when kitchen is not selected", () => {
    expect(calculateQuote(input, [room]).extrasSubtotal).toBe(250);
  });
  test("serving food adds extra cleaning even when basic cleaning is included", () => {
    expect(calculateQuote(input, [room]).cleaningSubtotal).toBe(320);
  });
  test("selecting kitchen and food does not double-charge the kitchen", () => {
    expect(calculateQuote({ ...input, kitchen: true }, [room]).extrasSubtotal).toBe(250);
  });
  test("no food and no kitchen adds neither charge", () => {
    const quote = calculateQuote({ ...input, foodServed: false }, [room]);
    expect(quote.extrasSubtotal).toBe(0);
    expect(quote.cleaningSubtotal).toBe(0);
  });
});