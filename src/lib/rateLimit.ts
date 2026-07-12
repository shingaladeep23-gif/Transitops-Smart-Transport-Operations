// In-memory sliding-window rate limiter for login attempts.
// Sufficient for a single-instance deployment; swap for Redis when scaling out.
const attempts = new Map<string, number[]>();

const WINDOW_MS = 15 * 60 * 1000;
const MAX_ATTEMPTS = 10;

export function isRateLimited(key: string): boolean {
  const now = Date.now();
  const recent = (attempts.get(key) ?? []).filter((t) => now - t < WINDOW_MS);
  attempts.set(key, recent);
  return recent.length >= MAX_ATTEMPTS;
}

export function recordFailedAttempt(key: string) {
  const list = attempts.get(key) ?? [];
  list.push(Date.now());
  attempts.set(key, list);
}

export function clearAttempts(key: string) {
  attempts.delete(key);
}
