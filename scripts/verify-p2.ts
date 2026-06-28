/**
 * Phase 2 acceptance — Branching Intake + Disclosure.
 * Proves the critical gate test:
 *   - a cohabitant + a dismissed arrest auto-generate COH-01 and ARR-01
 *     (Certificate of Disposition), with ARR-01 bound to the arrest disclosure;
 *   - submission is BLOCKED while the arrest narrative is empty, and the block
 *     clears once it's written;
 *   - a bad filename is auto-sanitized and FMT-01 rejects bad size/type;
 *   - disclosures are private (one client cannot read another's).
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-p2.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { processIntake, evaluateSubmissionGuard } from "../lib/intake/process"
import { validateFile, sanitizeFilename } from "../lib/files/validator"
import type { WizardAnswers } from "../lib/intake/answers"

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

async function main() {
  console.log("\n— Phase 2 verification —\n")

  // ── Build a throwaway applicant: 1 cohabitant + 1 dismissed arrest ─────────
  const c = await admin
    .from("clients")
    .insert({ full_name: "ZZ Intake Test", track: "resident", current_stage: "lead" })
    .select("id")
    .single()
  const k = await admin
    .from("cases")
    .insert({ client_id: c.data!.id, stage: "lead", status: "active" })
    .select("id")
    .single()
  const caseId = k.data!.id

  const answers: WizardAnswers = {
    residence: "nyc",
    cohabitants: [{ name: "Pat Doe", relationship: "Spouse" }],
    arrests: [{ occurredOn: "2019-04-01", jurisdiction: "Kings County", disposition: "dismissed", narrative: "" }],
  }
  await processIntake(tadmin, caseId, "nyc", answers)

  // ── Conditional generation + binding ───────────────────────────────────────
  const { data: crs } = await admin
    .from("case_requirements")
    .select("req_code, status, disclosure_id, requirement:requirements(document_type)")
    .eq("case_id", caseId)
  const rows = (crs ?? []) as Array<{
    req_code: string
    status: string
    disclosure_id: string | null
    requirement: { document_type: string | null } | { document_type: string | null }[] | null
  }>
  const find = (code: string) => rows.find((r) => r.req_code === code)
  const docTypeOf = (code: string) => {
    const r = find(code)?.requirement
    return r ? (Array.isArray(r) ? r[0]?.document_type : r.document_type) : null
  }

  check(find("COH-01")?.status === "pending", "cohabitant → COH-01 (cohabitant affidavit) spawned & pending")
  check(find("ARR-01")?.status === "pending", "dismissed arrest → ARR-01 spawned & pending")
  check(docTypeOf("ARR-01") === "certificate_of_disposition", "ARR-01 maps to a Certificate of Disposition")
  check(!!find("ARR-01")?.disclosure_id, "ARR-01 is bound to its arrest disclosure (audit link)")

  const { data: disc } = await admin
    .from("disclosures")
    .select("id, type, spawned_req_code, narrative")
    .eq("case_id", caseId)
  const arrest = (disc ?? []).find((d) => d.type === "arrest")
  check(!!arrest && arrest.spawned_req_code === "ARR-01", "arrest disclosure row carries spawned_req_code ARR-01")

  // ── Submission gate: blocked until the narrative is written ────────────────
  const guard1 = await evaluateSubmissionGuard(tadmin, caseId)
  check(!guard1.ok && guard1.blockers.some((b) => b.kind === "disclosure_narrative"), "submission BLOCKED while the arrest narrative is empty")

  await admin.from("disclosures").update({ narrative: "Charge was dismissed; sealed under CPL 160.50. Brief context here." }).eq("id", arrest!.id)
  const guard2 = await evaluateSubmissionGuard(tadmin, caseId)
  check(guard2.emptyNarrativeCount === 0 && !guard2.blockers.some((b) => b.kind === "disclosure_narrative"), "narrative written → the disclosure-narrative block clears")

  // ── FMT-01 filename sanitize + size/type guard ─────────────────────────────
  const dirty = sanitizeFilename("Ré sumé & final#2 *.PDF")
  check(/^[A-Za-z0-9_.-]+$/.test(dirty) && dirty.endsWith(".pdf"), `bad filename auto-sanitized → "${dirty}"`)
  check(validateFile({ name: "scan.pdf", size: 6 * 1024 * 1024 }).ok === false, "FMT-01 rejects files over 5 MB")
  check(validateFile({ name: "malware.exe", size: 1000 }).ok === false, "FMT-01 rejects disallowed file types")
  check(validateFile({ name: "good.jpg", size: 1000 }).ok === true, "FMT-01 accepts a valid small image")

  // ── Disclosure privacy (RLS): one client cannot read another's ─────────────
  const jordanClient = await admin.from("clients").select("id").eq("full_name", "Jordan Rivera").single()
  const jordanCaseRow = await admin
    .from("cases")
    .select("id")
    .eq("client_id", jordanClient.data!.id)
    .limit(1)
    .single()
  const jordanCase = jordanCaseRow.data!.id
  const probe = await admin
    .from("disclosures")
    .insert({ case_id: jordanCase, type: "question_yes", question_no: 99, narrative: "rls probe" })
    .select("id")
    .single()
  if (probe.error) console.log("  (probe insert error:", probe.error.message, ")")

  const c1 = createClient(URL, ANON, { auth: { persistSession: false } })
  await c1.auth.signInWithPassword({ email: "client1@carrypath.test", password: "Passw0rd!" })
  const c2 = createClient(URL, ANON, { auth: { persistSession: false } })
  await c2.auth.signInWithPassword({ email: "client2@carrypath.test", password: "Passw0rd!" })

  const mine = await c1.from("disclosures").select("id").eq("case_id", jordanCase)
  check((mine.data?.length ?? 0) > 0, "client can read their OWN disclosures")
  const theirs = await c2.from("disclosures").select("id").eq("case_id", jordanCase)
  check((theirs.data?.length ?? 0) === 0, "another client CANNOT read those disclosures (RLS)")

  // cleanup
  await admin.from("disclosures").delete().eq("id", probe.data!.id)
  await admin.from("clients").delete().eq("id", c.data!.id) // cascades case + disclosures + case_requirements

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Phase 2\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
