"use server";

import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";

export async function retryStoreOrder(id: string): Promise<{ status?: string; error?: AppErrorCode }> {
  if (!z.string().uuid().safeParse(id).success) return { error: "NOT_FOUND" };
  const { supabase, can } = await requireOrganization();
  if (!can.manageOrders) return { error: "FORBIDDEN" };
  const { data, error } = await supabase.rpc("retry_store_order", { p_external_order_id: id });
  if (error || !data) return { error: mapDatabaseError(error) };
  revalidatePath("/orders/inbox");
  revalidatePath("/orders");
  return { status: data.status };
}

export async function ignoreStoreOrder(id: string): Promise<{ ok?: true; error?: AppErrorCode }> {
  if (!z.string().uuid().safeParse(id).success) return { error: "NOT_FOUND" };
  const { supabase, can } = await requireOrganization();
  if (!can.manageOrders) return { error: "FORBIDDEN" };
  const { error } = await supabase.rpc("ignore_store_order", { p_external_order_id: id });
  if (error) return { error: mapDatabaseError(error) };
  revalidatePath("/orders/inbox");
  return { ok: true };
}
