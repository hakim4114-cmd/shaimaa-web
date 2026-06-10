export const productStatuses = ["active", "draft", "archived"];

export const adminProductFields = [
  "id",
  "created_at",
  "name",
  "description",
  "price",
  "compare_at_price",
  "stock",
  "main_image_url",
  "status"
];

function cleanText(value) {
  return String(value ?? "").trim();
}

function parseOptionalNumber(value) {
  const text = cleanText(value);

  if (text === "") {
    return null;
  }

  const parsed = Number(text);

  return Number.isFinite(parsed) ? parsed : NaN;
}

export function validateAdminProductInput(input) {
  const errors = [];
  const name = cleanText(input?.name);
  const price = parseOptionalNumber(input?.price);
  const compareAtPrice = parseOptionalNumber(input?.compare_at_price);
  const stock = parseOptionalNumber(input?.stock);
  const status = cleanText(input?.status) || "draft";

  if (name.length < 2) {
    errors.push({ field: "name", code: "NAME_TOO_SHORT" });
  }

  if (price === null || Number.isNaN(price) || price < 0) {
    errors.push({ field: "price", code: "PRICE_INVALID" });
  }

  if (Number.isNaN(compareAtPrice) || (compareAtPrice !== null && compareAtPrice < 0)) {
    errors.push({ field: "compare_at_price", code: "COMPARE_AT_PRICE_INVALID" });
  }

  if (Number.isNaN(stock) || (stock !== null && (!Number.isInteger(stock) || stock < 0))) {
    errors.push({ field: "stock", code: "STOCK_INVALID" });
  }

  if (!productStatuses.includes(status)) {
    errors.push({ field: "status", code: "STATUS_INVALID" });
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

export function buildAdminProductRecord(input) {
  return {
    name: cleanText(input?.name),
    description: cleanText(input?.description),
    price: parseOptionalNumber(input?.price),
    compare_at_price: parseOptionalNumber(input?.compare_at_price),
    stock: parseOptionalNumber(input?.stock),
    main_image_url: cleanText(input?.main_image_url),
    status: cleanText(input?.status) || "draft"
  };
}

export function sanitizeAdminProduct(row) {
  return adminProductFields.reduce((product, field) => {
    return {
      ...product,
      [field]: row?.[field] ?? null
    };
  }, {});
}
