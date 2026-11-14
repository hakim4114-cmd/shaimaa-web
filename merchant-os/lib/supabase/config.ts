// Public connection settings. Safe for the browser: every table is protected
// by Row Level Security (see supabase/migrations).
export function getSupabasePublicConfig(): { url: string; anonKey: string } | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim();
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim();
  if (!url || !anonKey) {
    return null;
  }
  try {
    if (new URL(url).protocol !== "https:") {
      return null;
    }
  } catch {
    return null;
  }
  return { url, anonKey };
}
