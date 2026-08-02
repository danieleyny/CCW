/**
 * V3-P0 — minimal in-memory sliding-window rate limiter for public,
 * unauthenticated entry points (token flows, lead capture, signup/login).
 *
 * Scope honesty: on serverless each instance has its own memory, so this is a
 * per-instance brake on bursts, not a global quota. That is the right tool for
 * what it guards: the tokens themselves are 122-bit UUIDs (enumeration is
 * infeasible); this stops one client hammering a known endpoint. A durable
 * store (Upstash/pg) can replace `rateLimit` without changing call sites.
 */

const buckets = new Map<string, number[]>()
const MAX_KEYS = 10_000 // memory backstop

/**
 * SEC-05 — bounded, per-key eviction. The old code called `buckets.clear()` on
 * overflow, which an attacker could trigger by spraying unique keys to RESET
 * everyone else's window (including a victim they were brute-forcing). Instead,
 * drop only keys whose entire window has expired; if still over the cap, evict
 * the least-recently-hit keys. One key's flood can no longer clear another's.
 */
function evictIfNeeded(now: number, windowMs: number): void {
  if (buckets.size <= MAX_KEYS) return
  for (const [key, hits] of buckets) {
    const last = hits[hits.length - 1] ?? 0
    if (last <= now - windowMs) buckets.delete(key)
  }
  if (buckets.size <= MAX_KEYS) return
  // Still over: evict oldest-last-hit first until back under the cap.
  const byAge = [...buckets.entries()].sort(
    (a, b) => (a[1][a[1].length - 1] ?? 0) - (b[1][b[1].length - 1] ?? 0)
  )
  for (const [key] of byAge) {
    if (buckets.size <= MAX_KEYS) break
    buckets.delete(key)
  }
}

/** Record a hit for `key`; returns false when over `limit` per `windowMs`. */
export function rateLimit(key: string, limit = 20, windowMs = 60_000): boolean {
  const now = Date.now()
  const cutoff = now - windowMs

  evictIfNeeded(now, windowMs)

  const hits = (buckets.get(key) ?? []).filter((t) => t > cutoff)
  if (hits.length >= limit) {
    buckets.set(key, hits)
    return false
  }
  hits.push(now)
  buckets.set(key, hits)
  return true
}

/**
 * Best-effort client IP from proxy headers.
 *
 * SEC-05 — do NOT trust the leftmost `x-forwarded-for` entry: a client can send
 * their own `X-Forwarded-For`, and the platform APPENDS the real address, so the
 * leftmost value is attacker-controlled (letting them mint unlimited rate-limit
 * keys). Prefer `x-real-ip` (a single value the platform sets), then fall back to
 * the RIGHTMOST forwarded entry (the hop the trusted proxy actually added).
 */
export function clientIpFrom(headers: Headers): string {
  const real = headers.get("x-real-ip")?.trim()
  if (real) return real
  const fwd = headers.get("x-forwarded-for")
  if (fwd) {
    const parts = fwd.split(",").map((p) => p.trim()).filter(Boolean)
    if (parts.length) return parts[parts.length - 1]!
  }
  return "unknown"
}
