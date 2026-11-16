// Pure helpers for product options and variants. Products describe their own
// options (e.g. Size + Color, or Capacity), so nothing here assumes a product type.

export type ProductOption = { name: string; values: string[] };
export type OptionValues = Record<string, string>;

export const maxOptions = 3;
export const maxVariants = 100;

/** Splits "S, M ,L" / "S، M" (Arabic comma) into clean unique values. */
export function parseOptionValues(input: string): string[] {
  const seen = new Set<string>();
  const values: string[] = [];
  for (const raw of input.split(/[,،;\n]/)) {
    const value = raw.trim().replace(/\s+/g, " ");
    const key = value.toLocaleLowerCase();
    if (value && !seen.has(key)) {
      seen.add(key);
      values.push(value);
    }
  }
  return values;
}

/** Every combination of option values, in option order. One empty combination when there are no options. */
export function combineOptions(options: ProductOption[]): OptionValues[] {
  const usable = options.filter((option) => option.name.trim() && option.values.length > 0);
  return usable.reduce<OptionValues[]>(
    (combos, option) => combos.flatMap((combo) => option.values.map((value) => ({ ...combo, [option.name.trim()]: value }))),
    [{}]
  );
}

export function variantTitle(values: OptionValues, options: ProductOption[]): string {
  return options
    .map((option) => values[option.name.trim()])
    .filter((value): value is string => Boolean(value))
    .join(" / ");
}

/** Stable key for matching a variant to an option combination. */
export function comboKey(values: OptionValues): string {
  return Object.keys(values)
    .sort()
    .map((key) => `${key}=${values[key]}`)
    .join("|");
}

function skuPart(value: string, length: number): string {
  const latin = value
    .normalize("NFKD")
    .replace(/[̀-ͯ]/g, "")
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "");
  return latin.slice(0, length);
}

/**
 * Suggests a SKU such as "AMN-IVO-M" from the product name and option values.
 * Arabic-only names give no Latin letters: a numbered fallback keeps SKUs valid
 * for the database pattern ^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$.
 */
export function suggestSku(productName: string, values: OptionValues, options: ProductOption[], index: number): string {
  const base = skuPart(productName, 4) || "P";
  const parts = options.map((option) => skuPart(values[option.name.trim()] ?? "", 3)).filter(Boolean);
  const sku = [base, ...parts].join("-");
  return parts.length === Object.keys(values).length && parts.length > 0 ? sku : `${base}-${String(index + 1).padStart(2, "0")}`;
}

export const skuPattern = /^[A-Za-z0-9][A-Za-z0-9._-]{0,63}$/;
