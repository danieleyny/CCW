/**
 * V3-P0 — minimal in-memory sliding-window rate limiter for public,
 * unauthenticated entry points (token flows, lead capture).
 *
 * Scope honesty: on serverless each instance has its own memory, so this is a
 * per-instance brake on bursts, not a global quota. That is the right tool for
 * what it guards: the tokens themselves are 122-bit UUIDs (enumeration is
 * infeasible); this stops one client hammering a known endpoint. A durable
 * store (Upstash/pg) can replace `hit` without changing call sites.
 */

const buckets = new Map<string, number[]>()
const MAX_KEYS = 10_000 // memory backstop

/** Record a hit for `key`; returns false when over `limit` per `windowMs`. */
export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now()
  const cutoff = now - windowMs

  if (buckets.size > MAX_KEYS) buckets.clear()

  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  return true
}

/** First client IP from proxy headers (best-effort; Vercel sets x-forwarded-for). */
export function clientIpFrom(headers: Headers): string {
  const fwd = headers.get("x-forwarded-for")
  if (fwd) return fwd.split(",")[0]!.trim()
  return headers.get("x-real-ip") ?? "unknown"
}
