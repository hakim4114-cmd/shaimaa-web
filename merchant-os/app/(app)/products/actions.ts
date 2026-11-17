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

const imageTypes = new Set(["image/jpeg", "image/png", "image/webp"]);

/** Uploads the product's main image (already resized in the browser) to the private bucket. */
export async function uploadProductImage(productId: string, form: FormData): Promise<{ ok?: true; error?: AppErrorCode }> {
  if (!z.string().uuid().safeParse(productId).success) return { error: "NOT_FOUND" };
  const file = form.get("file");
  if (!(file instanceof File) || !imageTypes.has(file.type) || file.size === 0 || file.size > 2 * 1024 * 1024) return { error: "IMAGE_INVALID" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.editCatalog) return { error: "FORBIDDEN" };
  const { data: product } = await supabase.from("products").select("id, image_path").eq("organization_id", organizationId).eq("id", productId).maybeSingle();
  if (!product) return { error: "NOT_FOUND" };

  const ext = file.type === "image/png" ? "png" : file.type === "image/webp" ? "webp" : "jpg";
  const path = `${organizationId}/${productId}/${Date.now()}.${ext}`;
  const { error: uploadError } = await supabase.storage.from("product-images").upload(path, file, { contentType: file.type, upsert: false });
  if (uploadError) return { error: "IMAGE_UPLOAD_FAILED" };
  const { error } = await supabase.from("products").update({ image_path: path }).eq("id", productId);
  if (error) {
    await supabase.storage.from("product-images").remove([path]);
    return { error: mapDatabaseError(error) };
  }
  if (product.image_path) await supabase.storage.from("product-images").remove([product.image_path]);
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  return { ok: true };
}

export async function removeProductImage(productId: string): Promise<{ ok?: true; error?: AppErrorCode }> {
  if (!z.string().uuid().safeParse(productId).success) return { error: "NOT_FOUND" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.editCatalog) return { error: "FORBIDDEN" };
  const { data: product } = await supabase.from("products").select("image_path").eq("organization_id", organizationId).eq("id", productId).maybeSingle();
  if (!product) return { error: "NOT_FOUND" };
  const { error } = await supabase.from("products").update({ image_path: null }).eq("id", productId);
  if (error) return { error: mapDatabaseError(error) };
  if (product.image_path) await supabase.storage.from("product-images").remove([product.image_path]);
  revalidatePath("/products");
  revalidatePath(`/products/${productId}`);
  return { ok: true };
}
