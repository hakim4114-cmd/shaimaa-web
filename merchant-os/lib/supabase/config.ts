// Public connection settings. Safe for the browser: every table is protected
// by Row Level Security (see supabase/migrations).
export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }
  try {
    // HTTPS only, except a Supabase stack on this machine (local development and end-to-end tests).
    const parsed = new URL(url);
    const local = parsed.hostname === "127.0.0.1" || parsed.hostname === "localhost";
    if (parsed.protocol !== "https:" && !(local && parsed.protocol === "http:")) {
      return null;
    }
  } catch {
    return null;
  }
  return { url, anonKey };
}
