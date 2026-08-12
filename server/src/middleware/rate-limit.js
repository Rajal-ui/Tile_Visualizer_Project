/**
 * Minimal in-memory fixed-window rate limiter. Good enough for a single-instance
 * dev tool; swap for a Redis-backed limiter if the app is ever deployed
 * multi-instance.
 *
 * @param {{ windowMs?: number, max?: number, message?: string }} opts
 */
export function rateLimit({
  windowMs = 15 * 60 * 1000,
  max = 5,
  message = "Too many requests, please try again later.",
} = {}) {
  const hits = new Map();

  const sweep = () => {
    const now = Date.now();
    for (const [key, entry] of hits) {
      if (now - entry.reset >= windowMs) hits.delete(key);
    }
  };

  return function rateLimitMiddleware(req, res, next) {
    const key = req.ip || req.socket?.remoteAddress || "unknown";
    const now = Date.now();
    const entry = hits.get(key);
    if (!entry || now >= entry.reset) {
      hits.set(key, { count: 1, reset: now + windowMs });
      return next();
    }
    if (entry.count >= max) {
      return res.status(429).json({ error: message });
    }
    entry.count += 1;
    // Bound the map size on writes (cheap enough for a dev tool).
    if (hits.size > 10_000) sweep();
    return next();
  };
}
