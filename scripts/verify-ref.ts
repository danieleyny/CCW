/**
 * Reference-flow v2 acceptance — self-serve answers → notarization-ready PDF →
 * notarized upload, with REF-01 tracking received + notarized counts.
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-ref.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { materializeCaseRequirements } from "../lib/requirements/materialize"
import { newReferenceToken, recomputeReferenceRequirement } from "../lib/references/process"
import { generateReferenceLetterPdf } from "../lib/references/document"
import { notaryOptions } from "../lib/references/notary"

loadEnv({ path: ".env.local" })
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const tadmin = admin as unknown as SupabaseClient<Database>

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
async function ref01(caseId: string) {
  const { data } = await admin.from("case_requirements").select("status, notes").eq("case_id", caseId).eq("req_code", "REF-01").single()
  return data!
}

async function main() {
  console.log("\n— Reference flow v2 verification —\n")

  // ── PDF generation ────────────────────────────────────────────────────────
  const pdf = await generateReferenceLetterPdf({
    applicantName: "Jordan Rivera",
    referenceName: "Pat Doe",
    relationship: "colleague",
    contactEmail: "pat@example.com",
    contactPhone: "(212) 555-0100",
    answers: { knownDuration: "8 years", capacity: "Coworker at Acme", character: "Calm, responsible, sound judgment.", safety: "No concerns." },
    dateStr: "June 29, 2026",
  })
  const buf = Buffer.from(pdf)
  const head = buf.subarray(0, 5).toString("latin1")
  const tail = buf.subarray(-6).toString("latin1")
  check(head === "%PDF-", `generates a valid PDF (${pdf.length} bytes, header "${head}")`)
  // content streams are Flate-compressed, so we validate structure + substance
  // rather than grepping text: a complete, non-trivial document.
  check(tail.includes("%%EOF") && pdf.length > 1500, "PDF is a complete document with substantial content (EOF + full letter)")

  // ── Notary recommendations ────────────────────────────────────────────────
  const opts = notaryOptions("11215")
  check(opts.length >= 3 && opts.every((o) => /^https?:\/\//.test(o.url)), `notary options returned (${opts.length}) with valid links`)

  // ── Answer → notarize progression ─────────────────────────────────────────
  const c = await admin.from("clients").insert({ full_name: "ZZ Ref Flow", track: "resident", current_stage: "document_collection" }).select("id").single()
  const k = await admin.from("cases").insert({ client_id: c.data!.id, stage: "document_collection", status: "active" }).select("id").single()
  const caseId = k.data!.id
  await materializeCaseRequirements(tadmin, caseId, "nyc", { isCarry: true })

  const ref = await admin.from("character_references").insert({ case_id: caseId, name: "Pat Doe", contact_email: "pat@e.com", received: false }).select("id").single()
  const token = newReferenceToken()
  await admin.from("reference_requests").insert({ reference_id: ref.data!.id, case_id: caseId, token, status: "sent", sent_at: new Date().toISOString() })

  check((await ref01(caseId)).status === "pending", "REF-01 starts pending")

  // submit answers (mirrors submitReferenceAnswers)
  await admin.from("reference_requests").update({ answers: { knownDuration: "5y" } as never, status: "submitted", answered_at: new Date().toISOString() }).eq("token", token)
  await admin.from("character_references").update({ received: true }).eq("id", ref.data!.id)
  await recomputeReferenceRequirement(tadmin, caseId)
  const afterAnswer = await ref01(caseId)
  check(afterAnswer.notes?.includes("1/4 received") === true && afterAnswer.notes?.includes("0 notarized") === true, `after answering: notes track received, not notarized ("${afterAnswer.notes}")`)

  // notarize upload (mirrors uploadNotarizedReference, sans storage)
  const doc = await admin.from("documents").insert({ case_id: caseId, client_id: c.data!.id, type: "reference_letter", status: "pending", file_path: `clients/${c.data!.id}/x/ref.pdf`, file_name: "ref.pdf", notarized: true }).select("id").single()
  await admin.from("character_references").update({ notarized: true }).eq("id", ref.data!.id)
  await admin.from("reference_requests").update({ status: "notarized", notarized_at: new Date().toISOString(), document_id: doc.data!.id }).eq("token", token)
  await recomputeReferenceRequirement(tadmin, caseId)
  const afterNotary = await ref01(caseId)
  check(afterNotary.notes?.includes("1 notarized") === true, `after notarizing: notes show "1 notarized" ("${afterNotary.notes}")`)

  const { data: reqFinal } = await admin.from("reference_requests").select("status, document_id").eq("token", token).single()
  check(reqFinal?.status === "notarized" && !!reqFinal?.document_id, "request reaches 'notarized' and binds the uploaded document")

  // bring all four to satisfied
  for (let i = 0; i < 3; i++) {
    await admin.from("character_references").insert({ case_id: caseId, name: `R${i}`, received: true, notarized: true })
  }
  await recomputeReferenceRequirement(tadmin, caseId)
  check((await ref01(caseId)).status === "satisfied", "REF-01 satisfied once all four references are received")

  await admin.from("clients").delete().eq("id", c.data!.id)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Reference flow v2\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
