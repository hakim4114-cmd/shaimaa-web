"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { getDefaultLocationId } from "@/lib/data/catalog";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";

const stockInput = z.object({
  variantId: z.string().uuid(),
  type: z.enum(["receipt", "adjustment", "mark_damaged", "write_off"]),
  quantity: z.number().int().min(-100000).max(100000),
  note: z.string().trim().max(500)
});

export type StockInput = z.infer<typeof stockInput>;

export async function recordStockMovement(input: StockInput): Promise<{ error?: AppErrorCode }> {
  const parsed = stockInput.safeParse(input);
  if (!parsed.success || parsed.data.quantity === 0 || (parsed.data.type !== "adjustment" && parsed.data.quantity < 0)) {
    return { error: "INVALID_QUANTITY" };
  }
  if (parsed.data.type === "adjustment" && !parsed.data.note) {
    return { error: "NOTE_REQUIRED" };
  }
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.moveStock) {
    return { error: "FORBIDDEN" };
  }
  const locationId = await getDefaultLocationId(supabase, organizationId);
  if (!locationId) {
    return { error: "UNKNOWN" };
  }
  const { error } = await supabase.rpc("adjust_inventory", {
    p_variant_id: parsed.data.variantId,
    p_location_id: locationId,
    p_type: parsed.data.type,
    p_quantity: parsed.data.quantity,
    p_note: parsed.data.note
  });
  if (error) {
    return { error: mapDatabaseError(error) };
  }
  revalidatePath("/inventory");
  revalidatePath(`/inventory/${parsed.data.variantId}`);
  revalidatePath("/products");
  return {};
}
