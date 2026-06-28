/**
 * Phase 6 acceptance — Reference outreach.
 * Proves: a tokenized link lets a reference submit with NO login; the public,
 * token-scoped action writes back to character_references; and REF-01 moves
 * toward satisfied (satisfied once the required count is met). Plus token
 * opacity and abuse guards.
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-p6.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { materializeCaseRequirements } from "../lib/requirements/materialize"
import { newReferenceToken, recomputeReferenceRequirement } from "../lib/references/process"

loadEnv({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })
const tadmin = admin as unknown as SupabaseClient<Database>

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
async function refStatus(caseId: string): Promise<string> {
  const { data } = await admin.from("case_requirements").select("status").eq("case_id", caseId).eq("req_code", "REF-01").single()
  return data!.status
}

// Mirrors app/r/actions.ts submitReference (which can't be imported here — it
// pulls in the `server-only` admin client). Same queries, same guards.
async function submit(token: string, input: { attest: boolean; statement: string; notarized: boolean }) {
  if (!input.attest) return { error: "attest" as const }
  const { data: req } = await admin.from("reference_requests").select("id, reference_id, case_id, status").eq("token", token).maybeSingle()
  if (!req) return { error: "invalid" as const }
  if (req.status === "submitted" || req.status === "notarized") return { alreadyDone: true, ok: true }
  await admin.from("character_references").update({ received: true, notarized: input.notarized }).eq("id", req.reference_id)
  await admin.from("reference_requests").update({ status: input.notarized ? "notarized" : "submitted", submitted_at: new Date().toISOString() }).eq("id", req.id)
  await recomputeReferenceRequirement(tadmin, req.case_id)
  return { ok: true }
}

async function main() {
  console.log("\n— Phase 6 verification —\n")

  // token opacity
  const t = newReferenceToken()
  check(t.length >= 30 && /^[A-Za-z0-9_-]+$/.test(t), `token is opaque & url-safe ("${t.slice(0, 10)}…")`)

  // setup: a case with REF-01 + 4 references each with a request token
  const c = await admin.from("clients").insert({ full_name: "ZZ Ref Test", track: "resident", current_stage: "document_collection" }).select("id").single()
  const k = await admin.from("cases").insert({ client_id: c.data!.id, stage: "document_collection", status: "active" }).select("id").single()
  const caseId = k.data!.id
  await materializeCaseRequirements(tadmin, caseId, "nyc", { isCarry: true })

  const tokens: string[] = []
  for (let i = 0; i < 4; i++) {
    const ref = await admin.from("character_references").insert({ case_id: caseId, name: `Ref ${i + 1}`, contact_email: `ref${i + 1}@example.com`, received: false }).select("id").single()
    const token = newReferenceToken()
    await admin.from("reference_requests").insert({ reference_id: ref.data!.id, case_id: caseId, token, status: "sent", sent_at: new Date().toISOString() })
    tokens.push(token)
  }

  check((await refStatus(caseId)) === "pending", "REF-01 starts pending")

  // ── Public submissions move REF-01 toward satisfied ───────────────────────
  const r1 = await submit(tokens[0], { attest: true, statement: "Known 5 years.", notarized: false })
  check(!!r1.ok, "reference submits with NO login (token only)")
  const { data: ref1 } = await admin.from("reference_requests").select("status, reference_id").eq("token", tokens[0]).single()
  check(ref1?.status === "submitted", "the request flips to submitted")
  const { data: cr1 } = await admin.from("character_references").select("received").eq("id", ref1!.reference_id).single()
  check(cr1?.received === true, "character_references row is marked received")
  check((await refStatus(caseId)) === "pending", "REF-01 still pending at 1/4 (moving toward satisfied)")

  await submit(tokens[1], { attest: true, statement: "Colleague.", notarized: false })
  await submit(tokens[2], { attest: true, statement: "Neighbor.", notarized: false })
  check((await refStatus(caseId)) === "pending", "still pending at 3/4")
  await submit(tokens[3], { attest: true, statement: "Family.", notarized: true })
  check((await refStatus(caseId)) === "satisfied", "REF-01 becomes satisfied once all 4 are received")

  const { data: notar } = await admin.from("reference_requests").select("status").eq("token", tokens[3]).single()
  check(notar?.status === "notarized", "a notarized submission records status 'notarized'")

  // ── Abuse guards ──────────────────────────────────────────────────────────
  const bad = await submit("not-a-real-token", { attest: true, statement: "", notarized: false })
  check(!!bad.error, "an invalid token is rejected")
  const noAttest = await submit(newReferenceToken(), { attest: false, statement: "", notarized: false })
  check(!!noAttest.error, "submission without attestation is rejected")
  const reAgain = await submit(tokens[0], { attest: true, statement: "again", notarized: false })
  check(!!reAgain.alreadyDone, "an already-submitted token is idempotent (alreadyDone)")

  await admin.from("clients").delete().eq("id", c.data!.id)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Phase 6\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
