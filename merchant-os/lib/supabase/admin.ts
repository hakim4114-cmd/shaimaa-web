import "server-only";
import { createClient } from "@supabase/supabase-js";
import { getSupabasePublicConfig } from "./config";
import type { Database } from "./database.types";

/**
 * Server-only client with the service key (bypasses RLS). Used only where
 * no user session exists (carrier webhooks) or to apply carrier data after
 * the caller's own permissions were checked. Never import from client code.
 */
export function createSupabaseAdminClient() {
  const config = getSupabasePublicConfig();
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim();
  if (!config || !key) return null;
  return createClient<Database>(config.url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}
