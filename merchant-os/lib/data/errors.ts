// Database error → internal code. The database raises UPPER_SNAKE codes for
// business rules; constraint violations are recognised by constraint name.
// User-facing text lives in the dictionaries under `errors`.

export const appErrorCodes = [
  "FORBIDDEN",
  "NOT_FOUND",
  "SKU_TAKEN",
  "BARCODE_TAKEN",
  "INVALID_SKU",
  "NAME_REQUIRED",
  "PRICE_REQUIRED",
  "VARIANTS_REQUIRED",
  "ACTIVE_VARIANT_REQUIRED",
  "TOO_MANY_VARIANTS",
  "INSUFFICIENT_STOCK",
  "INVALID_QUANTITY",
  "NOTE_REQUIRED",
  "INVALID_INPUT",
  "UNKNOWN"
] as const;

export type AppErrorCode = (typeof appErrorCodes)[number];

const raised: Partial<Record<string, AppErrorCode>> = {
  FORBIDDEN: "FORBIDDEN",
  PRODUCT_NOT_FOUND: "NOT_FOUND",
  VARIANT_NOT_FOUND: "NOT_FOUND",
  VARIANTS_REQUIRED: "VARIANTS_REQUIRED",
  ACTIVE_VARIANT_REQUIRED: "ACTIVE_VARIANT_REQUIRED",
  TOO_MANY_VARIANTS: "TOO_MANY_VARIANTS",
  INSUFFICIENT_STOCK: "INSUFFICIENT_STOCK",
  INVALID_QUANTITY: "INVALID_QUANTITY",
  NOTE_REQUIRED: "NOTE_REQUIRED"
};

export function mapDatabaseError(error: { code?: string; message?: string } | null | undefined): AppErrorCode {
  if (!error) {
    return "UNKNOWN";
  }
  const message = error.message ?? "";
  const direct = raised[message.trim()];
  if (direct) {
    return direct;
  }
  if (error.code === "42501") {
    return "FORBIDDEN";
  }
  if (error.code === "23505") {
    if (message.includes("barcode")) return "BARCODE_TAKEN";
    if (message.includes("sku")) return "SKU_TAKEN";
  }
  if (error.code === "23514") {
    if (message.includes("sku_check")) return "INVALID_SKU";
    if (message.includes("name_check")) return "NAME_REQUIRED";
    return "INVALID_INPUT";
  }
  return "UNKNOWN";
}
