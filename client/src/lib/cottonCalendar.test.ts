import { describe, expect, it } from "vitest";
import { buildCottonCalendar, isValidCalendarDate } from "./cottonCalendar";

describe("date-driven cotton calendar", () => {
  it("generates calendar dates from the selected sowing date, including leap years", () => {
    const leapCalendar = buildCottonCalendar("2024-02-29");
    expect(leapCalendar.find((task) => task.id === "sowing")?.startDate).toBe("2024-02-29");
    expect(leapCalendar.find((task) => task.id === "seedling-check")?.startDate).toBe("2024-03-05");
    expect(leapCalendar.find((task) => task.id === "land-preparation")?.startDate).toBe("2024-02-08");

    const secondCalendar = buildCottonCalendar("2025-11-20");
    expect(secondCalendar.find((task) => task.id === "sowing")?.startDate).toBe("2025-11-20");
    expect(secondCalendar.find((task) => task.id === "sowing")?.startDate).not.toBe(
      leapCalendar.find((task) => task.id === "sowing")?.startDate,
    );
  });

  it("preserves editable offsets and completion state when dates are recalculated", () => {
    const original = buildCottonCalendar("2025-06-01");
    const completed = original.map((task) =>
      task.id === "squaring" ? { ...task, completed: true, dasStart: 50, dasEnd: 70 } : task,
    );
    const recalculated = buildCottonCalendar("2025-06-10", completed);
    expect(recalculated.find((task) => task.id === "squaring")).toMatchObject({
      dasStart: 50,
      dasEnd: 70,
      startDate: "2025-07-30",
      completed: true,
    });
  });

  it("rejects invalid dates and reversed planning ranges", () => {
    expect(isValidCalendarDate("2025-02-29")).toBe(false);
    expect(() => buildCottonCalendar("2025-02-29")).toThrow(/valid sowing date/);
    expect(() =>
      buildCottonCalendar("2025-06-01", [
        {
          ...buildCottonCalendar("2025-06-01")[0],
          dasStart: 10,
          dasEnd: 2,
        },
      ]),
    ).toThrow(/Invalid DAS range/);
  });
});
