/**
 * V3-P3.1 — service packages live in the DB (service_packages): a pricing
 * change is an admin data edit, not a deploy. No `server-only` so scripts and
 * the verify harness can read them too.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

export interface ServicePackage {
  key: string
  name: string
  blurb: string
  priceCents: number
  depositCents: number
  priceLabel: string
  featured: boolean
  refilePromise: boolean
}

export async function getActivePackages(db: DB): Promise<ServicePackage[]> {
  const { data } = await db
    .from("service_packages")
    .select("key, name, blurb, price_cents, deposit_cents, price_label, featured, refile_promise")
    .eq("active", true)
    .order("sort", { ascending: true })
  return (data ?? []).map((p) => ({
    key: p.key,
    name: p.name,
    blurb: p.blurb,
    priceCents: p.price_cents,
    depositCents: p.deposit_cents,
    priceLabel: p.price_label ?? `$${(p.price_cents / 100).toLocaleString("en-US")}`,
    featured: p.featured,
    refilePromise: p.refile_promise,
  }))
}

export async function getPackage(db: DB, key: string): Promise<ServicePackage | null> {
  const all = await getActivePackages(db)
  return all.find((p) => p.key === key) ?? null
}

/**
 * CONCIERGE QA Phase 3 — THE single "has this case paid for package X?" test.
 * The concierge unlock, the portal home, the choose-path resume, the work queue,
 * and the reminders engine all call this, so the unlock rule lives in ONE place
 * (it used to be duplicated across five files). Paid = a payments row with
 * status='paid' and this package_key — whether that arrived via self-serve
 * Stripe, a staff-issued invoice, or a recorded offline payment.
 */
export async function hasPaidPackage(db: DB, caseId: string, key: string): Promise<boolean> {
  const { data } = await db
    .from("payments")
    .select("id")
    .eq("case_id", caseId)
    .eq("status", "paid")
    .eq("package_key", key)
    .limit(1)
  return (data ?? []).length > 0
}

/**
 * The BATCH form of the same rule — the set of caseIds (from the given list) that
 * have paid for package `key`. The work queue and reminders engine use this so
 * they share hasPaidPackage's exact definition without an N+1.
 */
export async function paidPackageCaseIds(db: DB, caseIds: string[], key: string): Promise<Set<string>> {
  if (caseIds.length === 0) return new Set()
  const { data } = await db
    .from("payments")
    .select("case_id")
    .eq("status", "paid")
    .eq("package_key", key)
    .in("case_id", caseIds)
  return new Set((data ?? []).map((p) => p.case_id).filter((x): x is string => !!x))
}
