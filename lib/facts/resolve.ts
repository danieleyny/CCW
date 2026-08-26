import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import type { WizardAnswers } from "@/lib/intake/answers"
import { FACTS, EDITABLE_FACTS, factDef, type FactSource } from "./registry"

type DB = SupabaseClient<Database>

/** Load the intake/clients/sponsors backing for a case's facts. */
export async function loadFactSource(db: DB, caseId: string): Promise<FactSource> {
  const [{ data: intake }, { data: kase }, { data: sp }] = await Promise.all([
    db.from("intake_sessions").select("answers").eq("case_id", caseId).maybeSingle(),
    db.from("cases").select("clients:client_id(full_name, email, phone, borough, zip)").eq("id", caseId).maybeSingle(),
    db
      .from("case_sponsorships")
      .select("sponsor:sponsors(legal_name, agency_license_number, agency_license_expires, custodian_name, custodian_license_number, business_street, business_city, business_state, business_zip, business_phone, business_type)")
      .eq("case_id", caseId)
      .limit(1)
      .maybeSingle(),
  ])
  const c = (kase?.clients as unknown as { full_name?: string; email?: string; phone?: string; borough?: string; zip?: string } | null) ?? {}
  const s = (sp?.sponsor as unknown as {
    legal_name?: string
    agency_license_number?: string
    agency_license_expires?: string
    custodian_name?: string
    custodian_license_number?: string
    business_street?: string
    business_city?: string
    business_state?: string
    business_zip?: string
    business_phone?: string
    business_type?: string
  } | null) ?? null
  return {
    intake: (intake?.answers ?? {}) as WizardAnswers,
    client: { fullName: c.full_name ?? "", email: c.email ?? null, phone: c.phone ?? null, borough: c.borough ?? null, zip: c.zip ?? null },
    sponsor: s
      ? {
          legalName: s.legal_name ?? null,
          agencyLicenseNumber: s.agency_license_number ?? null,
          agencyLicenseExpiry: s.agency_license_expires ?? null,
          custodianName: s.custodian_name ?? null,
          custodianLicenseNumber: s.custodian_license_number ?? null,
          businessStreet: s.business_street ?? null,
          businessCity: s.business_city ?? null,
          businessState: s.business_state ?? null,
          businessZip: s.business_zip ?? null,
          businessPhone: s.business_phone ?? null,
          businessType: s.business_type ?? null,
        }
      : null,
  }
}

export interface ResolveOpts {
  /** When set, form-local overrides for this requirement win over the shared fact. */
  reqCode?: string
  /** Limit to these keys (default: all registered facts). */
  keys?: string[]
}

/**
 * Resolve facts for a case: case_facts row (the canonical answer, or a form-local
 * override when reqCode is given) → derived → from the intake/clients/sponsors
 * record → "". Batched — one read of case_facts, one of the source. No N+1.
 */
export async function resolveFacts(db: DB, caseId: string, opts: ResolveOpts = {}): Promise<Record<string, string>> {
  const { data: rows } = await db.from("case_facts").select("key, value, override_req_code").eq("case_id", caseId)
  const shared = new Map<string, string>()
  const overrides = new Map<string, string>()
  for (const r of rows ?? []) {
    if (!r.override_req_code) shared.set(r.key, r.value ?? "") // '' (or null) = shared
    else if (opts.reqCode && r.override_req_code === opts.reqCode) overrides.set(r.key, r.value ?? "")
  }
  const source = await loadFactSource(db, caseId)
  const cache = new Map<string, string>()
  const get = (key: string): string => {
    if (cache.has(key)) return cache.get(key)!
    cache.set(key, "") // guard against a cyclic derive
    const def = factDef(key)
    let val = ""
    if (overrides.has(key)) val = overrides.get(key)!
    else if (shared.has(key)) val = shared.get(key)!
    else if (def?.derive) val = def.derive(get)
    else if (def?.from) val = def.from(source) ?? ""
    cache.set(key, val)
    return val
  }
  const keys = opts.keys ?? FACTS.map((f) => f.key)
  const out: Record<string, string> = {}
  for (const k of keys) out[k] = get(k)
  return out
}

export async function resolveFact(db: DB, caseId: string, key: string): Promise<string> {
  return (await resolveFacts(db, caseId, { keys: [key] }))[key] ?? ""
}

/**
 * Backfill case_facts from intake/clients/sponsors — the working truth seeded from
 * the interview record. Idempotent: only inserts a shared row for a fact that has
 * a source value and doesn't already have one.
 */
export async function backfillCaseFacts(admin: DB, caseId: string): Promise<number> {
  const { data: existing } = await admin.from("case_facts").select("key").eq("case_id", caseId).eq("override_req_code", "")
  const have = new Set((existing ?? []).map((r) => r.key))
  const source = await loadFactSource(admin, caseId)
  const rows = EDITABLE_FACTS.filter((f) => f.from && !have.has(f.key))
    .map((f) => {
      const v = (f.from!(source) ?? "").trim()
      return v ? { case_id: caseId, key: f.key, value: v, sensitive: !!f.sensitive, source: "intake" } : null
    })
    .filter((r): r is NonNullable<typeof r> => r != null)
  if (rows.length) await admin.from("case_facts").insert(rows)
  return rows.length
}
