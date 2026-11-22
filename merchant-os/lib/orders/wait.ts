/** How long an order has waited for its confirmation call, and how urgent that is. */
export type WaitLevel = "ok" | "mid" | "late";

// A COD customer cools off fast: under an hour is fine, past four hours the order is at risk.
export const waitThresholds = { midMinutes: 60, lateMinutes: 240 } as const;

export function waitMinutes(since: string, now = Date.now()): number {
  return Math.max(0, Math.floor((now - Date.parse(since)) / 60000));
}

export function waitLevel(minutes: number): WaitLevel {
  if (minutes >= waitThresholds.lateMinutes) return "late";
  if (minutes >= waitThresholds.midMinutes) return "mid";
  return "ok";
}

/** Hours and minutes, or days and hours past a day. */
export function waitParts(minutes: number): { days: number; hours: number; minutes: number } {
  const days = Math.floor(minutes / 1440);
  const hours = Math.floor((minutes % 1440) / 60);
  return { days, hours, minutes: days > 0 ? 0 : minutes % 60 };
}
