/**
 * One-off: stand up a TEST two-party sponsored case on whatever DB the env points
 * at (run with the PROD env to seed hosted). Mirrors the real ISS/Chery flow:
 *   • an UNCLAIMED applicant (claim-by-email on first signup) + a case pre-seeded
 *     as an NYC Carry Guard file (armed requirements + the company packet);
 *   • a provisioned sponsor rep (role='sponsor') + an unconsented full-scope
 *     sponsorship, so the tester experiences granting consent as the applicant.
 *
 * Idempotent: re-running wipes the prior test rows for these two emails first.
 *
 *   ENV_FILE=.env.prod tsx scripts/seed-sponsor-test.ts
 */
import { config as loadEnv } from "dotenv"
loadEnv({ path: process.env.ENV_FILE || ".env.local" })

import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { randomBytes } from "node:crypto"
import type { Database } from "../lib/supabase/types"
import { materializeCaseRequirements, materializeSponsorPacket } from "../lib/requirements/materialize"
import { toGeneratorAnswers, type WizardAnswers } from "../lib/intake/answers"
import { resolveArmedTrack } from "../lib/requirements/track"
import { backfillCaseFacts } from "../lib/facts/resolve"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
const db: SupabaseClient<Database> = createClient(URL, KEY, { auth: { persistSession: false } })

const APPLICANT_EMAIL = "se2018+applicant@gmail.com"
const SPONSOR_EMAIL = "se2018+sponsor@gmail.com"
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://gunlicensenyc.com"

async function findUserByEmail(email: string): Promise<string | null> {
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })
  return data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase())?.id ?? null
}

async function cleanup() {
  // Applicant: deleting the client cascades to the case → sponsorship.
  const { data: clients } = await db.from("clients").select("id").ilike("email", APPLICANT_EMAIL)
  for (const c of clients ?? []) await db.from("clients").delete().eq("id", c.id)
  // Any orphan sponsorships/sponsors from a half-run.
  const { data: sponsors } = await db.from("sponsors").select("id").eq("legal_name", "Test Guard Co.")
  for (const s of sponsors ?? []) {
    await db.from("case_sponsorships").delete().eq("sponsor_id", s.id)
    await db.from("sponsors").delete().eq("id", s.id)
  }
  // Sponsor rep auth user + its profile.
  const existing = await findUserByEmail(SPONSOR_EMAIL)
  if (existing) await db.auth.admin.deleteUser(existing).catch(() => {})
}

async function main() {
  console.log(`Seeding sponsor test on ${URL} …`)
  await cleanup()

  // 1. The company.
  const { data: sponsor } = await db.from("sponsors").insert({ legal_name: "Test Guard Co." }).select("id").single()

  // 2. The applicant — an UNCLAIMED lead + a case (claim-by-email adopts these).
  //    A real two-token legal name so the fact layer resolves first/last cleanly.
  const { data: client } = await db
    .from("clients")
    .insert({
      full_name: "Marcus Powell",
      email: APPLICANT_EMAIL,
      phone: "(212) 555-0148",
      borough: "Manhattan",
      zip: "10001",
      track: "resident",
      current_stage: "lead",
      lead_source: "sponsor_test",
      profile_id: null,
    })
    .select("id")
    .single()
  // A sponsored case is a concierge experience unlocked by the sponsorship itself,
  // not a Stripe purchase — so seed service_mode='concierge' deliberately (never an
  // accident of the seed).
  const { data: kase } = await db
    .from("cases")
    .insert({ client_id: client!.id, stage: "document_collection", service_mode: "concierge" })
    .select("id")
    .single()
  const caseId = kase!.id

  // 3. Pre-complete a FULL NYC Carry Guard applicant intake so every applicant-owned
  //    form fills and the completeness gate is satisfied. Business fields are left
  //    OUT on purpose — for a sponsored guard the employer IS the sponsoring company,
  //    supplied through the rep's company profile, not the applicant's intake.
  const answers: WizardAnswers = {
    dob: "1990-01-01",
    residence: "nyc",
    borough: "Manhattan",
    licenseType: "carry",
    middleInitial: "J",
    legalStreet: "123 Test St",
    legalApt: "4B",
    legalCity: "New York",
    legalState: "NY",
    placeOfBirth: "Brooklyn, NY, USA",
    sex: "Male",
    heightInches: 70,
    weightLbs: 180,
    hairColor: "Brown",
    eyeColor: "Brown",
    citizenship: "citizen",
    occupation: "Security officer",
    prohibitorFelony: false,
    prohibitorMentalHealth: false,
    prohibitorActiveOop: false,
    prohibitorUnlawfulDrug: false,
  }
  await db
    .from("intake_sessions")
    .upsert(
      { case_id: caseId, answers: answers as never, completed_at: new Date().toISOString() },
      { onConflict: "case_id" }
    )

  // 4. The sponsorship (full scope, NOT consented — the tester grants it).
  const token = randomBytes(24).toString("base64url")
  const { data: sponsorship } = await db
    .from("case_sponsorships")
    .insert({
      case_id: caseId,
      sponsor_id: sponsor!.id,
      invited_email: SPONSOR_EMAIL,
      invited_name: "Test Rep",
      invite_token: token,
      scope: "full",
      status: "invited",
    })
    .select("id")
    .single()

  // 5. Resolve the armed track + seed the applicant set and the company packet.
  const armed = resolveArmedTrack(answers)
  await db.from("cases").update({ license_track: armed.track }).eq("id", caseId)
  await materializeCaseRequirements(db, caseId, "nyc", toGeneratorAnswers(answers, { isRenewal: false, armed }))
  await materializeSponsorPacket(db, caseId)
  // Seed case_facts from the intake/client record, exactly as real intake processing
  // does — so the applicant's forms resolve from the canonical fact layer.
  await backfillCaseFacts(db, caseId)

  // 6. The sponsor rep account (pre-confirmed, role='sponsor').
  const tempPassword = randomBytes(9).toString("base64url")
  const { data: created, error } = await db.auth.admin.createUser({
    email: SPONSOR_EMAIL,
    password: tempPassword,
    email_confirm: true,
    user_metadata: { full_name: "Test Rep" },
  })
  if (error || !created.user) throw new Error(`createUser: ${error?.message}`)
  const repId = created.user.id
  await db.from("profiles").update({ role: "sponsor", sponsor_id: sponsor!.id, full_name: "Test Rep" }).eq("id", repId)
  await db.from("case_sponsorships").update({ rep_profile_id: repId }).eq("id", sponsorship!.id)

  console.log("\n✓ Test two-party case ready.\n")
  console.log(
    JSON.stringify(
      {
        applicant: { email: APPLICANT_EMAIL, action: "SIGN UP on the site — case auto-claims by email", track: armed.track },
        sponsor: {
          email: SPONSOR_EMAIL,
          action: "SIGN IN (account already exists) or use the invite link",
          tempPassword,
          inviteUrl: `${SITE}/invite/${token}`,
        },
        caseId,
      },
      null,
      2
    )
  )
}

main().then(() => process.exit(0)).catch((e) => {
  console.error(e)
  process.exit(1)
})
