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
