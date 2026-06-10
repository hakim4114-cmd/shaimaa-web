import { describe, expect, it } from "vitest";
import {
  adminSessionMaxAgeSeconds,
  createAdminSessionValue,
  verifyAdminSessionValue
} from "../adminSession";

const secret = "test-secret-value";

describe("admin session cookie", () => {
  it("verifies a freshly created session value", async () => {
    const value = await createAdminSessionValue(secret);

    expect(await verifyAdminSessionValue(value, secret)).toBe(true);
  });

  it("rejects a session signed with a different secret", async () => {
    const value = await createAdminSessionValue("other-secret");

    expect(await verifyAdminSessionValue(value, secret)).toBe(false);
  });

  it("rejects an expired session", async () => {
    const issuedAt = Date.now() - (adminSessionMaxAgeSeconds + 60) * 1000;
    const value = await createAdminSessionValue(secret, issuedAt);

    expect(await verifyAdminSessionValue(value, secret)).toBe(false);
  });

  it("rejects a session whose expiry was tampered with", async () => {
    const value = await createAdminSessionValue(secret);
    const [, signature] = value.split(".");
    const tampered = `${Date.now() + 1000 * 60 * 60 * 24}.${signature}`;

    expect(await verifyAdminSessionValue(tampered, secret)).toBe(false);
  });

  it("rejects malformed and empty values", async () => {
    expect(await verifyAdminSessionValue("", secret)).toBe(false);
    expect(await verifyAdminSessionValue("not-a-session", secret)).toBe(false);
    expect(await verifyAdminSessionValue("12345", secret)).toBe(false);
    expect(await verifyAdminSessionValue(undefined, secret)).toBe(false);
  });

  it("rejects everything when the secret is missing", async () => {
    const value = await createAdminSessionValue(secret);

    expect(await verifyAdminSessionValue(value, "")).toBe(false);
  });
});
