import type { Locale } from "../config";
import ar from "./ar";
import en, { type Dictionary } from "./en";
import fr from "./fr";

export type { Dictionary };

const dictionaries: Record<Locale, Dictionary> = { ar, fr, en };

export function getDictionary(locale: Locale): Dictionary {
  return dictionaries[locale];
}

export function interpolate(template: string, values: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (match, key: string) => (key in values ? String(values[key]) : match));
}
