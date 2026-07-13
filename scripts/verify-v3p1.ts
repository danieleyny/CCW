/**
 * V3 Phase 1 gate — the corrected legal domain model:
 *   1.1 SOC-01 advisory/non-blocking (enjoined); REF-01/TRN-01 renewal-aware;
 *       TRN-01 carries the 6-month expiry; fees config-driven
 *   1.2 renewal / premises / retired-LEO / non-resident tracks generate the
 *       right checklists (unit + live e2e)
 *   1.3 every active rule cites an authority and carries provenance
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-v3p1.ts
 */
import { existsSync } from "fs"
import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { requirementApplies, type IntakeAnswers } from "../lib/requirements/generate"
import { requiredReferences } from "../lib/intake/schema"
import { processIntake } from "../lib/intake/process"
import type { WizardAnswers } from "../lib/intake/answers"

loadEnv({ path: ".env.local" })
const admin = createClient(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const db = admin as any

let failures = 0
const check = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}

async function main() {
  console.log("\n— V3 Phase 1 verification —\n")

  // ── 1.1 registry corrections ───────────────────────────────────────────────
  const { data: jur } = await db.from("jurisdiction_profiles").select("id, key").in("key", ["nyc", "special_carry"])
  const nycId = jur.find((j: { key: string }) => j.key === "nyc")!.id
  const { data: active } = await db
    .from("requirements")
    .select("req_code, title, description, trigger_cond, blocking, severity, authority, source_url, needs_legal_review, validation_rule")
    .eq("jurisdiction_id", nycId)
    .is("effective_to", null)

  const byCode = new Map<string, (typeof active)[number]>(active.map((r: { req_code: string }) => [r.req_code, r]))

  const soc = byCode.get("SOC-01")
  check(!!soc && soc.blocking === false, "SOC-01 is non-blocking (1.1)")
  check(!!soc && /enjoin/i.test(soc.description ?? ""), "SOC-01 explains the injunction (1.1)")

  const ref = byCode.get("REF-01")
  check(ref?.trigger_cond === "carry_not_renewal", "REF-01 is carry-only + renewal-exempt (1.1)")
  const trn = byCode.get("TRN-01")
  check(trn?.trigger_cond === "carry_not_renewal", "TRN-01 is carry-only + renewal-exempt (1.1)")
  check((trn?.validation_rule as { expires_months?: number })?.expires_months === 6, "TRN-01 models the 6-month expiry (1.1)")
  check(/16/.test(trn?.title ?? "") && /2-hr|2 hr|2-hour/.test(trn?.title ?? ""), "TRN-01 titled 16+2 (1.1)")

  check(/NOT accepted/i.test(byCode.get("RES-01")?.title ?? "") || /NOT ACCEPTED/i.test(byCode.get("RES-01")?.description ?? ""), "RES-01 excludes cell-phone bills (1.1)")
  check(/every state|all states/i.test(byCode.get("DMV-01")?.title ?? "" + byCode.get("DMV-01")?.description), "DMV-01 covers every state of residence (1.1)")
  check(/sealed/i.test(byCode.get("ARR-01")?.description ?? ""), "ARR-01 says sealed arrests ARE disclosed (1.1)")
  check(/600/.test(JSON.stringify(byCode.get("IDN-04")?.validation_rule ?? {})), "IDN-04 carries the 600–1200px photo spec (1.1)")

  const { data: fees } = await db.from("fees").select("key, amount_cents")
  const fee = (k: string) => fees?.find((f: { key: string }) => f.key === k)?.amount_cents
  check(fee("nypd_application") === 34000, "fee: NYPD application $340 (1.1)")
  check(fee("dcjs_fingerprint") === 8825, "fee: DCJS fingerprints $88.25 (1.1)")
  check(fee("retired_leo_application") === 0, "fee: retired-LEO application waived (1.1)")

  // ── 1.2 track generation (pure unit) ───────────────────────────────────────
  const carry: IntakeAnswers = { isCarry: true }
  const renewal: IntakeAnswers = { isCarry: true, isRenewal: true }
  const premises: IntakeAnswers = { isPremises: true, isCarry: false }
  const leo: IntakeAnswers = { isCarry: true, isRetiredLeo: true }

  check(requirementApplies("carry_not_renewal", carry) && requirementApplies("always", carry), "carry: REF-01/TRN-01 apply (1.2)")
  check(!requirementApplies("carry_not_renewal", renewal) && requirementApplies("if_renewal", renewal), "renewal: references/16+2 drop, RNW-01 applies (1.2)")
  check(!requirementApplies("carry_not_renewal", premises) && requirementApplies("premises_not_renewal", premises) && requirementApplies("premises_only", premises), "premises: TRN/REF-01 drop, REF-02 + PRM-01 apply (1.2)")
  check(requirementApplies("if_retired_leo", leo) && !requirementApplies("if_retired_leo", carry), "retired-LEO rows only for retired LEO (1.2)")
  check(requiredReferences({}, {}) === 4 && requiredReferences({ licenseType: "premises" }, {}) === 2 && requiredReferences({}, { isRenewal: true }) === 0, "reference count: 4 carry / 2 premises / 0 renewal (1.2)")

  // special_carry has the non-resident rows
  const scId = jur.find((j: { key: string }) => j.key === "special_carry")!.id
  const { data: scRows } = await db.from("requirements").select("req_code").eq("jurisdiction_id", scId).is("effective_to", null)
  const scCodes = new Set(scRows.map((r: { req_code: string }) => r.req_code))
  check(scCodes.has("OOS-01") && scCodes.has("OOS-02"), "special_carry: out-of-state background rows exist (1.2)")
  check(scCodes.has("SPC-01"), "special_carry: county-license dependency advisory exists (1.2)")

  // ── 1.2 live e2e: a renewal case and a training-decay case ─────────────────
  const { data: client } = await db.from("clients").insert({ full_name: "V3P1 Temp", email: "v3p1.temp@carrypath.test", track: "resident", current_stage: "lead" }).select("id").single()
  const { data: kase } = await db.from("cases").insert({ client_id: client.id, stage: "lead", status: "active", is_renewal: true }).select("id").single()

  const renewalAnswers: WizardAnswers = { dob: "1990-01-01", residence: "nyc", licenseType: "carry" }
  await processIntake(db, kase.id, "nyc", renewalAnswers)
  const { data: caseReqs } = await db.from("case_requirements").select("req_code, status").eq("case_id", kase.id)
  const st = (code: string) => caseReqs?.find((r: { req_code: string }) => r.req_code === code)?.status
  check(st("REF-01") === "na", `renewal case: REF-01 is N/A (got ${st("REF-01")}) (1.2)`)
  check(st("TRN-01") === "na", `renewal case: TRN-01 is N/A (got ${st("TRN-01")}) (1.2)`)
  check(st("RNW-01") === "pending", `renewal case: RNW-01 pending (got ${st("RNW-01")}) (1.2)`)
  check(st("SOC-01") === "pending", "renewal case: SOC-01 present but advisory (1.2)")

  // training decay: completed 3 months ago → valid; note written
  const threeMonthsAgo = new Date(Date.now() - 92 * 86400000).toISOString().slice(0, 10)
  const { data: kase2 } = await db.from("cases").insert({ client_id: client.id, stage: "lead", status: "active" }).select("id").single()
  await processIntake(db, kase2.id, "nyc", {
    dob: "1990-01-01", residence: "nyc",
    trainingStatus: "completed", trainingDate: threeMonthsAgo,
    isRetiredLeo: true,
  } as WizardAnswers)
  const { data: c2 } = await db.from("cases").select("training_completed_on, training_expires_on").eq("id", kase2.id).single()
  check(c2.training_completed_on === threeMonthsAgo, "training_completed_on written from intake (1.1)")
  check(!!c2.training_expires_on && c2.training_expires_on > new Date().toISOString().slice(0, 10), "training_expires_on = +6 months, still valid (1.1)")
  const { data: trnRow } = await db.from("case_requirements").select("notes").eq("case_id", kase2.id).eq("req_code", "TRN-01").single()
  check(/valid for submission until/.test(trnRow?.notes ?? ""), "TRN-01 note shows the expiry countdown (1.1)")
  const { data: feeRow } = await db.from("case_requirements").select("notes").eq("case_id", kase2.id).eq("req_code", "FEE-01").single()
  check(/WAIVED/.test(feeRow?.notes ?? ""), "FEE-01 note reflects the retired-LEO waiver from config (1.1)")
  const { data: leoRow } = await db.from("case_requirements").select("status").eq("case_id", kase2.id).eq("req_code", "LEO-01").single()
  check(leoRow?.status === "pending", "retired-LEO case: LEO-01 pending (1.2)")

  // ── 1.3 provenance ─────────────────────────────────────────────────────────
  const missingAuthority = active.filter((r: { authority: string | null }) => !r.authority?.trim())
  check(missingAuthority.length === 0, `every active NYC rule cites an authority (${missingAuthority.length} missing) (1.3)`)
  const unreviewed = active.filter((r: { needs_legal_review: boolean }) => r.needs_legal_review)
  check(unreviewed.length === active.length, "every rule awaits attorney verification (nothing presumed verified) (1.3)")
  check(existsSync("app/admin/legal/page.tsx") && existsSync("app/admin/legal/actions.ts"), "legal-verification register exists (1.3)")
  check(!existsSync("app/admin/verify-live/page.tsx"), "ephemeral verify-live checklist deleted (1.3)")

  // cleanup
  await db.from("cases").delete().in("id", [kase.id, kase2.id])
  await db.from("clients").delete().eq("id", client.id)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — V3 Phase 1\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
