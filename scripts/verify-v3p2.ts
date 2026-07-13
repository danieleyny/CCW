/**
 * V3 Phase 2 gate — the consultant cockpit:
 *   2.1 one checklist (V1 template deleted, admin+portal both on case_requirements)
 *   2.2 notes RLS (internal-only), disclosure data reachable by staff
 *   2.3 tasks: create w/ assignee + due date, reopen
 *   2.4 CP-5 gate: blockers → readyForSignOff → sign-off → ok, enforced in setCaseStage
 *   2.6 new reminder rules fire once (booking 24h, stage_stalled, long_lead, qa_ready)
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-v3p2.ts
 */
import { existsSync, readFileSync } from "fs"
import { execSync } from "child_process"
import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { evaluatePreFilingGate } from "../lib/qa-gate"
import { runReminderEngine } from "../lib/reminders/engine"
import { materializeCaseRequirements } from "../lib/requirements/materialize"

loadEnv({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const admin = createClient<Database>(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

let failures = 0
const check = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
async function signIn(email: string) {
  const c = createClient<Database>(URL, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: "Passw0rd!" })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return c
}

async function main() {
  console.log("\n— V3 Phase 2 verification —\n")

  // ── 2.1 one checklist ──────────────────────────────────────────────────────
  check(!existsSync("config/checklist-templates.ts"), "V1 template config deleted (2.1)")
  check(!existsSync("components/admin/checklist-engine.tsx"), "V1 admin checklist engine deleted (2.1)")
  const appReads = execSync(
    `grep -rn 'from("checklist_items")' app components lib --include='*.ts*' 2>/dev/null || true`,
    { encoding: "utf8" }
  ).trim()
  check(appReads === "", `no app code reads checklist_items (found: ${appReads.split("\n").filter(Boolean).length}) (2.1)`)
  check(
    readFileSync("app/admin/cases/[id]/page.tsx", "utf8").includes("case_requirements"),
    "admin case file reads case_requirements (2.1)"
  )

  // ── setup: a temp case owned by client1 with baseline requirements ─────────
  const { data: client } = await admin
    .from("clients")
    .insert({ full_name: "V3P2 Temp", email: "v3p2.temp@carrypath.test", track: "resident", current_stage: "lead" })
    .select("id")
    .single()
  const { data: staffProf } = await admin.from("profiles").select("id").eq("role", "staff").limit(1).single()
  await admin.from("clients").update({ assigned_staff: staffProf!.id }).eq("id", client!.id)
  const { data: kase } = await admin
    .from("cases")
    .insert({
      client_id: client!.id,
      stage: "document_collection",
      status: "active",
      stage_entered_at: new Date(Date.now() - 20 * 86400000).toISOString(), // stalled
      opened_at: new Date(Date.now() - 4 * 86400000).toISOString(), // long-lead day-3 bucket
    })
    .select("id")
    .single()
  const caseId = kase!.id
  await materializeCaseRequirements(admin, caseId, "nyc", { isCarry: true })

  // ── 2.2 notes: staff write+read; client and instructor CANNOT read ─────────
  const staff = await signIn("staff@carrypath.test")
  const { error: noteErr } = await staff.from("case_notes").insert({ case_id: caseId, body: "internal: client prefers evening calls" })
  check(!noteErr, `staff can write a case note (${noteErr?.message ?? "ok"}) (2.2)`)
  const { count: staffNotes } = await staff.from("case_notes").select("id", { count: "exact", head: true }).eq("case_id", caseId)
  check((staffNotes ?? 0) === 1, "staff can read case notes (2.2)")

  const clientUser = await signIn("client1@carrypath.test")
  const { count: clientNotes } = await clientUser.from("case_notes").select("id", { count: "exact", head: true })
  check((clientNotes ?? 0) === 0, "clients can NEVER read consultant notes (RLS) (2.2)")
  const instructor = await signIn("instructor@carrypath.test")
  const { count: instrNotes } = await instructor.from("case_notes").select("id", { count: "exact", head: true })
  check((instrNotes ?? 0) === 0, "instructors can NEVER read consultant notes (RLS) (2.2)")

  // ── 2.3 tasks: create w/ assignee + due date, then reopen ─────────────────
  const { data: task, error: taskErr } = await staff
    .from("tasks")
    .insert({
      title: "Call client re: safe photos",
      case_id: caseId,
      assignee: staffProf!.id,
      due_date: new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10),
      priority: 1,
      status: "open",
    })
    .select("id")
    .single()
  check(!taskErr && !!task, "staff can create an assigned, dated task (2.3)")
  await staff.from("tasks").update({ status: "done" }).eq("id", task!.id)
  const { error: reopenErr } = await staff.from("tasks").update({ status: "open" }).eq("id", task!.id)
  check(!reopenErr, "task can be reopened (2.3)")

  // ── 2.3 reassign: staff moves the case to another consultant ──────────────
  const { data: adminProf } = await admin.from("profiles").select("id").eq("role", "admin").limit(1).single()
  const { error: reassignErr } = await staff.from("clients").update({ assigned_staff: adminProf!.id }).eq("id", client!.id)
  check(!reassignErr, "staff can reassign a case (2.3)")
  await admin.from("clients").update({ assigned_staff: staffProf!.id }).eq("id", client!.id)

  // ── 2.4 the CP-5 gate, end to end ──────────────────────────────────────────
  let gate = await evaluatePreFilingGate(admin, caseId)
  check(!gate.ok && gate.blockers.some((b) => b.kind === "blocking_requirements"), "fresh case: gate blocks on open requirements (2.4)")
  check(gate.blockers.some((b) => b.kind === "references_short"), "gate blocks on missing references (2.4)")
  check(gate.blockers.some((b) => b.kind === "training_missing"), "gate blocks on missing training (2.4)")

  // Satisfy everything: blocking reqs → satisfied; 4 notarized refs; fresh training.
  await admin.from("case_requirements").update({ status: "satisfied" }).eq("case_id", caseId).eq("status", "pending")
  for (let i = 0; i < 4; i++) {
    await admin.from("character_references").insert({
      case_id: caseId, name: `Ref ${i + 1}`, is_family: i < 2, received: true, notarized: true,
    })
  }
  await admin.from("cases").update({
    training_completed_on: new Date(Date.now() - 30 * 86400000).toISOString().slice(0, 10),
    training_expires_on: new Date(Date.now() + 150 * 86400000).toISOString().slice(0, 10),
  }).eq("id", caseId)

  gate = await evaluatePreFilingGate(admin, caseId)
  check(gate.readyForSignOff, `all checks pass → ready for sign-off (blockers: ${gate.blockers.map((b) => b.kind).join(",") || "none"}) (2.4)`)
  check(!gate.ok && gate.blockers.some((b) => b.kind === "sign_off_missing"), "…but still NOT ok without the named sign-off (2.4)")

  await admin.from("cases").update({ qa_signed_off_by: staffProf!.id, qa_signed_off_at: new Date().toISOString() }).eq("id", caseId)
  gate = await evaluatePreFilingGate(admin, caseId)
  check(gate.ok, "signed off → the gate opens (2.4)")

  const actionsSrc = readFileSync("app/admin/actions.ts", "utf8")
  check(
    // V4-A1a — the gate now fires whenever the target stage is at or past
    // application_assembled (index compare), not just the two named stages.
    actionsSrc.includes('stageIndex("application_assembled")') && actionsSrc.includes("evaluatePreFilingGate"),
    "setCaseStage enforces the gate server-side, gated on stage index (2.4)"
  )

  // ── 2.6 reminder rules fire once ───────────────────────────────────────────
  // booking in ~3h (24h bucket)
  const { data: instrRow } = await admin.from("instructors").select("id").limit(1).single()
  const { error: bookErr } = await admin.from("bookings").insert({
    case_id: caseId, client_id: client!.id, instructor_id: instrRow!.id, type: "combined_18h", status: "confirmed",
    starts_at: new Date(Date.now() + 3 * 3600000).toISOString(),
    ends_at: new Date(Date.now() + 8 * 3600000).toISOString(),
  })
  check(!bookErr, `test booking created (${bookErr?.message ?? "ok"})`)
  // reset training-pending so long_lead fires (TRN-01 back to pending)
  await admin.from("case_requirements").update({ status: "pending" }).eq("case_id", caseId).eq("req_code", "TRN-01")
  // qa_ready needs NOT signed off — use a second temp case? Simpler: unsign this one and re-satisfy TRN later.
  await admin.from("cases").update({ qa_signed_off_by: null, qa_signed_off_at: null }).eq("id", caseId)

  const fired1 = await runReminderEngine(admin)
  const keys1 = fired1.filter((f) => f.caseId === caseId).map((f) => f.ruleKey)
  check(keys1.includes("booking_24h"), `booking 24h reminder fired (${keys1.join(",")}) (2.6)`)
  check(keys1.includes("stage_stalled"), "stage-stalled reminder fired to the owner (2.6)")
  check(keys1.includes("long_lead_nudge"), "long-lead day-3 nudge fired (2.6)")

  // qa_ready: satisfy TRN-01 again → gate readyForSignOff, not signed → fires next run.
  await admin.from("case_requirements").update({ status: "satisfied" }).eq("case_id", caseId).eq("req_code", "TRN-01")
  const fired2 = await runReminderEngine(admin)
  const keys2 = fired2.filter((f) => f.caseId === caseId).map((f) => f.ruleKey)
  check(keys2.includes("qa_ready"), `qa-ready reminder fired to the consultant (${keys2.join(",") || "none"}) (2.6)`)

  const fired3 = await runReminderEngine(admin)
  check(fired3.filter((f) => f.caseId === caseId).length === 0, "re-run fires nothing new (idempotent) (2.6)")

  check(!existsSync("lib/reminders.ts"), "reminder modules consolidated under lib/reminders/ (2.6)")

  // cleanup
  await admin.from("cases").delete().eq("id", caseId)
  await admin.from("clients").delete().eq("id", client!.id)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — V3 Phase 2\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
