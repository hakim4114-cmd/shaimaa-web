import { createClient } from "@supabase/supabase-js";
import { anonKey, assertLocalStack, owner, serviceRoleKey, supabaseUrl } from "./env";

// Creates the test accounts and their organization on the throwaway local stack.
export default async function globalSetup() {
  assertLocalStack();
  const admin = createClient(supabaseUrl, serviceRoleKey, { auth: { persistSession: false } });

  const { error: createError } = await admin.auth.admin.createUser({ email: owner.email, password: owner.password, email_confirm: true });
  if (createError && !/already/i.test(createError.message)) throw createError;

  const client = createClient(supabaseUrl, anonKey, { auth: { persistSession: false } });
  const { error: signInError } = await client.auth.signInWithPassword({ email: owner.email, password: owner.password });
  if (signInError) throw signInError;
  const { data: memberships, error: listError } = await client.from("organization_members").select("organization_id").limit(1);
  if (listError) throw listError;
  if (!memberships?.length) {
    const { error } = await client.rpc("create_organization", { p_name: owner.org, p_slug: owner.slug });
    if (error) throw error;
  }
}
