import "server-only"
import { createHash, timingSafeEqual } from "node:crypto"

/**
 * ACCESS CODES · server-side comp and fixed-price concierge codes. The codes live
 * in SERVER-ONLY env vars (never NEXT_PUBLIC_*), so plaintext never reaches the
 * browser bundle. Matching is timing-safe over SHA-256 digests. Comp codes unlock
 * a package at $0; discount codes only authorize a server-derived checkout price.
 *
 *   ACCESS_CODES="CODE:packageKey:kind:flavor,CODE2:..."
 *     packageKey — self_guided | full_concierge | *   (either)
 *     kind       — comp                                 (Phase 1)
 *     flavor     — demo (marks the case is_demo) | comp (a real comped customer)
 *
 *   DISCOUNT_CODES="CODE:packageKey:priceCents:maxUses,CODE2:..."
 *   DISCOUNT_CODES_EXTRA="CODE3:packageKey:priceCents:maxUses"
 *     priceCents — final full-payment price in cents (for example 75000)
 *     maxUses — number of distinct client cases allowed to claim it (default 1)
 *
 * The additive variable lets us issue a personalized voucher without replacing
 * encrypted discount codes already configured in Vercel.
 */

export type AccessCodeKind = "comp" | "discount"
export type AccessCodeFlavor = "demo" | "comp"

interface AccessCode {
  code: string // normalised plaintext — server-only, never sent to the client
  label: string // for the audit log (e.g. "DEMO"), never the raw secret
  packageKey: string // self_guided | full_concierge | *
  kind: AccessCodeKind
  flavor: AccessCodeFlavor
  priceCents?: number // discount codes only — final price, never a client value
  maxUses?: number // discount codes only — bounded server-side usage allowance
}

export interface MatchedAccessCode {
  label: string
  packageKey: string
  kind: AccessCodeKind
  flavor: AccessCodeFlavor
  priceCents?: number
  maxUses?: number
  fingerprint: string // safe to persist; never the plaintext code
}

/** Trim, uppercase, strip whitespace, cap length before any work. */
export function normaliseAccessCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "").slice(0, 64)
}

function labelFor(code: string): string {
  const parts = code.split("-")
  return parts.length >= 2 ? parts[1] : code.slice(0, 8)
}

function parseCompCodes(): AccessCode[] {
  const raw = process.env.ACCESS_CODES
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((entry) => {
      const [code, packageKey, kind, flavor] = entry.split(":").map((x) => (x ?? "").trim())
      const norm = normaliseAccessCode(code ?? "")
      return {
        code: norm,
        label: labelFor(norm),
        packageKey: packageKey || "*",
        kind: (kind || "comp") as AccessCodeKind,
        flavor: (flavor === "demo" ? "demo" : "comp") as AccessCodeFlavor,
      }
    })
    .filter((c) => c.code.length > 0)
}

function parseDiscountCodes(): AccessCode[] {
  const raw = [process.env.DISCOUNT_CODES, process.env.DISCOUNT_CODES_EXTRA]
    .filter((value): value is string => Boolean(value?.trim()))
    .join(",")
  if (!raw) return []
  return raw
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .flatMap((entry) => {
      const [code, packageKey, price, maxUsesRaw] = entry.split(":").map((x) => (x ?? "").trim())
      const norm = normaliseAccessCode(code ?? "")
      const priceCents = Number(price)
      const maxUses = Number(maxUsesRaw || "1")
      if (
        !norm ||
        !packageKey ||
        !Number.isSafeInteger(priceCents) ||
        priceCents <= 0 ||
        !Number.isSafeInteger(maxUses) ||
        maxUses < 1 ||
        maxUses > 10
      ) {
        return []
      }
      return [{
        code: norm,
        label: labelFor(norm),
        packageKey,
        kind: "discount" as const,
        flavor: "comp" as const,
        priceCents,
        maxUses,
      }]
    })
}

function parseCodes(): AccessCode[] {
  return [...parseCompCodes(), ...parseDiscountCodes()]
}

/** Whether the feature is configured at all (drives whether the UI renders). */
export function accessCodesEnabled(): boolean {
  return parseCodes().length > 0
}

function sha256(s: string): Buffer {
  return createHash("sha256").update(s).digest()
}

/**
 * Timing-safe match. Iterates ALL configured codes (no early exit) and compares
 * equal-length SHA-256 digests, so the response time doesn't leak which code — or
 * whether any — matched. Returns the code ONLY if it also allows the requested
 * package; a right-code/wrong-package attempt returns null, identical to unknown,
 * so the field is never an oracle. Callers must surface ONE generic failure.
 */
export function matchAccessCode(input: string, requestedPackage: string): MatchedAccessCode | null {
  const normalised = normaliseAccessCode(input)
  if (!normalised) return null
  const target = sha256(normalised)
  let matched: AccessCode | null = null
  for (const c of parseCodes()) {
    const candidate = sha256(c.code)
    if (candidate.length === target.length && timingSafeEqual(candidate, target)) {
      matched = c
    }
  }
  if (!matched) return null
  if (matched.packageKey !== "*" && matched.packageKey !== requestedPackage) return null
  return {
    label: matched.label,
    packageKey: matched.packageKey,
    kind: matched.kind,
    flavor: matched.flavor,
    priceCents: matched.priceCents,
    maxUses: matched.maxUses,
    fingerprint: target.toString("hex"),
  }
}
