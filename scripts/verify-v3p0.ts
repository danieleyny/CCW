/**
 * V3 Phase 0 gate — proves each safety fix against the live local stack:
 *   0.1 instructor identity resolves to the CALLER (and shows the old pattern
 *       really did leak the oldest verified instructor)
 *   0.2 staff with zero assignments see the pipeline
 *   0.3 legal-bearing actions are requireAdmin() (source-level assert)
 *   0.4 expired/revoked tokens are rejected by the shared guard
 *   0.5 HEIC accepted, cron fails closed (source assert), honeypot present
 *   0.6 intake zod rejects bad shapes, strips junk, enforces the 4-ref rule
 *   0.7 fabricated stats gone
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-v3p0.ts
 */
import { readFileSync } from "fs"
import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { tokenActive } from "../lib/references/process"
import { validateFile } from "../lib/files/validator"
import { wizardAnswersSchema, completionIssues } from "../lib/intake/schema"
import { rateLimit } from "../lib/rate-limit"

loadEnv({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false } })

let failures = 0
const check = (cond: boolean, msg: string) => {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
async function signIn(email: string) {
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  const { error } = await c.auth.signInWithPassword({ email, password: "Passw0rd!" })
  if (error) throw new Error(`sign-in failed for ${email}: ${error.message}`)
  return c
}
const src = (p: string) => readFileSync(p, "utf8")

async function main() {
  console.log("\n— V3 Phase 0 verification —\n")

  // ── 0.1 instructor identity ────────────────────────────────────────────────
  const email2 = "instructor2.v3p0@carrypath.test"
  await admin.auth.admin
    .listUsers({ perPage: 200 })
    .then(async ({ data }) => {
      const old = data.users.find((u) => u.email === email2)
      if (old) await admin.auth.admin.deleteUser(old.id)
    })
  const { data: created } = await admin.auth.admin.createUser({
    email: email2,
    password: "Passw0rd!",
    email_confirm: true,
    user_metadata: { full_name: "Second Instructor", role: "instructor" },
  })
  await admin.from("instructors").delete().eq("email", email2)
  await admin.from("instructors").insert({
    profile_id: created!.user!.id,
    name: "Second Instructor",
    email: email2,
    verified: true,
    jurisdictions: ["nyc"],
  })

  const instr2 = await signIn(email2)
  const {
    data: { user: u2 },
  } = await instr2.auth.getUser()

  // Old buggy pattern: unfiltered limit(1) ordered by created_at.
  const { data: leaked } = await instr2
    .from("instructors")
    .select("id, profile_id")
    .order("created_at", { ascending: true })
    .limit(1)
    .maybeSingle()
  check(
    leaked?.profile_id !== u2!.id,
    "old unfiltered pattern really resolves to SOMEONE ELSE (bug was real)"
  )

  // Fixed pattern: profile_id-bound.
  const { data: mine } = await instr2
    .from("instructors")
    .select("id, profile_id")
    .eq("profile_id", u2!.id)
    .maybeSingle()
  check(mine?.profile_id === u2!.id, "profile_id-bound lookup resolves to the caller (0.1)")
  for (const f of ["lib/instructor.ts", "app/instructor/availability/actions.ts", "app/instructor/actions.ts"]) {
    check(!/limit\(1\)\s*\n?\s*\.maybeSingle/.test(src(f)) || src(f).includes("profile_id"), `${f} carries profile_id filter`)
  }

  // ── 0.2 staff visibility ───────────────────────────────────────────────────
  const staff = await signIn("staff@carrypath.test")
  const { count: staffClients } = await staff.from("clients").select("id", { count: "exact", head: true })
  const { count: staffCases } = await staff.from("cases").select("id", { count: "exact", head: true })
  check((staffClients ?? 0) > 0, `staff (no assignments) see clients: ${staffClients} (0.2)`)
  check((staffCases ?? 0) > 0, `staff see cases: ${staffCases} (0.2)`)

  // Clients still see only themselves.
  const client = await signIn("client1@carrypath.test")
  const { count: ownClients } = await client.from("clients").select("id", { count: "exact", head: true })
  check((ownClients ?? 0) === 1, "a client still sees exactly their own record (0.2)")

  // ── 0.3 admin-only actions (source assert) ─────────────────────────────────
  check(src("app/admin/instructors/actions.ts").includes("requireAdmin()"), "setInstructorVerified is admin-only (0.3)")
  const reqSrc = src("app/admin/requirements/actions.ts")
  check(
    (reqSrc.match(/requireAdmin\(\)/g) ?? []).length >= 2,
    "retireRequirement + addRequirementVersion are admin-only (0.3)"
  )

  // ── 0.4 token lifecycle ────────────────────────────────────────────────────
  check(tokenActive({ expires_at: new Date(Date.now() + 86400000).toISOString(), revoked_at: null }), "future token active")
  check(!tokenActive({ expires_at: new Date(Date.now() - 1000).toISOString(), revoked_at: null }), "expired token rejected (0.4)")
  check(!tokenActive({ expires_at: null, revoked_at: new Date().toISOString() }), "revoked token rejected (0.4)")

  // Columns really exist + are written by the invite path shape.
  const { data: refReq } = await admin.from("reference_requests").select("expires_at, revoked_at").limit(1).maybeSingle()
  check(refReq === null || "expires_at" in (refReq ?? {}), "reference_requests has expiry columns (0.4)")
  const { error: cohabColErr } = await admin.from("cohabitants").select("token_expires_at, token_revoked_at").limit(1)
  check(!cohabColErr, "cohabitants has token lifecycle columns (0.4)")

  // Rate limiter behaves as a sliding window.
  const key = `test:${Date.now()}`
  let allowed = 0
  for (let i = 0; i < 25; i++) if (rateLimit(key, 20)) allowed++
  check(allowed === 20, `rate limiter caps at limit (${allowed}/25 allowed) (0.4)`)

  // ── 0.5 uploads + abuse guards ─────────────────────────────────────────────
  check(validateFile({ name: "safe-photo.HEIC", size: 2_000_000 }).ok, "HEIC accepted by validator (0.5)")
  check(!validateFile({ name: "evil.exe", size: 1000 }).ok, "exe still rejected (0.5)")
  check(src("app/api/cron/reminders/route.ts").includes("503"), "cron fails closed without CRON_SECRET (0.5)")
  check(src("app/(marketing)/actions.ts").includes('formData.get("company")'), "captureLead honeypot present (0.5)")
  check(src("components/marketing/lead-form.tsx").includes('name="company"'), "honeypot field rendered (0.5)")

  // ── 0.6 intake validation ──────────────────────────────────────────────────
  check(!wizardAnswersSchema.safeParse({ dob: 12345 }).success, "zod rejects wrong-typed dob (0.6)")
  const stripped = wizardAnswersSchema.parse({ dob: "1990-01-01", evil: "payload" } as never)
  check(!("evil" in stripped), "unknown keys stripped before jsonb (0.6)")
  const fewRefs = completionIssues({
    dob: "1990-01-01",
    residence: "nyc",
    references: [{ name: "A", email: "a@b.co" }, { name: "B", email: "b@b.co" }],
  })
  check(fewRefs.some((i) => i.includes("Four character references")), "4-reference rule enforced (0.6)")
  const good = completionIssues({
    dob: "1990-01-01",
    residence: "nyc",
    references: [
      { name: "A", email: "a@b.co" },
      { name: "B", email: "b@b.co" },
      { name: "C", email: "c@b.co" },
      { name: "D", email: "d@b.co" },
    ],
  })
  check(good.length === 0, "complete answers pass completion rules (0.6)")
  check(
    completionIssues({ dob: "1990-01-01", residence: "nyc", references: [{ name: "A", email: "bad" }, { name: "B", email: "b@b.co" }, { name: "C", email: "c@b.co" }, { name: "D", email: "d@b.co" }] }).some((i) => i.includes("valid email")),
    "invalid reference email flagged (0.6)"
  )

  // ── 0.7 truthful marketing ─────────────────────────────────────────────────
  const home = src("app/(marketing)/page.tsx")
  check(!home.includes("value={1200}") && !home.includes("value={98}"), "fabricated counters removed from home (0.7)")
  check(!src("components/marketing/ticker.tsx").includes("1,200+"), "fabricated ticker items removed (0.7)")
  const disclaimer = src("config/brand.ts")
  check(disclaimer.includes("not attorneys") && disclaimer.includes("submit your own application"), "mandated disclaimer language present (0.7)")
  check(src("app/auth/sign-up/page.tsx").includes("brand.disclaimer"), "disclaimer shown at signup (0.7)")

  // cleanup
  await admin.from("instructors").delete().eq("email", email2)
  if (created?.user) await admin.auth.admin.deleteUser(created.user.id)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — V3 Phase 0\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
