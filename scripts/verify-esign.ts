/**
 * In-system e-signature acceptance:
 *  - signatures persist + round-trip; (case_id, signer_key) is unique
 *  - generated PDFs come out larger/valid when a signature is stamped
 *  - signatures are private: a client sees only their own; an instructor sees none
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-esign.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { getSignaturePng } from "../lib/signatures"
import { affirmationOfUnderstanding } from "../lib/forms/documents"
import { generateReferenceLetterPdf } from "../lib/references/document"
import { generateCohabitantAffidavitPdf } from "../lib/cohabitants/document"

loadEnv({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })
const tadmin = admin as unknown as SupabaseClient<Database>

// A signature fixture with REAL INK — a 120x40 PNG with a stroke in it.
//
// This used to be a 1x1 transparent pixel, which the builder now refuses to
// stamp: scaling a single pixel to the signature box painted a solid block that
// looked like a redaction sitting on the signature line. A fixture that isn't a
// signature can't verify that signatures embed.
const SIGNATURE_PNG =
  "iVBORw0KGgoAAAANSUhEUgAAAHgAAAAoCAYAAAA16j4lAAAAUElEQVR4nO3RQQ3AIADAQBQsfPAvdRMBD9LdJVXQMQAAAAAAAGDbM9erezI4nsHxDI5ncDyD4xkcz+B4BsczOJ7B8QyOd3wwAAAAAAAAP/QBFwWarAik40wAAAAASUVORK5CYII="

let failures = 0
const check = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
const validPdf = (b: Uint8Array) =>
  Buffer.from(b.subarray(0, 5)).toString("latin1") === "%PDF-" && b.length > 1200
async function signIn(email: string) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: "Passw0rd!" })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return c
}

async function main() {
  console.log("\n— E-signature verification —\n")

  const { data: jc } = await admin.from("clients").select("id").eq("email", "client1@carrypath.test").single()
  const { data: jcase } = await admin.from("cases").select("id").eq("client_id", jc!.id).limit(1).single()
  const caseId = jcase!.id

  // — storage round-trip + uniqueness —
  await admin.from("signatures").delete().eq("case_id", caseId).eq("signer_key", "applicant")
  await admin.from("signatures").upsert({ case_id: caseId, signer_key: "applicant", png_base64: SIGNATURE_PNG }, { onConflict: "case_id,signer_key" })
  await admin.from("signatures").upsert({ case_id: caseId, signer_key: "applicant", png_base64: SIGNATURE_PNG }, { onConflict: "case_id,signer_key" })
  const { count: rows } = await admin.from("signatures").select("id", { count: "exact", head: true }).eq("case_id", caseId).eq("signer_key", "applicant")
  check(rows === 1, "upsert keeps one row per (case, signer_key)")
  const png = await getSignaturePng(tadmin, caseId, "applicant")
  check(!!png && png.length > 30, "getSignaturePng round-trips the stored signature")

  // — stamping makes valid PDFs, larger than the unsigned version —
  const sig = png!
  const date = "June 30, 2026"
  const affUnsigned = await affirmationOfUnderstanding("Jordan Rivera", date)
  const affSigned = await affirmationOfUnderstanding("Jordan Rivera", date, sig)
  check(validPdf(affSigned), "Affirmation stamps a valid signed PDF")
  check(affSigned.length > affUnsigned.length, "signed Affirmation embeds the signature (larger than unsigned)")

  const refPdf = await generateReferenceLetterPdf({
    applicantName: "Jordan Rivera", referenceName: "Sam Park", relationship: "colleague",
    answers: { howLong: "5 years", capacity: "coworker", character: "honest and steady" },
    dateStr: date, signaturePng: sig,
  })
  check(validPdf(refPdf), "Reference letter stamps a valid signed PDF")

  const cohPdf = await generateCohabitantAffidavitPdf({
    applicantName: "Jordan Rivera", cohabitantName: "Quinn Rivera", relationship: "spouse", dateStr: date, signaturePng: sig,
  })
  check(validPdf(cohPdf), "Cohabitant affidavit stamps a valid signed PDF")

  // — privacy: client sees own, other client + instructor see none —
  const jordan = await signIn("client1@carrypath.test")
  const { count: own } = await jordan.from("signatures").select("id", { count: "exact", head: true }).eq("case_id", caseId)
  check((own ?? 0) >= 1, "applicant can read their own signature (RLS)")

  const other = await signIn("client2@carrypath.test")
  const { count: cross } = await other.from("signatures").select("id", { count: "exact", head: true }).eq("case_id", caseId)
  check((cross ?? 0) === 0, "a different client cannot read this case's signatures")

  const instructor = await signIn("instructor@carrypath.test")
  const { count: instr } = await instructor.from("signatures").select("id", { count: "exact", head: true }).eq("case_id", caseId)
  check((instr ?? 0) === 0, "instructors cannot read signatures (privacy firewall)")

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — E-signature\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => { console.error(e); process.exit(1) })
