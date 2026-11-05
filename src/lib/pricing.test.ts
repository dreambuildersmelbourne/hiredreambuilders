import { describe, test } from "node:test";
import { strict as assert } from "node:assert";
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
    assert.equal(calculateQuote(input, [room]).extrasSubtotal, 250);
  });
  test("serving food adds extra cleaning even when basic cleaning is included", () => {
    assert.equal(calculateQuote(input, [room]).cleaningSubtotal, 320);
  });
  test("selecting kitchen and food does not double-charge the kitchen", () => {
    assert.equal(calculateQuote({ ...input, kitchen: true }, [room]).extrasSubtotal, 250);
  });
  test("no food and no kitchen adds neither charge", () => {
    const quote = calculateQuote({ ...input, foodServed: false }, [room]);
    assert.equal(quote.extrasSubtotal, 0);
    assert.equal(quote.cleaningSubtotal, 0);
  });
});

describe("bond", () => {
  test("bond is a flat $2,000 regardless of the room's stored bond", () => {
    assert.equal(calculateQuote(input, [room]).bond, 2000);
  });
  test("bond is $2,000 even with several rooms of differing bonds", () => {
    const other: Room = { ...room, id: "hall", name: "Hall", bond: 1200 };
    assert.equal(calculateQuote(input, [room, other]).bond, 2000);
  });
  test("bond is $0 when no rooms are selected", () => {
    assert.equal(calculateQuote(input, [room]).bond > 0 && calculateQuote({ ...input, selectedRoomIds: [] }, [room]).bond, 0);
  });
});