"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";
import { connectablePlatforms } from "@/lib/integrations/stores";

const createSchema = z.object({
  name: z.string().trim().min(1).max(120),
  platform: z.enum(connectablePlatforms),
  url: z.string().trim().max(300).optional().default(""),
  // Shopify signs with a key it shows to the merchant; we generate the others.
  secret: z.string().trim().max(200).optional().default("")
});

/** Creates a store connection. A generated secret is returned once, to paste in the store. */
export async function createStoreConnection(input: unknown): Promise<{ id?: string; secret?: string; error?: AppErrorCode }> {
  const parsed = createSchema.safeParse(input);
  if (!parsed.success) return { error: "INVALID_INPUT" };
  const { name, platform, url } = parsed.data;
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const pasted = platform === "shopify";
  const secret = pasted ? parsed.data.secret : randomBytes(24).toString("base64url");
  if (secret.length < 16) return { error: "SECRET_TOO_SHORT" };
  const { data, error } = await supabase.rpc("create_store_connection", {
    p_organization_id: organizationId,
    p_name: name,
    p_platform: platform,
    p_url: url,
    p_secret: secret
  });
  if (error || !data) return { error: mapDatabaseError(error) };
  revalidatePath("/settings");
  return { id: data.id, secret: pasted ? undefined : secret };
}

/** New secret: pasted (Shopify) or generated and returned once. */
export async function renewStoreSecret(storeId: string, pasted?: string): Promise<{ secret?: string; error?: AppErrorCode }> {
  if (!z.string().uuid().safeParse(storeId).success) return { error: "NOT_FOUND" };
  const { supabase, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const secret = pasted?.trim() || randomBytes(24).toString("base64url");
  const { error } = await supabase.rpc("set_store_secret", { p_store_id: storeId, p_secret: secret });
  if (error) return { error: mapDatabaseError(error) };
  return { secret: pasted?.trim() ? undefined : secret };
}

export async function setStoreActive(storeId: string, active: boolean): Promise<{ ok?: true; error?: AppErrorCode }> {
  if (!z.string().uuid().safeParse(storeId).success) return { error: "NOT_FOUND" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error, count } = await supabase.from("stores").update({ is_active: active }, { count: "exact" }).eq("organization_id", organizationId).eq("id", storeId);
  if (error) return { error: mapDatabaseError(error) };
  if (!count) return { error: "NOT_FOUND" };
  revalidatePath("/settings");
  return { ok: true };
}
