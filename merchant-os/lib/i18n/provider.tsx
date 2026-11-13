"use client";

import { createContext, useContext, type ReactNode } from "react";
import { localeDirection, type Locale } from "./config";
import type { Dictionary } from "./dictionaries";

type I18nValue = { locale: Locale; dir: "rtl" | "ltr"; t: Dictionary };

const I18nContext = createContext<I18nValue | null>(null);

export function I18nProvider({ locale, t, children }: { locale: Locale; t: Dictionary; children: ReactNode }) {
  return <I18nContext.Provider value={{ locale, dir: localeDirection[locale], t }}>{children}</I18nContext.Provider>;
}

export function useI18n(): I18nValue {
  const value = useContext(I18nContext);
  if (!value) {
    throw new Error("useI18n must be used inside I18nProvider");
  }
  return value;
}
