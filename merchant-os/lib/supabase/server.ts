import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies } from "next/headers";
import { getSupabasePublicConfig } from "./config";
import type { Database } from "./database.types";

/**
 * Supabase client acting as the signed-in user (anon key + session cookie),
 * so every query is subject to RLS. Never uses the service-role key.
 */
export async function createSupabaseServerClient() {
  const config = getSupabasePublicConfig();
  if (!config) {
    throw new Error("SUPABASE_NOT_CONFIGURED");
  }
  const cookieStore = await cookies();

  return createServerClient<Database>(config.url, config.anonKey, {
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) {
            cookieStore.set(name, value, options);
          }
        } catch {
          // Called from a Server Component, where cookies are read-only. The
          // proxy refreshes the session cookie on every request, so this is safe.
        }
      }
    }
  });
}
