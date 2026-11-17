"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";
import { listCities } from "@/lib/data/orders";
import { matchCity } from "@/lib/import/orders";
import { parseMoneyToCents } from "@/lib/money";
import { normalizeMoroccanPhone } from "@/lib/phone";
import type { Json } from "@/lib/supabase/database.types";

const orderSchema = z.object({
  ref: z.string().max(60),
  rows: z.array(z.number().int()).max(200),
  phone: z.string().max(40),
  fullName: z.string().max(120),
  city: z.string().max(80),
  address: z.string().max(500),
  shippingFee: z.string().max(20),
  notes: z.string().max(2000),
  items: z.array(z.object({ sku: z.string().max(64), quantity: z.number().int().min(1).max(1000) })).min(1).max(50)
});

export type ImportResult = { ref: string; rows: number[]; orderNumber?: string; error?: AppErrorCode; detail?: string };

/** Creates each order through create_order (all business rules apply); one failure does not stop the others. */
export async function importOrders(input: unknown, source: string): Promise<{ results?: ImportResult[]; error?: AppErrorCode }> {
  const parsed = z.array(orderSchema).max(300).safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.manageOrders) return { error: "FORBIDDEN" };

  const skus = [...new Set(parsed.data.flatMap((o) => o.items.map((i) => i.sku)))];
  const [{ data: variants }, cities] = await Promise.all([
    supabase.from("product_variants").select("id, sku").eq("organization_id", organizationId).in("sku", skus.concat("-")),
    listCities(supabase)
  ]);
  const bySku = new Map((variants ?? []).map((v) => [v.sku.toLowerCase(), v.id]));
  const validSource = ["website", "whatsapp", "instagram", "facebook", "tiktok", "phone", "store", "other"].includes(source) ? source : "other";

  const results: ImportResult[] = [];
  for (const order of parsed.data) {
    const phone = normalizeMoroccanPhone(order.phone);
    if (!phone) {
      results.push({ ref: order.ref, rows: order.rows, error: "PHONE_INVALID" });
      continue;
    }
    const missing = order.items.filter((i) => !bySku.has(i.sku.toLowerCase()));
    if (missing.length) {
      results.push({ ref: order.ref, rows: order.rows, error: "VARIANT_NOT_AVAILABLE", detail: missing.map((m) => m.sku).join(", ") });
      continue;
    }
    const fee = order.shippingFee.trim() === "" ? null : parseMoneyToCents(order.shippingFee);
    const cityId = matchCity(order.city, cities);
    const payload = {
      customer: { phone, full_name: order.fullName.trim(), city: cityId ? "" : order.city.trim(), address: order.address.trim() },
      city_id: cityId,
      items: order.items.map((i) => ({ variant_id: bySku.get(i.sku.toLowerCase()), quantity: i.quantity })),
      ...(fee === null ? {} : { shipping_fee_cents: fee }),
      source: validSource,
      notes: order.notes,
      internal_notes: `Import CSV (${order.ref})`
    } as unknown as Json;
    const { data, error } = await supabase.rpc("create_order", { p_organization_id: organizationId, p_payload: payload });
    if (error || !data) results.push({ ref: order.ref, rows: order.rows, error: mapDatabaseError(error) });
    else results.push({ ref: order.ref, rows: order.rows, orderNumber: data.order_number });
  }
  revalidatePath("/orders");
  revalidatePath("/");
  return { results };
}
