/**
 * V5b Workstream E.3 — subscribe endpoint + subscribers RLS.
 * Asserts positively AND negatively (house standard). Run after seed, with the
 * dev server up to include the HTTP POST test:  pnpm tsx scripts/verify-subscribe.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

loadEnv({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
async function signIn(email: string): Promise<SupabaseClient> {
  const c = createClient(URL, ANON, { auth: { persistSession: false } })
  await c.auth.signInWithPassword({ email, password: "Passw0rd!" })
  return c
}

async function main() {
  console.log("\n— verify-subscribe —\n")
  await admin.from("subscribers").upsert(
    { email: "vsub@test.local", offer: "law-watch", source: "verify" },
    { onConflict: "email,offer" }
  )

  // The HTTP endpoint (skip cleanly if the dev server isn't running).
  try {
    const res = await fetch("http://localhost:3000/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "vpost@test.local", offer: "checklist", from: "verify" }),
    })
    const j = await res.json()
    check(j.ok === true, "anon POST /api/subscribe succeeds")
    const { count } = await admin.from("subscribers").select("id", { count: "exact", head: true }).eq("email", "vpost@test.local")
    check((count ?? 0) > 0, "the POST wrote a subscriber row (service-role only)")

    // Honeypot writes nothing.
    await fetch("http://localhost:3000/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ email: "vhoney@test.local", offer: "checklist", from: "verify", company: "Acme" }),
    })
    const { count: honey } = await admin.from("subscribers").select("id", { count: "exact", head: true }).eq("email", "vhoney@test.local")
    check((honey ?? 0) === 0, "honeypot POST writes zero rows")

    // Cross-origin from an unlisted origin is refused.
    const bad = await fetch("http://localhost:3000/api/subscribe", {
      method: "POST",
      headers: { "Content-Type": "application/json", Origin: "https://evil.example" },
      body: JSON.stringify({ email: "vx@test.local", offer: "checklist", from: "verify" }),
    })
    check(bad.status === 403, "cross-origin POST from an unlisted origin is refused (403)")
  } catch {
    console.log("… dev server unreachable — skipping HTTP tests (run `pnpm dev` to include them)")
  }

  // RLS: staff/admin read; nobody else.
  const anon = createClient(URL, ANON, { auth: { persistSession: false } })
  const anonSel = await anon.from("subscribers").select("id")
  check((anonSel.data?.length ?? 0) === 0, "anon cannot select subscribers")

  const client = await signIn("client1@carrypath.test")
  const clientSel = await client.from("subscribers").select("id")
  check((clientSel.data?.length ?? 0) === 0, "a client cannot select subscribers")

  const staff = await signIn("staff@carrypath.test")
  const staffSel = await staff.from("subscribers").select("id")
  check((staffSel.data?.length ?? 0) > 0, "staff CAN select subscribers")

  await admin.from("subscribers").delete().in("email", ["vsub@test.local", "vpost@test.local", "vhoney@test.local"])

  console.log(failures === 0 ? "\nverify-subscribe PASS" : `\n${failures} check(s) FAILED`)
  process.exit(failures ? 1 : 0)
}
main()
