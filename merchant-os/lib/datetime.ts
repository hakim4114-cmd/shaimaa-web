// Dates are stored as UTC timestamps and shown in Moroccan time, whatever
// the server's or the browser's own time zone is.
import type { Locale } from "@/lib/i18n/config";

export const businessTimeZone = "Africa/Casablanca";

const intlLocale: Record<Locale, string> = { ar: "ar-MA", fr: "fr-MA", en: "en-GB" };

export function formatDateTime(value: string | Date, locale: Locale, style: "short" | "medium" = "medium"): string {
  return new Intl.DateTimeFormat(intlLocale[locale], {
    dateStyle: style,
    timeStyle: "short",
    timeZone: businessTimeZone,
    numberingSystem: "latn"
  }).format(typeof value === "string" ? new Date(value) : value);
}

/** Calendar day (YYYY-MM-DD) of an instant in Moroccan time. */
export function businessDay(value: string | Date): string {
  const parts = new Intl.DateTimeFormat("en-CA", { timeZone: businessTimeZone, year: "numeric", month: "2-digit", day: "2-digit" }).format(
    typeof value === "string" ? new Date(value) : value
  );
  return parts;
}

/** True when a call-back time is due today (Moroccan time) or overdue. */
export function isDueByToday(value: string | null, now: Date = new Date()): boolean {
  if (!value) return false;
  return businessDay(value) <= businessDay(now);
}

/** A calendar day (YYYY-MM-DD) as "Sat 28 Nov" in the user's language. */
export function formatDay(day: string, locale: Locale): string {
  return new Intl.DateTimeFormat(intlLocale[locale], { weekday: "short", day: "numeric", month: "short", timeZone: "UTC", numberingSystem: "latn" }).format(new Date(`${day}T12:00:00Z`));
}
