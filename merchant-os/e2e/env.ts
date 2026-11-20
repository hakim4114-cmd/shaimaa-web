// Test accounts and the local stack's connection details.
export const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
export const anonKey = required("NEXT_PUBLIC_SUPABASE_ANON_KEY");
export const serviceRoleKey = required("SUPABASE_SERVICE_ROLE_KEY");

export const owner = { email: "owner@e2e.test", password: "e2e-Owner-pass-1", org: "E2E Shop", slug: "e2e-shop" };

function required(name: string): string {
  const value = process.env[name];
  if (!value) throw new Error(`${name} is not set: start the local Supabase stack first (docs/QA_PLAN.md).`);
  return value;
}

/** Refuse to run against anything but a local stack: the hosted ledgers cannot be cleaned. */
export function assertLocalStack() {
  const host = new URL(supabaseUrl).hostname;
  if (host !== "127.0.0.1" && host !== "localhost") {
    throw new Error(`End-to-end tests only run against a local Supabase stack, not ${host}.`);
  }
}
