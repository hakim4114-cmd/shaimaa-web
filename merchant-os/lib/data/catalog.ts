import "server-only";
import type { ProductOption } from "@/lib/catalog/variants";
import type { Database } from "@/lib/supabase/database.types";
import type { requireOrganization } from "./context";

type Client = Awaited<ReturnType<typeof requireOrganization>>["supabase"];
export type ProductStatus = Database["public"]["Enums"]["product_status"];

export type StockLevel = { onHand: number; reserved: number; available: number; damaged: number; inspection: number };

export type VariantRow = {
  id: string;
  sku: string;
  barcode: string | null;
  title: string;
  optionValues: Record<string, string>;
  priceCents: number;
  costCents: number | null;
  minStockLevel: number;
  status: ProductStatus;
  stock: StockLevel;
};

export type ProductRow = {
  id: string;
  name: string;
  description: string;
  status: ProductStatus;
  category: string;
  options: ProductOption[];
  variants: VariantRow[];
};

const emptyStock: StockLevel = { onHand: 0, reserved: 0, available: 0, damaged: 0, inspection: 0 };

function sumStock(levels: { on_hand: number; reserved: number; available: number | null; damaged: number; inspection: number }[] | null): StockLevel {
  return (levels ?? []).reduce<StockLevel>(
    (total, level) => ({
      onHand: total.onHand + level.on_hand,
      reserved: total.reserved + level.reserved,
      available: total.available + (level.available ?? level.on_hand - level.reserved),
      damaged: total.damaged + level.damaged,
      inspection: total.inspection + level.inspection
    }),
    { ...emptyStock }
  );
}

function asOptions(value: unknown): ProductOption[] {
  if (!Array.isArray(value)) return [];
  return value.flatMap((item) =>
    item && typeof item === "object" && typeof (item as { name?: unknown }).name === "string" && Array.isArray((item as { values?: unknown }).values)
      ? [{ name: (item as { name: string }).name, values: ((item as { values: unknown[] }).values).filter((v): v is string => typeof v === "string") }]
      : []
  );
}

function asOptionValues(value: unknown): Record<string, string> {
  if (!value || typeof value !== "object" || Array.isArray(value)) return {};
  return Object.fromEntries(Object.entries(value).filter((entry): entry is [string, string] => typeof entry[1] === "string"));
}

const productSelect =
  "id, name, description, status, options, category:product_categories(name), variants:product_variants(id, sku, barcode, title, option_values, price_cents, cost_cents, min_stock_level, status, levels:inventory_levels(on_hand, reserved, available, damaged, inspection))";

type RawProduct = {
  id: string;
  name: string;
  description: string;
  status: ProductStatus;
  options: unknown;
  category: { name: string } | null;
  variants: {
    id: string;
    sku: string;
    barcode: string | null;
    title: string;
    option_values: unknown;
    price_cents: number;
    cost_cents: number | null;
    min_stock_level: number;
    status: ProductStatus;
    levels: { on_hand: number; reserved: number; available: number | null; damaged: number; inspection: number }[] | null;
  }[];
};

function toProduct(raw: RawProduct): ProductRow {
  return {
    id: raw.id,
    name: raw.name,
    description: raw.description,
    status: raw.status,
    category: raw.category?.name ?? "",
    options: asOptions(raw.options),
    variants: raw.variants
      .map((variant) => ({
        id: variant.id,
        sku: variant.sku,
        barcode: variant.barcode,
        title: variant.title,
        optionValues: asOptionValues(variant.option_values),
        priceCents: variant.price_cents,
        costCents: variant.cost_cents,
        minStockLevel: variant.min_stock_level,
        status: variant.status,
        stock: sumStock(variant.levels)
      }))
      .sort((a, b) => a.sku.localeCompare(b.sku))
  };
}

export async function listProducts(supabase: Client, organizationId: string, filters: { q?: string; status?: ProductStatus }) {
  let query = supabase.from("products").select(productSelect).eq("organization_id", organizationId).order("created_at", { ascending: false }).limit(200);
  if (filters.status) {
    query = query.eq("status", filters.status);
  }
  if (filters.q) {
    query = query.ilike("name", `%${filters.q.replace(/[%_\\]/g, (c) => `\\${c}`)}%`);
  }
  const { data, error } = await query.overrideTypes<RawProduct[], { merge: false }>();
  if (error) throw new Error("PRODUCTS_UNAVAILABLE");
  return (data ?? []).map(toProduct);
}

export async function getProduct(supabase: Client, organizationId: string, id: string) {
  const { data, error } = await supabase
    .from("products")
    .select(productSelect)
    .eq("organization_id", organizationId)
    .eq("id", id)
    .maybeSingle()
    .overrideTypes<RawProduct, { merge: false }>();
  if (error) throw new Error("PRODUCT_UNAVAILABLE");
  return data ? toProduct(data) : null;
}

export async function listCategories(supabase: Client, organizationId: string) {
  const { data } = await supabase.from("product_categories").select("name").eq("organization_id", organizationId).order("name");
  return (data ?? []).map((row) => row.name);
}

export type MovementRow = Database["public"]["Tables"]["inventory_movements"]["Row"];

export async function listMovements(supabase: Client, organizationId: string, variantId: string) {
  const { data, error } = await supabase
    .from("inventory_movements")
    .select("*")
    .eq("organization_id", organizationId)
    .eq("variant_id", variantId)
    .order("created_at", { ascending: false })
    .limit(200);
  if (error) throw new Error("MOVEMENTS_UNAVAILABLE");
  return data ?? [];
}

export async function getDefaultLocationId(supabase: Client, organizationId: string) {
  const { data } = await supabase.from("inventory_locations").select("id").eq("organization_id", organizationId).eq("is_default", true).maybeSingle();
  return data?.id ?? null;
}
