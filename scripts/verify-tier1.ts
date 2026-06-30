/**
 * Tier 1 acceptance — cohabitant self-serve flow + auto-generated applicant docs.
 *   - every prepared document generates a valid PDF;
 *   - the cohabitant affidavit progresses not_started → notarized and drives COH-01.
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-tier1.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { materializeCaseRequirements } from "../lib/requirements/materialize"
import { recomputeCohabitantRequirement } from "../lib/cohabitants/process"
import { generateCohabitantAffidavitPdf } from "../lib/cohabitants/document"
import {
  affirmationOfUnderstanding,
  safeStorageAttestation,
  socialMediaDisclosure,
  arrestNarratives,
  certOfDispositionRequests,
} from "../lib/forms/documents"

loadEnv({ path: ".env.local" })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const tadmin = admin as unknown as SupabaseClient<Database>

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
function validPdf(bytes: Uint8Array): boolean {
  const b = Buffer.from(bytes)
  return b.subarray(0, 5).toString("latin1") === "%PDF-" && b.subarray(-6).toString("latin1").includes("%%EOF") && bytes.length > 800
}
async function coh01(caseId: string) {
  const { data } = await admin.from("case_requirements").select("status, notes").eq("case_id", caseId).eq("req_code", "COH-01").single()
  return data!
}

async function main() {
  console.log("\n— Tier 1 verification —\n")

  // ── Every prepared document generates a valid PDF ─────────────────────────
  const D = "June 30, 2026"
  const arrests = [{ occurredOn: "2019-04-01", jurisdiction: "Kings County", disposition: "dismissed", narrative: "Brief context." }]
  check(validPdf(await affirmationOfUnderstanding("Jordan Rivera", D)), "Affirmation of Understanding PDF")
  check(validPdf(await safeStorageAttestation("Jordan Rivera", D)), "Safe-Storage Attestation PDF")
  check(validPdf(await socialMediaDisclosure("Jordan Rivera", "@jordan, fb.com/jordan", D)), "Social-Media Disclosure PDF")
  check(validPdf(await arrestNarratives("Jordan Rivera", arrests, D)), "Disclosure Written Explanations PDF")
  check(validPdf(await certOfDispositionRequests("Jordan Rivera", arrests, D)), "Certificate-of-Disposition request letters PDF")
  check(validPdf(await generateCohabitantAffidavitPdf({ applicantName: "Jordan Rivera", cohabitantName: "Pat Doe", relationship: "spouse", dateStr: D })), "Cohabitant Affidavit PDF")
  check(validPdf(await generateCohabitantAffidavitPdf({ applicantName: "Jordan Rivera", cohabitantName: "Jordan Rivera", liveAlone: true, dateStr: D })), "Sole-Occupancy Statement PDF")

  // ── Cohabitant affidavit drives COH-01 ────────────────────────────────────
  const c = await admin.from("clients").insert({ full_name: "ZZ Cohab", track: "resident", current_stage: "document_collection" }).select("id").single()
  const k = await admin.from("cases").insert({ client_id: c.data!.id, stage: "document_collection", status: "active" }).select("id").single()
  const caseId = k.data!.id
  await materializeCaseRequirements(tadmin, caseId, "nyc", { isCarry: true, hasCohabitants: true })
  check((await coh01(caseId)).status === "pending", "COH-01 starts pending (has cohabitants)")

  const cohab = await admin.from("cohabitants").insert({ case_id: caseId, name: "Pat Doe", relationship: "Spouse", affidavit_status: "not_started" }).select("id").single()
  await recomputeCohabitantRequirement(tadmin, caseId)
  const before = await coh01(caseId)
  check(before.notes?.includes("0/1 cohabitant affidavits notarized") === true, `before notarizing: "${before.notes}"`)

  await admin.from("cohabitants").update({ affidavit_status: "notarized" }).eq("id", cohab.data!.id)
  await recomputeCohabitantRequirement(tadmin, caseId)
  const after = await coh01(caseId)
  check(after.status === "satisfied" && after.notes?.includes("1/1") === true, `after notarizing: COH-01 satisfied ("${after.notes}")`)

  await admin.from("clients").delete().eq("id", c.data!.id)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Tier 1\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
