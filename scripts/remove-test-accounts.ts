/**
 * Permanently remove explicitly confirmed test accounts from auth and case data.
 *
 * Safety:
 * - exact, comma-separated email allowlist only
 * - refuses to remove staff/admin profiles
 * - writes a timestamped JSON backup before changing anything
 * - DRY=1 resolves and reports targets without deleting them
 *
 * Usage:
 *   DRY=1 EMAILS=a@example.com,b@example.com ENV_FILE=/path/to/env pnpm exec tsx scripts/remove-test-accounts.ts
 *   CONFIRM=REMOVE_TEST_ACCOUNTS EMAILS=a@example.com,b@example.com ENV_FILE=/path/to/env pnpm exec tsx scripts/remove-test-accounts.ts
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync, writeFileSync } from "node:fs"

const envFile = process.env.ENV_FILE ?? ".env.local"
const env = Object.fromEntries(
  readFileSync(envFile, "utf8")
    .split("\n")
    .filter((line) => line.includes("="))
    .map((line) => {
      const index = line.indexOf("=")
      return [line.slice(0, index).trim(), line.slice(index + 1).trim().replace(/^"|"$/g, "")]
    }),
)

const admin = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, {
  auth: { persistSession: false },
})
const dry = process.env.DRY === "1"
const confirmed = process.env.CONFIRM === "REMOVE_TEST_ACCOUNTS"
const emails = [...new Set((process.env.EMAILS ?? "").split(",").map((email) => email.trim().toLowerCase()).filter(Boolean))]

const CASE_TABLES = [
  "activity_log",
  "appointments",
  "bookings",
  "case_notes",
  "case_requirements",
  "case_stages",
  "character_references",
  "checklist_items",
  "cohabitants",
  "disclosures",
  "documents",
  "engagements",
  "generated_documents",
  "instructor_offers",
  "intake_sessions",
  "license_reports",
  "messages",
  "payments",
  "purchase_authorizations",
  "reference_requests",
  "reminder_log",
  "requirement_answers",
  "signature_events",
  "signatures",
  "tasks",
  "training_sessions",
] as const

async function listStoragePaths(prefix: string): Promise<string[]> {
  const paths: string[] = []
  const pending = [prefix]
  while (pending.length) {
    const current = pending.pop()!
    const { data, error } = await admin.storage.from("documents").list(current, { limit: 1000 })
    if (error) throw error
    for (const entry of data ?? []) {
      const path = `${current}/${entry.name}`
      if (entry.id) paths.push(path)
      else pending.push(path)
    }
  }
  return paths
}

async function main() {
  if (!emails.length) throw new Error("Set EMAILS to an exact comma-separated allowlist")
  if (!dry && !confirmed) throw new Error("Set CONFIRM=REMOVE_TEST_ACCOUNTS for a real removal")

  const [{ data: allUsers, error: usersError }, { data: allClients, error: clientsError }] = await Promise.all([
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
    admin.from("clients").select("*"),
  ])
  if (usersError) throw usersError
  if (clientsError) throw clientsError

  const users = allUsers.users.filter((user) => user.email && emails.includes(user.email.toLowerCase()))
  const userIds = new Set(users.map((user) => user.id))
  const clients = (allClients ?? []).filter((client) =>
    (client.email && emails.includes(client.email.toLowerCase())) ||
    (client.profile_id && userIds.has(client.profile_id)),
  )
  const foundEmails = new Set([
    ...users.map((user) => user.email!.toLowerCase()),
    ...clients.map((client) => client.email?.toLowerCase()).filter((email): email is string => !!email),
  ])
  const missing = emails.filter((email) => !foundEmails.has(email))
  if (missing.length) throw new Error(`No account or client record found for: ${missing.join(", ")}`)

  if (userIds.size) {
    const { data: profiles, error } = await admin.from("profiles").select("id, role, full_name").in("id", [...userIds])
    if (error) throw error
    const unsafe = (profiles ?? []).filter((profile) => profile.role !== "client")
    if (unsafe.length) throw new Error(`Refusing to remove non-client profile(s): ${unsafe.map((profile) => `${profile.full_name} (${profile.role})`).join(", ")}`)
  }

  const clientIds = clients.map((client) => client.id)
  const { data: cases, error: casesError } = clientIds.length
    ? await admin.from("cases").select("*").in("client_id", clientIds)
    : { data: [], error: null }
  if (casesError) throw casesError

  const caseIds = (cases ?? []).map((kase) => kase.id)
  const { data: paidRows, error: paidError } = caseIds.length
    ? await admin
        .from("payments")
        .select(
          "case_id, amount_cents, status, stripe_payment_intent, stripe_invoice_id, stripe_session_id",
        )
        .in("case_id", caseIds)
        .eq("status", "paid")
        .gt("amount_cents", 0)
    : { data: [], error: null }
  if (paidError) throw paidError
  const protectedPayments = (paidRows ?? []).filter(
    (row) => row.stripe_payment_intent || row.stripe_invoice_id || row.stripe_session_id,
  )
  if (protectedPayments.length) {
    throw new Error(
      `Refusing to remove ${protectedPayments.length} case(s) tied to real Stripe money`,
    )
  }

  const { data: promoClaims, error: promoError } = clientIds.length
    ? await admin.from("promo_code_claims").select("*").in("client_id", clientIds)
    : { data: [], error: null }
  if (promoError) throw promoError
  const { data: marketingContacts, error: marketingError } = await admin
    .from("marketing_contacts")
    .select("*")
    .in("email", emails)
  if (marketingError) throw marketingError

  const backup: Record<string, unknown> = {
    created_at: new Date().toISOString(),
    target_emails: emails,
    auth_users: users.map((user) => ({ id: user.id, email: user.email, created_at: user.created_at, user_metadata: user.user_metadata })),
    clients,
    promo_code_claims: promoClaims ?? [],
    marketing_contacts: marketingContacts ?? [],
    cases: [],
  }
  for (const kase of cases ?? []) {
    const bundle: Record<string, unknown> = { case: kase }
    for (const table of CASE_TABLES) {
      const { data, error } = await admin.from(table).select("*").eq("case_id", kase.id)
      if (!error && data?.length) bundle[table] = data
    }
    ;(backup.cases as unknown[]).push(bundle)
  }

  const stamp = new Date().toISOString().replace(/[:.]/g, "-")
  const backupFile = `/private/tmp/ccw-test-account-backup-${stamp}.json`
  writeFileSync(backupFile, JSON.stringify(backup, null, 2))
  console.log(JSON.stringify({ dry, emails, users: users.length, clients: clients.length, cases: cases?.length ?? 0, backupFile }, null, 2))
  if (dry) return

  for (const client of clients) {
    const storagePaths = await listStoragePaths(`clients/${client.id}`)
    if (storagePaths.length) {
      const { error } = await admin.storage.from("documents").remove(storagePaths)
      if (error) throw error
    }
  }

  // Promo claims intentionally restrict case/client deletion. They and the
  // opted-in marketing row are part of the explicitly confirmed test identity,
  // so back them up above and remove them before the client cascade.
  if (clientIds.length) {
    const { error } = await admin.from("promo_code_claims").delete().in("client_id", clientIds)
    if (error) throw error
  }
  if (marketingContacts?.length) {
    const { error } = await admin
      .from("marketing_contacts")
      .delete()
      .in(
        "id",
        marketingContacts.map((contact) => contact.id),
      )
    if (error) throw error
  }

  if (clientIds.length) {
    const { error } = await admin.from("clients").delete().in("id", clientIds)
    if (error) throw error
  }
  for (const user of users) {
    const { error } = await admin.auth.admin.deleteUser(user.id)
    if (error) throw error
  }

  const [{ data: remainingClients }, { data: remainingCases }, remainingUsers] = await Promise.all([
    clientIds.length ? admin.from("clients").select("id").in("id", clientIds) : Promise.resolve({ data: [] }),
    clientIds.length ? admin.from("cases").select("id").in("client_id", clientIds) : Promise.resolve({ data: [] }),
    admin.auth.admin.listUsers({ page: 1, perPage: 1000 }),
  ])
  const remainingUserIds = new Set(remainingUsers.data.users.map((user) => user.id))
  const undeletedUsers = users.filter((user) => remainingUserIds.has(user.id))
  if (remainingClients?.length || remainingCases?.length || undeletedUsers.length) {
    throw new Error("Verification failed: one or more confirmed test records remain")
  }
  console.log(`Removed ${users.length} auth user(s), ${clients.length} client record(s), and ${cases?.length ?? 0} case(s).`)
}

main().catch((error) => {
  console.error(error)
  process.exit(1)
})
