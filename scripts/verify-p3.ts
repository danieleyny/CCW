/**
 * Phase 3 acceptance — Instructor accounts & profiles.
 * Proves the roadmap "Done when": an instructor can be verified by admin and
 * appears in a geo query, and an UNVERIFIED instructor never appears to clients.
 * Also checks instructor own-row access and the verify/unverify toggle.
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-p3.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"

loadEnv({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}

const BROOKLYN = { lat: 40.6782, lng: -73.9442 }
const QUEENS = { lat: 40.7282, lng: -73.7949 }

async function main() {
  console.log("\n— Phase 3 verification —\n")

  const { data: frank } = await admin.from("instructors").select("id, verified").eq("name", "Frank DiMeo").single()
  const { data: lena } = await admin.from("instructors").select("id, verified").eq("name", "Lena Ortiz").single()
  check(frank?.verified === true, "seed: Frank is verified")
  check(lena?.verified === false, "seed: Lena is unverified")

  // ── Geo RPC returns verified only ─────────────────────────────────────────
  const { data: near } = await admin.rpc("instructors_within_radius", {
    p_lat: BROOKLYN.lat, p_lng: BROOKLYN.lng, p_radius_mi: 30, p_jurisdiction: "nyc",
  })
  const names = (near ?? []).map((r: { name: string }) => r.name)
  check(names.includes("Frank DiMeo"), "geo query returns the verified instructor (Frank)")
  check(!names.includes("Lena Ortiz"), "geo query EXCLUDES the unverified instructor (Lena)")

  // ── Client RLS: only verified instructors are visible ─────────────────────
  const c1 = createClient(URL, ANON, { auth: { persistSession: false } })
  await c1.auth.signInWithPassword({ email: "client1@carrypath.test", password: "Passw0rd!" })
  const { data: cliView } = await c1.from("instructors").select("name, verified")
  check((cliView ?? []).length > 0 && (cliView ?? []).every((r) => r.verified === true), "client sees only verified instructors")
  check(!(cliView ?? []).some((r) => r.name === "Lena Ortiz"), "client does NOT see the unverified instructor")

  const { data: cliLocs } = await c1.from("training_locations").select("id")
  check((cliLocs ?? []).length > 0, "client can see a verified instructor's training locations")

  // ── Admin verify flow flips visibility ────────────────────────────────────
  await admin.from("instructors").update({ verified: true, verified_at: new Date().toISOString() }).eq("id", lena!.id)
  const { data: nowVisible } = await c1.from("instructors").select("name").eq("id", lena!.id)
  check((nowVisible ?? []).length === 1, "after admin verifies Lena, the client can see her")
  const { data: nearAfter } = await admin.rpc("instructors_within_radius", {
    p_lat: QUEENS.lat, p_lng: QUEENS.lng, p_radius_mi: 15, p_jurisdiction: "nyc",
  })
  check((nearAfter ?? []).some((r: { name: string }) => r.name === "Lena Ortiz"), "verified Lena now appears in the geo query")
  // restore
  await admin.from("instructors").update({ verified: false, verified_at: null }).eq("id", lena!.id)
  const { data: goneAgain } = await c1.from("instructors").select("name").eq("id", lena!.id)
  check((goneAgain ?? []).length === 0, "un-verifying hides her from clients again")

  // ── Instructor own-row access ─────────────────────────────────────────────
  const fi = createClient(URL, ANON, { auth: { persistSession: false } })
  const signin = await fi.auth.signInWithPassword({ email: "instructor@carrypath.test", password: "Passw0rd!" })
  check(!signin.error, "instructor can sign in")
  const { data: own } = await fi.from("instructors").select("id, bio").eq("id", frank!.id).single()
  check(!!own, "instructor can read their own row")
  const upd = await fi.from("instructors").update({ bio: "Updated bio via own-row RLS." }).eq("id", frank!.id).select("id")
  check((upd.data ?? []).length === 1, "instructor can update their OWN row")
  const cross = await fi.from("instructors").update({ bio: "hacked" }).eq("id", lena!.id).select("id")
  check((cross.data ?? []).length === 0, "instructor CANNOT update another instructor's row (RLS)")

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Phase 3\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
