export const locales = ["ar", "fr", "en"] as const;
export type Locale = (typeof locales)[number];

export const defaultLocale: Locale = "ar";
export const localeCookieName = "mos-locale";

export const localeDirection: Record<Locale, "rtl" | "ltr"> = {
  ar: "rtl",
  fr: "ltr",
  en: "ltr"
};

export const localeNativeName: Record<Locale, string> = {
  ar: "العربية",
  fr: "Français",
  en: "English"
};

export function isLocale(value: unknown): value is Locale {
  return typeof value === "string" && (locales as readonly string[]).includes(value);
}
