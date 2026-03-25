/** Parse backend event row into start/end Dates (local). */
export function eventDateRange(ev) {
  const s = new Date(`${ev.event_date}T${ev.event_time}:00`);
  const e = new Date(`${ev.end_date}T${ev.end_time}:00`);
  return { start: s, end: e };
}

export function extractCalendarColor(tags) {
  if (!tags || typeof tags !== "string") return "blue";
  const parts = tags.split(",").map((t) => t.trim());
  const tag = parts.find((t) => t.startsWith("__calcolor__:"));
  if (!tag) return "blue";
  return tag.replace("__calcolor__:", "") || "blue";
}

/** @returns {'personal' | 'group' | null} */
export function extractCalendarScope(tags) {
  if (!tags || typeof tags !== "string") return null;
  const parts = tags.split(",").map((t) => t.trim());
  const tag = parts.find((t) => t.startsWith("__calscope__:"));
  if (!tag) return null;
  const v = tag.replace("__calscope__:", "").toLowerCase();
  if (v === "personal") return "personal";
  if (v === "group") return "group";
  return null;
}

/** @returns {'public' | 'private' | null} */
export function extractCalendarVisibility(tags) {
  if (!tags || typeof tags !== "string") return null;
  const parts = tags.split(",").map((t) => t.trim());
  const tag = parts.find((t) => t.startsWith("__calvisibility__:"));
  if (!tag) return null;
  const v = tag.replace("__calvisibility__:", "").toLowerCase();
  if (v === "public") return "public";
  if (v === "private") return "private";
  return null;
}

export const CALENDAR_COLOR_SWATCHES = [
  { key: "blue", hex: "#3182CE" },
  { key: "green", hex: "#38A169" },
  { key: "yellow", hex: "#D69E2E" },
  { key: "purple", hex: "#805AD5" },
  { key: "pink", hex: "#D53F8C" },
  { key: "red", hex: "#E53E3E" },
  { key: "cyan", hex: "#00B5D8" },
  { key: "orange", hex: "#DD6B20" },
];

export function colorHexForKey(key) {
  const found = CALENDAR_COLOR_SWATCHES.find((c) => c.key === key);
  return found ? found.hex : "#3182CE";
}

export function contactHue(userId) {
  const n = Number(userId) || 0;
  return (n * 47) % 360;
}

export function sameDay(d1, d2) {
  return (
    d1.getFullYear() === d2.getFullYear() &&
    d1.getMonth() === d2.getMonth() &&
    d1.getDate() === d2.getDate()
  );
}

export function startOfWeekMonday(d) {
  const x = new Date(d);
  const day = x.getDay();
  const diff = day === 0 ? -6 : 1 - day;
  x.setDate(x.getDate() + diff);
  x.setHours(0, 0, 0, 0);
  return x;
}

export function addDays(d, n) {
  const x = new Date(d);
  x.setDate(x.getDate() + n);
  return x;
}

export function startOfCalendarDay(d) {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}

/** Midnight at the start of the next calendar day (exclusive end of `d`). */
export function endOfCalendarDayExclusive(d) {
  const x = startOfCalendarDay(d);
  x.setDate(x.getDate() + 1);
  return x;
}

/** True if the event intersects the local calendar day of `day`. */
export function eventOverlapsCalendarDay(ev, day) {
  const { start, end } = eventDateRange(ev);
  const day0 = startOfCalendarDay(day);
  const day1 = endOfCalendarDayExclusive(day);
  return start < day1 && end > day0;
}

/**
 * Clip event to this calendar day for day-column rendering.
 * @returns {{ segStart: Date, segEnd: Date } | null}
 */
export function visibleSegmentOnDay(ev, day) {
  const { start, end } = eventDateRange(ev);
  const day0 = startOfCalendarDay(day);
  const day1 = endOfCalendarDayExclusive(day);
  const segStart = start > day0 ? start : day0;
  const segEnd = end < day1 ? end : day1;
  if (segEnd <= segStart) return null;
  return { segStart, segEnd };
}

export function formatDayHeader(d) {
  return d.toLocaleDateString(undefined, {
    weekday: "long",
    day: "numeric",
    month: "long",
    year: "numeric",
  });
}

export function formatShortDayTime(d) {
  const now = new Date();
  if (sameDay(d, now)) {
    return `Today, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
  }
  return `${d.toLocaleDateString(undefined, { day: "numeric", month: "short" })}, ${d.toLocaleTimeString(undefined, { hour: "numeric", minute: "2-digit" })}`;
}

export function durationMinutes(ev) {
  const { start, end } = eventDateRange(ev);
  return Math.max(1, Math.round((end - start) / 60000));
}

/** End date/time for sidebar and grid labels (e.g. "Today, 10:00 PM"). */
export function formatShortEndTime(ev) {
  const { end } = eventDateRange(ev);
  return formatShortDayTime(end);
}

/** Column placement for overlapping intervals (greedy by start time). */
export function layoutOverlapsWithSegments(segments) {
  const items = [...segments].sort((a, b) => a.startMs - b.startMs);

  const layouts = [];
  const colEnds = [];

  items.forEach(({ event: ev, startMs, endMs }) => {
    let col = 0;
    while (col < colEnds.length && colEnds[col] > startMs) {
      col += 1;
    }
    if (col === colEnds.length) {
      colEnds.push(endMs);
    } else {
      colEnds[col] = endMs;
    }
    layouts.push({ event: ev, col });
  });

  const maxCol = Math.max(1, colEnds.length);
  layouts.forEach((L) => {
    L.widthPct = 100 / maxCol;
    L.leftPct = (L.col * 100) / maxCol;
    L.rowCols = maxCol;
  });
  return layouts;
}

export function layoutOverlaps(dayEvents) {
  return layoutOverlapsWithSegments(
    dayEvents.map((ev) => {
      const { start, end } = eventDateRange(ev);
      return { event: ev, startMs: start.getTime(), endMs: end.getTime() };
    })
  );
}
