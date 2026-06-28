/**
 * Phase 1 acceptance — Requirements Engine.
 * Proves the roadmap "Done when":
 *   1. A case shows a personalized satisfied/pending/N-A checklist driven by DB
 *      rows, each item carrying its req_code + authority.
 *   2. Retiring a registry version + adding a new one changes FUTURE cases while
 *      leaving existing cases pointing at their original version.
 *   3. RLS: a client sees only their own case_requirements and cannot write them;
 *      the registry is readable.
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-p1.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { materializeCaseRequirements } from "../lib/requirements/materialize"

loadEnv({ path: ".env.local" })

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
const tadmin = admin as unknown as SupabaseClient<Database>

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
function today(offset = 0): string {
  return new Date(Date.now() + offset * 86400000).toISOString().slice(0, 10)
}

async function caseIdForClient(fullName: string): Promise<string> {
  const { data } = await admin
    .from("clients")
    .select("id, cases(id)")
    .eq("full_name", fullName)
    .single()
  // @ts-expect-error untyped admin embed
  return (Array.isArray(data?.cases) ? data?.cases[0]?.id : data?.cases?.id) as string
}

async function main() {
  console.log("\n— Phase 1 verification —\n")

  // ── 1. Personalized + traceable checklist ────────────────────────────────
  const samCase = await caseIdForClient("Sam Chen")
  const { data: samReqs } = await admin
    .from("case_requirements")
    .select("req_code, status, document_id, requirement:requirements(authority, document_type)")
    .eq("case_id", samCase)
  const rows = (samReqs ?? []) as Array<{
    req_code: string
    status: string
    document_id: string | null
    requirement: { authority: string | null; document_type: string | null } | { authority: string | null; document_type: string | null }[] | null
  }>
  const byCode = new Map(rows.map((r) => [r.req_code, r]))
  const reqOf = (r: (typeof rows)[number] | undefined) =>
    r ? (Array.isArray(r.requirement) ? r.requirement[0] : r.requirement) : null

  check(rows.length >= 20, `Sam Chen has a full materialized checklist (${rows.length} rows)`)
  check(byCode.get("ARR-01")?.status === "pending", "ARR-01 spawned & pending (arrest history triggered it)")
  check(byCode.get("OOP-01")?.status === "na", "OOP-01 is N/A (no order-of-protection history)")
  check(byCode.get("COH-01")?.status === "pending", "COH-01 applicable (has cohabitant)")
  check(!!reqOf(byCode.get("ARR-01"))?.authority, "ARR-01 carries an authority citation")
  const satisfiedBound = rows.filter((r) => r.status === "satisfied" && r.document_id)
  check(satisfiedBound.length > 0, `satisfied requirements are bound to evidence (${satisfiedBound.length} doc-bound)`)
  const statuses = new Set(rows.map((r) => r.status))
  check(
    statuses.has("satisfied") && statuses.has("pending") && statuses.has("na"),
    "checklist surfaces all of satisfied / pending / N-A"
  )

  // ── 2. Versioning isolation ───────────────────────────────────────────────
  const { data: nyc } = await admin.from("jurisdiction_profiles").select("id").eq("key", "nyc").single()
  const { data: v1 } = await admin
    .from("requirements")
    .select("id")
    .eq("jurisdiction_id", nyc!.id)
    .eq("req_code", "REF-01")
    .is("effective_to", null)
    .single()
  const V1 = v1!.id

  // An existing case already points REF-01 at V1.
  const oldCase = await caseIdForClient("Alex Morgan")
  const { data: oldBefore } = await admin
    .from("case_requirements")
    .select("requirement_id")
    .eq("case_id", oldCase)
    .eq("req_code", "REF-01")
    .single()
  check(oldBefore?.requirement_id === V1, "existing case REF-01 points at the in-force version (V1)")

  // Retire V1, add V2 (new in-force version).
  await admin.from("requirements").update({ effective_to: today(-1) }).eq("id", V1)
  const { data: v2 } = await admin
    .from("requirements")
    .insert({
      jurisdiction_id: nyc!.id,
      req_code: "REF-01",
      title: "Three character references (revised)",
      authority: "38 RCNY §5-03 (revised test version)",
      validation_rule: { kind: "reference_count", min: 3 },
      trigger_cond: "always",
      severity: "watch",
      effective_from: today(0),
    })
    .select("id")
    .single()
  const V2 = v2!.id

  // New case generated now should pick V2.
  const tmpClient = await admin
    .from("clients")
    .insert({ full_name: "ZZ Version Test", track: "resident", current_stage: "lead" })
    .select("id")
    .single()
  const tmpCase = await admin
    .from("cases")
    .insert({ client_id: tmpClient.data!.id, stage: "lead", status: "active" })
    .select("id")
    .single()
  await materializeCaseRequirements(tadmin, tmpCase.data!.id, "nyc", { isCarry: true })

  const { data: newRef } = await admin
    .from("case_requirements")
    .select("requirement_id")
    .eq("case_id", tmpCase.data!.id)
    .eq("req_code", "REF-01")
    .single()
  check(newRef?.requirement_id === V2, "a NEW case picks up the new version (V2)")

  const { data: oldAfter } = await admin
    .from("case_requirements")
    .select("requirement_id")
    .eq("case_id", oldCase)
    .eq("req_code", "REF-01")
    .single()
  check(oldAfter?.requirement_id === V1, "the existing case is UNTOUCHED (still V1) after the version change")

  // restore registry + clean temp rows
  await admin.from("clients").delete().eq("id", tmpClient.data!.id) // cascades case + case_requirements
  await admin.from("requirements").delete().eq("id", V2)
  await admin.from("requirements").update({ effective_to: null }).eq("id", V1)

  // ── 3. RLS scoping ────────────────────────────────────────────────────────
  const jordanCase = await caseIdForClient("Jordan Rivera")
  const c1 = createClient(URL, ANON, { auth: { persistSession: false } })
  await c1.auth.signInWithPassword({ email: "client1@carrypath.test", password: "Passw0rd!" })

  const { data: mine } = await c1.from("case_requirements").select("id").eq("case_id", jordanCase)
  check((mine?.length ?? 0) > 0, "client can read their OWN case_requirements")

  const { data: theirs } = await c1.from("case_requirements").select("id").eq("case_id", samCase)
  check((theirs?.length ?? 0) === 0, "client CANNOT read another client's case_requirements (RLS)")

  const { data: reg } = await c1.from("requirements").select("id").limit(1)
  check((reg?.length ?? 0) > 0, "client can read the requirements registry")

  const { error: writeErr } = await c1
    .from("case_requirements")
    .insert({ case_id: jordanCase, requirement_id: V1, req_code: "REF-01", status: "satisfied" })
  check(!!writeErr, "client CANNOT write case_requirements (RLS denies)")

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Phase 1\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
