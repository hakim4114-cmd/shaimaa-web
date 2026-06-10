export const maxLoginAttempts = 5;
export const loginLockoutMs = 15 * 60 * 1000;

export function createLoginRateLimiter({ maxAttempts = maxLoginAttempts, lockoutMs = loginLockoutMs } = {}) {
  let failureTimestamps = [];

  function pruneExpiredFailures(now) {
    failureTimestamps = failureTimestamps.filter((timestamp) => now - timestamp < lockoutMs);
  }

  return {
    isLocked(now = Date.now()) {
      pruneExpiredFailures(now);
      return failureTimestamps.length >= maxAttempts;
    },
    recordFailure(now = Date.now()) {
      pruneExpiredFailures(now);
      failureTimestamps.push(now);
    },
    reset() {
      failureTimestamps = [];
    }
  };
}
