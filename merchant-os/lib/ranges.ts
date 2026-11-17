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
