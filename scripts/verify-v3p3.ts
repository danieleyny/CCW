/**
 * V3 Phase 3 gate — revenue + retention:
 *   3.1 packages in the DB (anon-readable, admin-write-only), pages read them,
 *       checkout/webhook wiring present, invoice fallback path exists
 *   3.2 lifecycle math (30d auth / 90d rule / 72h inspection), client can log
 *       their own authorizations + §5-24 reports (and only their own),
 *       lifecycle reminders fire once
 *   3.3 appeal seam: honest copy + referral action, record export reachable
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-v3p3.ts
 */
import { existsSync, readFileSync } from "fs"
import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { authExpiresOn, inspectionDueAt, nextEligiblePurchaseOn } from "../lib/license"
import { getActivePackages } from "../lib/packages"
import { runReminderEngine } from "../lib/reminders/engine"

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
  if (error) throw new Error(`sign-in failed: ${error.message}`)
  return c
}
const src = (p: string) => readFileSync(p, "utf8")

async function main() {
  console.log("\n— V3 Phase 3 verification —\n")

  // ── 3.1 packages in the DB ─────────────────────────────────────────────────
  const pkgs = await getActivePackages(admin)
  check(pkgs.length >= 4, `service_packages seeded (${pkgs.length}) (3.1)`)
  // V5 — concierge repriced $1,999 → $1,000 (migration …001400).
  check(pkgs.find((p) => p.key === "full_concierge")?.priceCents === 100000, "concierge $1,000 from DB (3.1)")
  check(pkgs.find((p) => p.key === "non_resident")?.priceLabel === "Custom", "custom price label from DB (3.1)")

  // A STRANGER (anonymous) can read the pricing data.
  const anonClient = createClient<Database>(URL, ANON, { auth: { persistSession: false } })
  const anonPkgs = await getActivePackages(anonClient)
  check(anonPkgs.length >= 4, "anonymous visitors read active packages (3.1)")

  // Pricing edits are admin-only.
  const staff = await signIn("staff@carrypath.test")
  const { error: staffEdit } = await staff.from("service_packages").update({ price_cents: 1 }).eq("key", "renewal")
  const { data: after } = await admin.from("service_packages").select("price_cents").eq("key", "renewal").single()
  check(!!staffEdit || after!.price_cents === 39900, "staff cannot edit pricing (admin-only RLS) (3.1)")

  check(!src("lib/stripe/index.ts").includes("SERVICE_PACKAGES ="), "hardcoded SERVICE_PACKAGES removed (3.1)")
  check(src("app/(marketing)/pricing/page.tsx").includes("getActivePackages"), "pricing page reads the DB (3.1)")
  const enrollSrc = src("app/portal/enroll/actions.ts")
  check(enrollSrc.includes("checkout.sessions.create") && enrollSrc.includes("payment_id"), "checkout creates a session w/ reconcilable metadata (3.1)")
  check(enrollSrc.includes("requestInvoice"), "Stripe-dark invoice fallback exists (3.1)")
  check(src("app/api/stripe/webhook/route.ts").includes("payment_id"), "webhook reconciles by payment_id (3.1)")

  // ── 3.2 lifecycle math ─────────────────────────────────────────────────────
  check(authExpiresOn("2026-07-01") === "2026-07-31", "authorization valid exactly 30 days (3.2)")
  check(inspectionDueAt("2026-07-01").startsWith("2026-07-04"), "inspection due 72 hours after purchase (3.2)")
  check(nextEligiblePurchaseOn("2026-07-01") === "2026-09-29", "next purchase eligible after 90 days (3.2)")

  // ── 3.2 RLS: a client logs their OWN lifecycle events, and only their own ──
  const client1 = await signIn("client1@carrypath.test")
  const { data: myCase } = await client1.from("cases").select("id, client_id").limit(1).single()
  const soonExpiry = new Date(Date.now() + 3 * 86400000).toISOString().slice(0, 10)
  const { data: auth1, error: authErr } = await client1
    .from("purchase_authorizations")
    .insert({
      case_id: myCase!.id,
      client_id: myCase!.client_id,
      authorized_on: new Date().toISOString().slice(0, 10),
      expires_on: soonExpiry, // expiring soon → reminder should fire
    })
    .select("id")
    .single()
  check(!authErr && !!auth1, `client logs their own purchase authorization (${authErr?.message ?? "ok"}) (3.2)`)

  const { data: report, error: repErr } = await client1
    .from("license_reports")
    .insert({ case_id: myCase!.id, client_id: myCase!.client_id, kind: "address_change", details: "Moved within Manhattan on 7/1." })
    .select("id")
    .single()
  check(!repErr && !!report, "client files a §5-24 report (3.2)")

  // Negative: client2 cannot write into client1's case.
  const client2 = await signIn("client2@carrypath.test")
  const { error: crossErr } = await client2.from("purchase_authorizations").insert({
    case_id: myCase!.id,
    client_id: myCase!.client_id,
    authorized_on: "2026-07-01",
    expires_on: "2026-07-31",
  })
  check(!!crossErr, "another client CANNOT log events on someone else's case (RLS) (3.2)")

  // Staff acknowledge.
  const { data: staffProf } = await admin.from("profiles").select("id").eq("role", "staff").limit(1).single()
  const { error: ackErr } = await staff
    .from("license_reports")
    .update({ acknowledged_by: staffProf!.id, acknowledged_at: new Date().toISOString() })
    .eq("id", report!.id)
  check(!ackErr, "staff acknowledge a §5-24 report (3.2)")

  // ── 3.2 lifecycle reminders (auth expiring; overdue inspection; runway; county)
  const { data: auth2 } = await admin
    .from("purchase_authorizations")
    .insert({
      case_id: myCase!.id,
      client_id: myCase!.client_id,
      authorized_on: "2026-07-01",
      expires_on: "2026-07-31",
      acquired_on: new Date(Date.now() - 4 * 86400000).toISOString().slice(0, 10),
      inspection_due: new Date(Date.now() - 86400000).toISOString(), // overdue
    })
    .select("id")
    .single()
  await admin
    .from("cases")
    .update({
      stage: "licensed",
      license_expires_on: new Date(Date.now() + 200 * 86400000).toISOString().slice(0, 10), // in runway
      county_license_expires_on: new Date(Date.now() + 30 * 86400000).toISOString().slice(0, 10),
    })
    .eq("id", myCase!.id)

  const fired = await runReminderEngine(admin)
  const mine = fired.filter((f) => f.caseId === myCase!.id).map((f) => f.ruleKey)
  check(mine.includes("purchase_auth_expiring"), `auth-expiring reminder fired (${mine.join(",")}) (3.2)`)
  check(mine.includes("inspection_due"), "overdue-inspection reminder fired (3.2)")
  check(mine.includes("renewal_runway"), "renewal-runway (T-9mo) reminder fired (3.2)")
  check(mine.includes("county_license_expiring"), "county-dependency reminder fired (3.2)")
  const fired2 = await runReminderEngine(admin)
  check(
    fired2.filter((f) => f.caseId === myCase!.id && f.ruleKey.match(/auth|inspection|runway|county/)).length === 0,
    "lifecycle reminders idempotent (3.2)"
  )

  // ── 3.3 appeal seam ────────────────────────────────────────────────────────
  const appealSrc = src("app/portal/appeal/page.tsx")
  check(/only you or a New York–licensed attorney/i.test(appealSrc), "appeal page states the only-applicant-or-attorney rule (3.3)")
  check(appealSrc.includes("/portal/packet"), "record export reachable from the appeal page (3.3)")
  check(existsSync("app/portal/appeal/actions.ts"), "attorney-referral action exists (3.3)")
  check(!/we (can|will) file (the|your) appeal/i.test(appealSrc), "no claim that WE file the appeal (3.3)")

  // cleanup
  await admin.from("purchase_authorizations").delete().in("id", [auth1!.id, auth2!.id])
  await admin.from("license_reports").delete().eq("id", report!.id)
  await admin
    .from("cases")
    .update({ stage: "document_collection", license_expires_on: null, county_license_expires_on: null })
    .eq("id", myCase!.id)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — V3 Phase 3\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
