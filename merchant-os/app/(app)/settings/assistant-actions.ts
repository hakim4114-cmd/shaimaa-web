"use server";

import { createHash, randomBytes } from "node:crypto";
import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { requireOrganization } from "@/lib/data/context";
import { mapDatabaseError, type AppErrorCode } from "@/lib/data/errors";

/** Creates a connector link for Claude. The full link is shown once; only its hash is stored. */
export async function createAssistantLink(name: string): Promise<{ url?: string; error?: AppErrorCode }> {
  const label = String(name ?? "").trim().slice(0, 60) || "Claude";
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const token = randomBytes(32).toString("base64url") + randomBytes(16).toString("base64url");
  const hash = createHash("sha256").update(token).digest("hex");
  const { error } = await supabase.rpc("create_assistant_token", { p_organization_id: organizationId, p_name: label, p_token_hash: hash });
  if (error) return { error: error.message.includes("TOO_MANY_TOKENS") ? "TOO_MANY_TOKENS" : mapDatabaseError(error) };
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host") ?? "";
  const origin = process.env.NEXT_PUBLIC_SITE_URL?.trim() || `${h.get("x-forwarded-proto") ?? "https"}://${host}`;
  revalidatePath("/settings");
  return { url: `${origin}/api/mcp/${token}` };
}

export async function revokeAssistantLink(id: string): Promise<{ ok?: true; error?: AppErrorCode }> {
  if (!z.string().uuid().safeParse(id).success) return { error: "NOT_FOUND" };
  const { supabase, organizationId, can } = await requireOrganization();
  if (!can.overrideBlocklist) return { error: "FORBIDDEN" };
  const { error, count } = await supabase.from("assistant_tokens").delete({ count: "exact" }).eq("organization_id", organizationId).eq("id", id);
  if (error) return { error: mapDatabaseError(error) };
  if (!count) return { error: "NOT_FOUND" };
  revalidatePath("/settings");
  return { ok: true };
}
