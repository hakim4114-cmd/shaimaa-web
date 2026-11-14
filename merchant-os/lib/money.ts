// Money is handled as integer minor units ("cents", 1 MAD = 100) end to end,
// matching the *_cents bigint columns in the database. Never use floats for
// amounts; convert only at the display/input boundary.

import type { Locale } from "@/lib/i18n/config";

const intlLocale: Record<Locale, string> = {
  ar: "ar-MA",
  fr: "fr-MA",
  en: "en-MA"
};

export function formatMoney(cents: number | bigint, locale: Locale, options: { compact?: boolean } = {}): string {
  const value = Number(cents) / 100;
  return new Intl.NumberFormat(intlLocale[locale], {
    style: "currency",
    currency: "MAD",
    numberingSystem: "latn",
    notation: options.compact ? "compact" : "standard",
    minimumFractionDigits: options.compact ? 0 : 2,
    maximumFractionDigits: 2
  }).format(value);
}

/**
 * Parses a user-typed MAD amount into cents. Accepts "890", "890.5",
 * "890,50" and surrounding spaces. Thousands separators are rejected on
 * purpose: "1,150" is ambiguous between French and English conventions.
 * Returns null for anything that is not a valid non-negative amount.
 */
export function parseMoneyToCents(input: string): number | null {
  const trimmed = input.trim();
  const match = /^(\d{1,12})(?:[.,](\d{1,2}))?$/.exec(trimmed);
  if (!match) {
    return null;
  }
  const whole = Number(match[1]);
  const fraction = Number((match[2] ?? "0").padEnd(2, "0"));
  return whole * 100 + fraction;
}
