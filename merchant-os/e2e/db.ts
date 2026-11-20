import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { anonKey, assertLocalStack, serviceRoleKey, supabaseUrl, type TestUser } from "./env";

/** Service-role client for checking what the database holds after a step (local stack only). */
export function adminClient(): SupabaseClient {
  assertLocalStack();
  return createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });
}

/** A client signed in as a test user, for setup through the app's own RPCs. */
export async function userClient(user: TestUser): Promise<SupabaseClient> {
  assertLocalStack();
  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { error } = await client.auth.signInWithPassword({ email: user.email, password: user.password });
  if (error) throw error;
  return client;
}

export async function organizationId(slug: string): Promise<string> {
  const { data, error } = await adminClient().from("organizations").select("id").eq("slug", slug).single();
  if (error) throw error;
  return data.id as string;
}

/** Stock of one variant, summed over locations. */
export async function stockOf(variantId: string): Promise<{ onHand: number; reserved: number }> {
  const { data, error } = await adminClient().from("inventory_levels").select("on_hand, reserved").eq("variant_id", variantId);
  if (error) throw error;
  return (data ?? []).reduce((sum, row) => ({ onHand: sum.onHand + row.on_hand, reserved: sum.reserved + row.reserved }), { onHand: 0, reserved: 0 });
}
