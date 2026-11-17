"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";
import { parseMoneyToCents } from "@/lib/money";

export type ReturnResult = { ok?: true; error?: AppErrorCode };

function done() {
  revalidatePath("/returns");
  revalidatePath("/inventory");
  revalidatePath("/");
  return { ok: true as const };
}

export async function receiveReturn(returnId: string, fee: string): Promise<ReturnResult> {
  if (!z.string().uuid().safeParse(returnId).success) return { error: "NOT_FOUND" };
  const cents = String(fee ?? "").trim() === "" ? 0 : parseMoneyToCents(String(fee));
  if (cents === null) return { error: "INVALID_INPUT" };
  const { supabase, can } = await requireOrganization();
  if (!can.receiveReturns) return { error: "FORBIDDEN" };
  const { error } = await supabase.rpc("receive_return", { p_return_id: returnId, p_return_shipping_fee_cents: cents });
  return error ? { error: mapDatabaseError(error) } : done();
}

export async function inspectReturnItem(itemId: string, condition: "resellable" | "damaged" | "missing"): Promise<ReturnResult> {
  if (!z.string().uuid().safeParse(itemId).success || !["resellable", "damaged", "missing"].includes(condition)) return { error: "INVALID_INPUT" };
  const { supabase, can } = await requireOrganization();
  if (!can.receiveReturns) return { error: "FORBIDDEN" };
  const { error } = await supabase.rpc("inspect_return_item", { p_return_item_id: itemId, p_condition: condition });
  return error ? { error: mapDatabaseError(error) } : done();
}

export async function closeReturn(returnId: string): Promise<ReturnResult> {
  if (!z.string().uuid().safeParse(returnId).success) return { error: "NOT_FOUND" };
  const { supabase } = await requireOrganization();
  const { error } = await supabase.rpc("close_return", { p_return_id: returnId });
  return error ? { error: mapDatabaseError(error) } : done();
}
