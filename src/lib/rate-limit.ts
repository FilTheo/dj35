const windowMs = 60 * 1000; // 1 minute
const maxRequests = 10;

const requests = new Map<string, number[]>();

export function checkRateLimit(ip: string): { allowed: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const windowStart = now - windowMs;

  let timestamps = requests.get(ip) ?? [];
  timestamps = timestamps.filter((t) => t > windowStart);

  if (timestamps.length >= maxRequests) {
    const oldestInWindow = timestamps[0];
    return { allowed: false, retryAfterMs: oldestInWindow + windowMs - now };
  }

  timestamps.push(now);
  requests.set(ip, timestamps);

  // Cleanup old entries periodically
  if (requests.size > 1000) {
    for (const [key, ts] of requests) {
      const filtered = ts.filter((t) => t > windowStart);
      if (filtered.length === 0) requests.delete(key);
      else requests.set(key, filtered);
    }
  }

  return { allowed: true };
}
