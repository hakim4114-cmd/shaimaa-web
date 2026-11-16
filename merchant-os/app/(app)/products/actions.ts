"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { skuPattern } from "@/lib/catalog/variants";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";
import type { Json } from "@/lib/supabase/database.types";
import { parseMoneyToCents } from "@/lib/money";

const productInput = z.object({
  id: z.string().uuid().optional(),
  name: z.string().trim().min(1).max(160),
  description: z.string().max(5000),
  category: z.string().trim().max(80),
  status: z.enum(["draft", "active", "archived"]),
  options: z.array(z.object({ name: z.string().trim().min(1).max(40), values: z.array(z.string().trim().min(1).max(40)).min(1).max(30) })).max(3),
  variants: z
    .array(
      z.object({
        id: z.string().uuid().optional(),
        sku: z.string().trim().regex(skuPattern),
        barcode: z.string().trim().max(64),
        title: z.string().trim().max(120),
        optionValues: z.record(z.string(), z.string().max(40)),
        price: z.string(),
        cost: z.string(),
        minStock: z.number().int().min(0).max(100000),
        active: z.boolean()
      })
    )
    .min(1)
    .max(100)
});

export type ProductInput = z.infer<typeof productInput>;
export type SaveProductResult = { productId?: string; error?: AppErrorCode };

export async function saveProduct(input: ProductInput): Promise<SaveProductResult> {
  const parsed = productInput.safeParse(input);
  if (!parsed.success) {
    const path = parsed.error.issues[0]?.path ?? [];
    if (path[0] === "name") return { error: "NAME_REQUIRED" };
    if (path.includes("sku")) return { error: "INVALID_SKU" };
    if (path[0] === "variants" && path.length === 1) return { error: "VARIANTS_REQUIRED" };
    return { error: "INVALID_INPUT" };
  }
  const value = parsed.data;

  const variants = [];
  for (const variant of value.variants) {
    const price = parseMoneyToCents(variant.price);
    const cost = variant.cost.trim() === "" ? null : parseMoneyToCents(variant.cost);
    if (price === null || (variant.cost.trim() !== "" && cost === null)) {
      return { error: "PRICE_REQUIRED" };
    }
    variants.push({
      id: variant.id,
      sku: variant.sku,
      barcode: variant.barcode,
      title: variant.title,
      option_values: variant.optionValues,
      price_cents: price,
      cost_cents: cost,
      min_stock_level: variant.minStock,
      status: variant.active ? "active" : "archived"
    });
  }

  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.editCatalog) {
    return { error: "FORBIDDEN" };
  }
  const payload = {
    id: value.id,
    name: value.name,
    description: value.description,
    category: value.category,
    status: value.status,
    options: value.options,
    variants
  } as unknown as Json;

  const { data, error } = await supabase.rpc("save_product", { p_organization_id: organizationId, p_payload: payload });
  if (error || !data) {
    return { error: mapDatabaseError(error) };
  }
  revalidatePath("/products");
  revalidatePath("/inventory");
  return { productId: data };
}
