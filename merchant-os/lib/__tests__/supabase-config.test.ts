import { afterEach, describe, expect, it, vi } from "vitest";
import { getSupabasePublicConfig } from "@/lib/supabase/config";

function withUrl(url: string) {
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_URL", url);
  vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "anon");
  return getSupabasePublicConfig();
}

describe("getSupabasePublicConfig", () => {
  afterEach(() => vi.unstubAllEnvs());

  it("accepts an https project", () => {
    expect(withUrl("https://abc.supabase.co")?.url).toBe("https://abc.supabase.co");
  });

  it("accepts http only for a stack on this machine", () => {
    expect(withUrl("http://127.0.0.1:54321")).not.toBeNull();
    expect(withUrl("http://localhost:54321")).not.toBeNull();
    expect(withUrl("http://abc.supabase.co")).toBeNull();
    expect(withUrl("http://127.0.0.1.example.com")).toBeNull();
  });

  it("rejects missing or invalid values", () => {
    expect(withUrl("not a url")).toBeNull();
    vi.stubEnv("NEXT_PUBLIC_SUPABASE_ANON_KEY", "");
    expect(getSupabasePublicConfig()).toBeNull();
  });
});
