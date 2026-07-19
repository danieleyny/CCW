/**
 * PART A / Phase 3 gate — proves the retention + erasure machinery against the
 * live local stack:
 *   A3.1 retention is OFF by default and says so honestly (skipped:"disabled")
 *   A3.2 enabling ONE policy purges only that class
 *   A3.3 erasure hits ALL FIVE narrative surfaces plus the storage bytes
 *   A3.4 signature_events is RETAINED and minimized, never deleted
 *   A3.5 the erasure record survives and carries per-surface counts
 *   A3.6 clients can no longer orphan a document by deleting its object
 *
 * A3.3 is the one that matters: a disclosure narrative lives in five places and
 * a scrubber written from memory misses four of them.
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-retention.ts
 */
import { readFileSync } from "fs"
import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { runRetention } from "../lib/retention"
import { eraseCase } from "../lib/privacy/erase"
import type { Database } from "../lib/supabase/types"

loadEnv({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const admin = createClient<Database>(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
  auth: { persistSession: false },
})

let failures = 0
const check = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}

async function main() {
  console.log("\n— Retention & erasure —\n")

  // ── A3.1 OFF by default ───────────────────────────────────────────────────
  // The single most important assertion in this file: a fresh deployment must
  // not delete anything, and must report that as a deliberate skip rather than
  // an empty success that looks the same as "swept, found nothing".
  const fresh = await runRetention(admin)
  check(fresh.skipped === "disabled", "retention is disabled by default and says so (A3.1)")

  const { data: pols } = await admin.from("retention_policies").select("key, enabled, retain_days")
  check((pols ?? []).length > 0, "retention policies are seeded (A3.1)")
  check(
    (pols ?? []).every((p) => !p.enabled && p.retain_days === null),
    "every seeded policy ships disabled with no window (A3.1)"
  )

  // ── A3.2 enabling one policy affects only that class ──────────────────────
  const oldStamp = new Date(Date.now() - 400 * 86400000).toISOString()
  const { data: anyProfile } = await admin.from("profiles").select("id").limit(1).single()
  const { data: seedNotif } = await admin
    .from("notifications")
    .insert({
      recipient: anyProfile!.id,
      kind: "reminder",
      title: "retention probe",
      body: "x",
      created_at: oldStamp,
    })
    .select("id")
    .maybeSingle()

  await admin.from("retention_policies").update({ enabled: true, retain_days: 30 }).eq("key", "notification")
  // Clear today's sweep claim so the day-guard doesn't mask the run.
  await admin.from("reminder_log").delete().eq("rule_key", "retention_sweep")
  const swept = await runRetention(admin)
  check(!swept.skipped, "an enabled policy actually runs (A3.2)")
  if (seedNotif) {
    const { data: gone } = await admin.from("notifications").select("id").eq("id", seedNotif.id).maybeSingle()
    check(!gone, "the enabled class is purged past its window (A3.2)")
  }
  // The day-guard: a second run in the same day must be a no-op, not a re-sweep.
  const again = await runRetention(admin)
  check(again.skipped === "already_ran_today", "the sweep is idempotent within a day (A3.2)")

  // Restore the off-by-default posture.
  await admin.from("retention_policies").update({ enabled: false, retain_days: null }).eq("key", "notification")
  await admin.from("reminder_log").delete().eq("rule_key", "retention_sweep")

  // ── Build a fixture case carrying all five narrative surfaces ─────────────
  const { data: client } = await admin
    .from("clients")
    .insert({ full_name: "Erasure Probe", email: `erase-probe-${Date.now()}@test.local`, borough: "brooklyn" })
    .select("id")
    .single()
  const { data: kase } = await admin
    .from("cases")
    .insert({ client_id: client!.id, stage: "document_collection" })
    .select("id")
    .single()
  const caseId = kase!.id

  const NARRATIVE = "UNIQUE-NARRATIVE-TOKEN-arrested-on-a-tuesday"
  await admin.from("disclosures").insert({
    case_id: caseId,
    type: "arrest",
    narrative: NARRATIVE,
    jurisdiction_text: "Kings County",
  })
  await admin.from("intake_sessions").insert({ case_id: caseId, answers: { arrests: [{ narrative: NARRATIVE }] } })
  await admin.from("requirement_answers").insert({ case_id: caseId, req_code: "ARR-01", answers: { story: NARRATIVE } })
  await admin.from("license_reports").insert({ case_id: caseId, client_id: client!.id, kind: "arrest_or_summons", details: NARRATIVE })
  await admin.from("case_notes").insert({ case_id: caseId, body: `staff view: ${NARRATIVE}` })

  // Surface 5: the bytes. A generated PDF has the narrative rendered INTO it.
  const path = `clients/${client!.id}/${crypto.randomUUID()}/probe.txt`
  await admin.storage.from("documents").upload(path, new Blob([NARRATIVE]), { contentType: "text/plain" })
  await admin.from("documents").insert({
    case_id: caseId,
    client_id: client!.id,
    type: "arrest_statement",
    file_path: path,
    file_name: "probe.txt",
  })

  // signature_events: must SURVIVE, minimized.
  await admin.from("signature_events").insert({
    case_id: caseId,
    signer_key: "applicant",
    req_code: "AFF-01",
    document_sha256: "deadbeef",
    consent_text: "I agree",
    ip: "203.0.113.9",
    user_agent: "probe/1.0",
  })

  // ── A3.3 erase, then hunt the token everywhere ────────────────────────────
  const receipt = await eraseCase(admin, caseId, { note: "verify-retention probe" })

  const surfaces: Array<[string, () => Promise<number>]> = [
    ["disclosures", async () => ((await admin.from("disclosures").select("id").eq("case_id", caseId)).data ?? []).length],
    ["intake_sessions", async () => ((await admin.from("intake_sessions").select("id").eq("case_id", caseId)).data ?? []).length],
    ["requirement_answers", async () => ((await admin.from("requirement_answers").select("id").eq("case_id", caseId)).data ?? []).length],
    ["license_reports", async () => ((await admin.from("license_reports").select("id").eq("case_id", caseId)).data ?? []).length],
    ["case_notes", async () => ((await admin.from("case_notes").select("id").eq("case_id", caseId)).data ?? []).length],
    ["documents", async () => ((await admin.from("documents").select("id").eq("case_id", caseId)).data ?? []).length],
  ]
  for (const [name, count] of surfaces) {
    check((await count()) === 0, `erasure clears ${name} (A3.3)`)
  }

  // The bytes themselves — the surface most easily forgotten.
  const { data: dl } = await admin.storage.from("documents").download(path)
  check(!dl, "erasure removes the stored file, not just the row (A3.3)")

  // ── A3.4 signature_events retained + minimized ────────────────────────────
  const { data: evs } = await admin
    .from("signature_events")
    .select("id, ip, user_agent, document_sha256")
    .eq("case_id", caseId)
  check((evs ?? []).length === 1, "signature_events is RETAINED as signing evidence (A3.4)")
  check(evs?.[0]?.ip === null && evs?.[0]?.user_agent === null, "…with ip/user_agent stripped (A3.4)")
  check(evs?.[0]?.document_sha256 === "deadbeef", "…and the evidentiary hash intact (A3.4)")

  // ── A3.5 the record survives with counts ──────────────────────────────────
  const { data: log } = await admin
    .from("data_erasure_log")
    .select("id, surfaces")
    .eq("case_id", caseId)
    .maybeSingle()
  check(!!log, "an erasure record exists (A3.5)")
  const counts = (log?.surfaces ?? {}) as Record<string, number>
  check((counts.storage_objects ?? 0) > 0, "the record counts the storage objects removed (A3.5)")
  check((counts.signature_events_minimized ?? 0) > 0, "the record shows signature events were minimized, not deleted (A3.5)")
  check(Object.keys(receipt.surfaces).length > 0, "eraseCase returns a receipt (A3.5)")

  // ── A3.6 the orphan hole is closed ────────────────────────────────────────
  // Clients used to hold DELETE on their own storage objects with no matching
  // delete path on `documents`, so they could strand a row pointing at bytes
  // that no longer exist — breaking the signed-URL loop and silently gutting
  // the evidence binding on a satisfied requirement. Source-level assert (the
  // same shape verify-v3p0 uses for the cron guard) because policy catalogs
  // aren't reachable through PostgREST.
  const mig = readFileSync("supabase/migrations/20260719000200_retention_and_data_requests.sql", "utf8")
  check(
    /drop policy if exists documents_storage_delete on storage\.objects/i.test(mig),
    "client storage DELETE is revoked, so documents rows can't be orphaned (A3.6)"
  )

  // cleanup
  await admin.from("signature_events").delete().eq("case_id", caseId)
  await admin.from("cases").delete().eq("id", caseId)
  await admin.from("clients").delete().eq("id", client!.id)
  await admin.from("data_erasure_log").delete().eq("case_id", caseId)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Retention & erasure\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
