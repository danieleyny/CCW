/**
 * PART A / Phase 1 — shared vocabulary for a requirement's legal enforcement
 * status. Deliberately dependency-free: the reminder engine (service-role), a
 * "use server" action module, and client components all import from here.
 * A `"use server"` file may only export async functions, so constants cannot
 * live alongside the actions that use them.
 *
 * The DB is the source of truth (`requirements.legal_status`, plus the
 * coerce-trigger and CHECK in 20260719000100). This module only names things.
 */

export type LegalStatus = "enforced" | "enjoined_not_enforced" | "contested" | "repealed"

/** How long an attorney verification stands before we ask for a fresh look. */
export const LEGAL_REVIEW_STALE_DAYS = 90

/**
 * Statuses that can never block filing. The database enforces this — these
 * lists exist so the UI can explain it, not so the UI can decide it.
 */
export const UNENFORCED_STATUSES: readonly LegalStatus[] = ["enjoined_not_enforced", "repealed"]

export function isUnenforced(status: string | null | undefined): boolean {
  return (UNENFORCED_STATUSES as readonly string[]).includes(status ?? "")
}
