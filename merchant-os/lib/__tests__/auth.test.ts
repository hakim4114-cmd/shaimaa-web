import { describe, expect, it } from "vitest";
import { mapSupabaseAuthError } from "@/lib/auth/errors";
import { organizationSchema, safeNextPath, signUpSchema, suggestSlug } from "@/lib/auth/schemas";

describe("safeNextPath", () => {
  it.each([
    ["/orders", "/orders"],
    ["/orders?x=1", "/orders?x=1"],
    ["//evil.example", "/"],
    ["/\\evil.example", "/"],
    ["https://evil.example", "/"],
    [undefined, "/"],
    [["/a"], "/"]
  ])("%s -> %s", (input, expected) => {
    expect(safeNextPath(input)).toBe(expected);
  });
});

describe("signUpSchema", () => {
  it("normalizes email and requires 10+ character passwords", () => {
    expect(signUpSchema.safeParse({ email: " A@B.MA ", password: "0123456789" })).toMatchObject({
      success: true,
      data: { email: "a@b.ma" }
    });
    expect(signUpSchema.safeParse({ email: "a@b.ma", password: "short" }).success).toBe(false);
    expect(signUpSchema.safeParse({ email: "a@b.ma", password: "x".repeat(73) }).success).toBe(false);
  });
});

describe("organization slug", () => {
  it("suggests a slug matching the database pattern", () => {
    const slug = suggestSlug("Maison Shaïmaa — Casablanca!");
    expect(slug).toBe("maison-shaimaa-casablanca");
    expect(organizationSchema.safeParse({ name: "x", slug }).success).toBe(true);
  });

  it("yields an empty suggestion for Arabic-only names (user types it)", () => {
    expect(suggestSlug("دار شيماء")).toBe("");
  });

  it("rejects slugs the database would reject", () => {
    for (const slug of ["ab", "-abc", "abc-", "a_b_c", "a b c"]) {
      expect(organizationSchema.safeParse({ name: "x", slug }).success, slug).toBe(false);
    }
  });
});

describe("mapSupabaseAuthError", () => {
  it("maps known codes and hides unknown ones", () => {
    expect(mapSupabaseAuthError("invalid_credentials")).toBe("INVALID_CREDENTIALS");
    expect(mapSupabaseAuthError("over_email_send_rate_limit")).toBe("RATE_LIMITED");
    expect(mapSupabaseAuthError("something_new")).toBe("UNKNOWN");
    expect(mapSupabaseAuthError(undefined)).toBe("UNKNOWN");
  });
});
