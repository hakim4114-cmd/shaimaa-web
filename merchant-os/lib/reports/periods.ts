// Report periods: a whole month or one of its halves (1–15, 16–end), as
// Moroccan calendar days (YYYY-MM-DD, inclusive).

export type Half = "all" | "1" | "2";
export type ReportPeriod = { month: string; half: Half; from: string; to: string; days: number };

const monthPattern = /^\d{4}-(0[1-9]|1[0-2])$/;

function lastDay(month: string): number {
  const [y, m] = month.split("-").map(Number) as [number, number];
  return new Date(Date.UTC(y, m, 0)).getUTCDate();
}

function shiftMonth(month: string, delta: number): string {
  const [y, m] = month.split("-").map(Number) as [number, number];
  const d = new Date(Date.UTC(y, m - 1 + delta, 1));
  return d.toISOString().slice(0, 7);
}

export function parseHalf(value: unknown): Half {
  return value === "1" || value === "2" ? value : "all";
}

export function parseMonth(value: unknown, today: string): string {
  return typeof value === "string" && monthPattern.test(value) ? value : today.slice(0, 7);
}

export function reportPeriod(month: string, half: Half): ReportPeriod {
  const end = lastDay(month);
  const startDay = half === "2" ? 16 : 1;
  const endDay = half === "1" ? 15 : end;
  const pad = (n: number) => String(n).padStart(2, "0");
  return { month, half, from: `${month}-${pad(startDay)}`, to: `${month}-${pad(endDay)}`, days: endDay - startDay + 1 };
}

/** The period just before: the previous half, or the previous month. */
export function previousPeriod(period: ReportPeriod): ReportPeriod {
  if (period.half === "2") return reportPeriod(period.month, "1");
  if (period.half === "1") return reportPeriod(shiftMonth(period.month, -1), "2");
  return reportPeriod(shiftMonth(period.month, -1), "all");
}

/** Days of the period already lived (a period in progress is not judged on days to come). */
export function elapsedDays(period: ReportPeriod, today: string): number {
  if (today < period.from) return 0;
  if (today >= period.to) return period.days;
  return Math.round((Date.parse(`${today}T12:00:00Z`) - Date.parse(`${period.from}T12:00:00Z`)) / 86400000) + 1;
}

export function recentMonths(today: string, count = 12): string[] {
  return Array.from({ length: count }, (_, i) => shiftMonth(today.slice(0, 7), -i));
}
