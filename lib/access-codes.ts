import "server-only"
import { createHash, timingSafeEqual } from "node:crypto"

/**
 * ACCESS CODES · Phase 1 — comp codes that unlock Self-Guided or Full Concierge
 * without payment (demos, comped partners, the lead trainer). The codes live in a
 * SERVER-ONLY env var (never NEXT_PUBLIC_*), so the plaintext never reaches the
 * browser bundle. Matching is timing-safe over SHA-256 digests. If ACCESS_CODES
 * is unset the whole feature is off and the UI link doesn't render.
 *
 *   ACCESS_CODES="CODE:packageKey:kind:flavor,CODE2:..."
 *     packageKey — self_guided | full_concierge | *   (either)
 *     kind       — comp                                 (Phase 1)
 *     flavor     — demo (marks the case is_demo) | comp (a real comped customer)
 */

export type AccessCodeKind = "comp"
export type AccessCodeFlavor = "demo" | "comp"

interface AccessCode {
  code: string // normalised plaintext — server-only, never sent to the client
  label: string // for the audit log (e.g. "DEMO"), never the raw secret
  packageKey: string // self_guided | full_concierge | *
  kind: AccessCodeKind
  flavor: AccessCodeFlavor
}

export interface MatchedAccessCode {
  label: string
  packageKey: string
  flavor: AccessCodeFlavor
}

/** Trim, uppercase, strip whitespace, cap length before any work. */
export function normaliseAccessCode(input: string): string {
  return input.trim().toUpperCase().replace(/\s+/g, "").slice(0, 64)
}

function labelFor(code: string): string {
  const parts = code.split("-")
  return parts.length >= 2 ? parts[1] : code.slice(0, 8)
}

function parseCodes(): AccessCode[] {
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
  return { label: matched.label, packageKey: matched.packageKey, flavor: matched.flavor }
}
