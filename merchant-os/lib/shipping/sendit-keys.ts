import "server-only";
import { createSupabaseAdminClient } from "@/lib/supabase/admin";
import type { SenditKeys } from "./sendit";

// Reads an organization's Sendit keys from provider_secrets (service role
// only). Call it only after requireOrganization() has checked the user's role
// for that organization: the keys never leave the server.

export async function loadSenditKeys(organizationId: string): Promise<SenditKeys | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data: provider } = await admin
    .from("shipping_providers")
    .select("id")
    .eq("organization_id", organizationId)
    .eq("adapter_key", "sendit")
    .maybeSingle();
  return provider ? loadSenditKeysForProvider(provider.id) : null;
}

export async function loadSenditKeysForProvider(providerId: string): Promise<SenditKeys | null> {
  const admin = createSupabaseAdminClient();
  if (!admin) return null;
  const { data } = await admin.from("provider_secrets").select("public_key, secret_key").eq("provider_id", providerId).maybeSingle();
  return data ? { publicKey: data.public_key, secretKey: data.secret_key } : null;
}
