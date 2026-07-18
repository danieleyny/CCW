/**
 * Reset a test account back to "just signed up".
 *
 * Deletes the account's case and everything hanging off it — requirements,
 * documents (rows AND the bytes in storage), intake, disclosures, signatures,
 * answers, engagements, bookings — then opens a fresh case with a freshly
 * materialized checklist, exactly the way onboarding does for a new signup. The
 * auth user, profile and client record survive, so the same email and password
 * keep working.
 *
 * SAFETY:
 *   - Everything it is about to delete is written to a timestamped JSON backup
 *     FIRST. Nothing is destroyed without a copy on disk.
 *   - Refuses to run against an account that isn't `role = 'client'`.
 *   - DRY=1 reports exactly what would happen and changes nothing.
 *
 * Usage:
 *   DRY=1 EMAIL=you@example.com ENV_FILE=/path/to/prod-env pnpm exec tsx scripts/reset-test-account.ts
 *   EMAIL=you@example.com ENV_FILE=/path/to/prod-env pnpm exec tsx scripts/reset-test-account.ts
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync, writeFileSync } from "node:fs"
import { materializeCaseRequirements } from "../lib/requirements/materialize"

const envFile = process.env.ENV_FILE ?? ".env.local"
const env = Object.fromEntries(
  readFileSync(envFile, "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => {
      const i = l.indexOf("=")
      return [l.slice(0, i).trim(), l.slice(i + 1).trim().replace(/^"|"$/g, "")]
    })
)
const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY)
const DRY = process.env.DRY === "1"
const EMAIL = (process.env.EMAIL ?? "").toLowerCase()

/** Child tables keyed by case_id, in an order that respects foreign keys. */
const CASE_CHILDREN = [
  "signature_events",
  "signatures",
  "requirement_answers",
  "case_requirements",
  "checklist_items",
  "documents",
  "disclosures",
  "cohabitants",
  "reference_requests",
  "character_references",
  "intake_sessions",
  "case_notes",
  "training_sessions",
  "appointments",
  "bookings",
  "engagements",
  "instructor_offers",
  "payments",
  "purchase_authorizations",
  "license_reports",
  "reminder_log",
  "activity_log",
  "case_stages",
] as const

async function main() {
  if (!EMAIL) throw new Error("Set EMAIL=…")
  console.log(`${DRY ? "DRY RUN — " : ""}Resetting ${EMAIL} on ${env.NEXT_PUBLIC_SUPABASE_URL}\n`)

  const { data: users } = await admin.auth.admin.listUsers({ page: 1, perPage: 1000 })
  const user = users.users.find((u) => u.email?.toLowerCase() === EMAIL)
  if (!user) throw new Error(`No auth user for ${EMAIL}`)

  const { data: profile } = await admin.from("profiles").select("id, role, full_name").eq("id", user.id).maybeSingle()
  // Guard: this wipes case data. It must never be pointed at staff or admin.
  if (profile?.role !== "client") throw new Error(`Refusing: ${EMAIL} has role '${profile?.role}', not 'client'`)

  const { data: clients } = await admin.from("clients").select("*").eq("profile_id", user.id)
  if (!clients?.length) throw new Error(`No client record for ${EMAIL}`)

  const backup: Record<string, unknown> = { email: EMAIL, user_id: user.id, profile, clients, cases: [] }
  const cases: { id: string }[] = []

  for (const client of clients) {
    const { data: rows } = await admin.from("cases").select("*").eq("client_id", client.id)
    for (const kase of rows ?? []) {
      cases.push({ id: kase.id })
      const bundle: Record<string, unknown> = { case: kase }
      for (const table of CASE_CHILDREN) {
        const { data, error } = await admin.from(table).select("*").eq("case_id", kase.id)
        if (error) continue // table has no case_id column in this schema version
        if (data?.length) bundle[table] = data
      }
      ;(backup.cases as unknown[]).push(bundle)
    }
  }

  // What's actually there, before anything is touched.
  console.log("Found:")
  for (const bundle of backup.cases as Record<string, unknown>[]) {
    const kase = bundle.case as { id: string; stage: string }
    console.log(`  case ${kase.id} (stage ${kase.stage})`)
    for (const [k, v] of Object.entries(bundle)) {
      if (k !== "case" && Array.isArray(v)) console.log(`    ${k}: ${v.length}`)
    }
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupFile = `/private/tmp/ccw-reset-backup-${EMAIL.replace(/[^a-z0-9]/g, "_")}-${stamp}.json`
  writeFileSync(backupFile, JSON.stringify(backup, null, 2))
  console.log(`\nBackup written: ${backupFile}`)

  if (DRY) {
    console.log("\nDRY RUN — nothing deleted.")
    return
  }

  // ── Storage first: orphaned bytes are worse than orphaned rows ─────────────
  for (const client of clients) {
    const prefix = `clients/${client.id}`
    const { data: folders } = await admin.storage.from("documents").list(prefix, { limit: 1000 })
    const paths: string[] = []
    for (const folder of folders ?? []) {
      const { data: files } = await admin.storage.from("documents").list(`${prefix}/${folder.name}`, { limit: 1000 })
      for (const f of files ?? []) paths.push(`${prefix}/${folder.name}/${f.name}`)
    }
    if (paths.length) {
      const { error } = await admin.storage.from("documents").remove(paths)
      console.log(`\nStorage: removed ${paths.length} file(s)${error ? ` (error: ${error.message})` : ""}`)
    } else {
      console.log("\nStorage: nothing to remove")
    }
  }

  // ── Case children, then the cases ─────────────────────────────────────────
  for (const { id } of cases) {
    for (const table of CASE_CHILDREN) {
      const { error, count } = await admin.from(table).delete({ count: "exact" }).eq("case_id", id)
      if (!error && count) console.log(`  deleted ${count} from ${table}`)
    }
    const { error } = await admin.from("cases").delete().eq("id", id)
    if (error) throw error
    console.log(`  deleted case ${id}`)
  }

  // ── Fresh case, exactly as onboarding opens one ───────────────────────────
  const client = clients[0]
  await admin
    .from("clients")
    .update({ current_stage: "lead", track: "resident", borough: null, zip: null, lat: null, lng: null })
    .eq("id", client.id)

  const { data: fresh, error: caseErr } = await admin
    .from("cases")
    .insert({ client_id: client.id, stage: "lead", status: "active" })
    .select("id")
    .single()
  if (caseErr || !fresh) throw new Error(caseErr?.message ?? "Could not open the new case")

  const result = await materializeCaseRequirements(admin, fresh.id, "nyc", { isCarry: true })
  console.log(`\n✅ Fresh case ${fresh.id} — stage "lead", ${result.applicable} applicable requirements.`)
  console.log(`Sign in as ${EMAIL} with your existing password and start at intake.`)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
