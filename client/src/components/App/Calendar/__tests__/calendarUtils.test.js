import {
  extractCalendarScope,
  extractCalendarVisibility,
  eventOverlapsCalendarDay,
  visibleSegmentOnDay,
} from "../calendarUtils";

describe("calendarUtils", () => {
  test("extracts scope and visibility tags", () => {
    const tags = "__calendar__, __calcolor__:blue, __calscope__:group, __calvisibility__:private";
    expect(extractCalendarScope(tags)).toBe("group");
    expect(extractCalendarVisibility(tags)).toBe("private");
  });

  test("returns null when scope/visibility tag not present", () => {
    expect(extractCalendarScope("foo,bar")).toBeNull();
    expect(extractCalendarVisibility("foo,bar")).toBeNull();
  });

  test("eventOverlapsCalendarDay is true for multi-day events", () => {
    const ev = {
      event_date: "2026-03-25",
      event_time: "23:00",
      end_date: "2026-03-26",
      end_time: "02:00",
    };
    expect(eventOverlapsCalendarDay(ev, new Date("2026-03-25T12:00:00"))).toBe(true);
    expect(eventOverlapsCalendarDay(ev, new Date("2026-03-26T12:00:00"))).toBe(true);
    expect(eventOverlapsCalendarDay(ev, new Date("2026-03-27T12:00:00"))).toBe(false);
  });

  test("visibleSegmentOnDay clips event to midnight boundaries", () => {
    const ev = {
      event_date: "2026-03-25",
      event_time: "22:00",
      end_date: "2026-03-26",
      end_time: "03:30",
    };

    const segDay1 = visibleSegmentOnDay(ev, new Date("2026-03-25T12:00:00"));
    const segDay2 = visibleSegmentOnDay(ev, new Date("2026-03-26T12:00:00"));

    expect(segDay1).not.toBeNull();
    expect(segDay2).not.toBeNull();
    expect(segDay1.segStart.getHours()).toBe(22);
    expect(segDay1.segEnd.getHours()).toBe(0);
    expect(segDay2.segStart.getHours()).toBe(0);
    expect(segDay2.segEnd.getHours()).toBe(3);
    expect(segDay2.segEnd.getMinutes()).toBe(30);
  });
});

