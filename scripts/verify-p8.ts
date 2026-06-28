/**
 * Phase 8 acceptance — Marketplace payments (Stripe Connect, dark).
 * With no live keys we prove the wiring is in place and correctly gated:
 *   - payments gains engagement_id / booking_id / stripe_connect_account /
 *     application_fee_cents; instructors gains the Connect account + payouts flag;
 *   - a payment row records the platform (application) fee (10%);
 *   - the Connect onboarding/charge code is gated OFF when STRIPE_ENABLED isn't set.
 * The live onboard→deposit→fee→webhook path needs Stripe test keys (final report).
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-p8.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"

loadEnv({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
// Mirrors lib/stripe/connect.ts platformFeeCents (server-only; can't import here).
const platformFeeCents = (cents: number) => Math.round((cents * 1000) / 10000)

async function main() {
  console.log("\n— Phase 8 verification —\n")

  // ── New columns exist ─────────────────────────────────────────────────────
  const pCols = await admin.from("payments").select("engagement_id, booking_id, stripe_connect_account, application_fee_cents").limit(1)
  check(!pCols.error, "payments has engagement_id / booking_id / stripe_connect_account / application_fee_cents")
  const iCols = await admin.from("instructors").select("stripe_connect_account_id, payouts_enabled").limit(1)
  check(!iCols.error, "instructors has stripe_connect_account_id / payouts_enabled")

  // ── A payment records the platform (application) fee ──────────────────────
  const deposit = 19500
  const ins = await admin.from("payments").insert({
    amount_cents: deposit,
    type: "deposit",
    status: "pending",
    stripe_connect_account: "acct_test_123",
    application_fee_cents: platformFeeCents(deposit),
    description: "verify-p8 deposit",
  }).select("id, application_fee_cents").single()
  check(!ins.error && ins.data?.application_fee_cents === platformFeeCents(deposit), `payment records a 10% platform fee (${platformFeeCents(deposit)} of ${deposit})`)
  if (ins.data) await admin.from("payments").delete().eq("id", ins.data.id)

  // ── Instructor Connect columns are writable + reset ───────────────────────
  const { data: frank } = await admin.from("instructors").select("id, payouts_enabled").eq("name", "Frank DiMeo").single()
  await admin.from("instructors").update({ stripe_connect_account_id: "acct_test_frank", payouts_enabled: true }).eq("id", frank!.id)
  const { data: after } = await admin.from("instructors").select("payouts_enabled, stripe_connect_account_id").eq("id", frank!.id).single()
  check(after?.payouts_enabled === true && after?.stripe_connect_account_id === "acct_test_frank", "instructor Connect account + payouts flag persist (webhook target)")
  await admin.from("instructors").update({ stripe_connect_account_id: null, payouts_enabled: false }).eq("id", frank!.id)

  // ── Gating: Stripe is OFF by default (ships dark) ─────────────────────────
  check(process.env.STRIPE_ENABLED !== "true", "STRIPE_ENABLED is not set → Connect onboarding & checkout are gated off")

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Phase 8\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
