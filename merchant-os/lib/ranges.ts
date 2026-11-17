// Date ranges as Moroccan calendar days (YYYY-MM-DD, inclusive), matching
// the report functions in the database.
import { businessDay } from "@/lib/datetime";

export const rangePresets = ["today", "7d", "30d", "month", "last_month"] as const;
export type RangePreset = (typeof rangePresets)[number];

function shift(day: string, days: number): string {
  const d = new Date(`${day}T12:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

export function resolveRange(preset: RangePreset, now: Date = new Date()): { from: string; to: string } {
  const today = businessDay(now);
  switch (preset) {
    case "today":
      return { from: today, to: today };
    case "7d":
      return { from: shift(today, -6), to: today };
    case "30d":
      return { from: shift(today, -29), to: today };
    case "month":
      return { from: `${today.slice(0, 8)}01`, to: today };
    case "last_month": {
      const firstThis = `${today.slice(0, 8)}01`;
      const lastPrev = shift(firstThis, -1);
      return { from: `${lastPrev.slice(0, 8)}01`, to: lastPrev };
    }
  }
}

export function parsePreset(value: unknown, fallback: RangePreset = "30d"): RangePreset {
  return rangePresets.find((p) => p === value) ?? fallback;
}

/** Monday of the ISO week containing `day` (YYYY-MM-DD). */
export function weekStart(day: string): string {
  const d = new Date(`${day}T12:00:00Z`);
  const dow = (d.getUTCDay() + 6) % 7;
  return shift(day, -dow);
}

export function weekRange(offsetWeeks: number, now: Date = new Date()): { from: string; to: string } {
  const monday = shift(weekStart(businessDay(now)), -7 * offsetWeeks);
  return { from: monday, to: shift(monday, 6) };
}

export function monthRange(offsetMonths: number, now: Date = new Date()): { from: string; to: string } {
  const today = businessDay(now);
  const d = new Date(`${today.slice(0, 7)}-01T12:00:00Z`);
  d.setUTCMonth(d.getUTCMonth() - offsetMonths);
  const from = d.toISOString().slice(0, 10);
  const next = new Date(d);
  next.setUTCMonth(next.getUTCMonth() + 1);
  return { from, to: shift(next.toISOString().slice(0, 10), -1) };
}
