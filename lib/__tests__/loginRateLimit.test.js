import { describe, expect, it } from "vitest";
import { createLoginRateLimiter, loginLockoutMs, maxLoginAttempts } from "../loginRateLimit";

describe("login rate limiter", () => {
  it("is unlocked before any failures", () => {
    const limiter = createLoginRateLimiter();

    expect(limiter.isLocked()).toBe(false);
  });

  it("locks after the maximum number of failed attempts", () => {
    const limiter = createLoginRateLimiter();
    const now = Date.now();

    for (let attempt = 0; attempt < maxLoginAttempts; attempt += 1) {
      expect(limiter.isLocked(now)).toBe(false);
      limiter.recordFailure(now);
    }

    expect(limiter.isLocked(now)).toBe(true);
  });

  it("unlocks again after the lockout window passes", () => {
    const limiter = createLoginRateLimiter();
    const now = Date.now();

    for (let attempt = 0; attempt < maxLoginAttempts; attempt += 1) {
      limiter.recordFailure(now);
    }

    expect(limiter.isLocked(now)).toBe(true);
    expect(limiter.isLocked(now + loginLockoutMs + 1)).toBe(false);
  });

  it("unlocks immediately after a successful login resets it", () => {
    const limiter = createLoginRateLimiter();
    const now = Date.now();

    for (let attempt = 0; attempt < maxLoginAttempts; attempt += 1) {
      limiter.recordFailure(now);
    }

    limiter.reset();

    expect(limiter.isLocked(now)).toBe(false);
  });
});
