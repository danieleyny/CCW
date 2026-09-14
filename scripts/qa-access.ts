/**
 * QA access helper — sets a KNOWN password on a seeded test account and mints a fresh
 * magic link for it, so a tester can get into either side of a clone set without
 * re-running the whole seed (which would rebuild the case and lose any test state).
 *
 * Test accounts only. Refuses any address that isn't one of the seeded aliases.
 *
 *   QA_SUFFIX=-qa1 ENV_FILE=.env.prod pnpm tsx scripts/qa-access.ts
 */
import { config as loadEnv } from "dotenv"
loadEnv({ path: process.env.ENV_FILE || ".env.local" })

import { createClient } from "@supabase/supabase-js"

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL
const KEY = process.env.SUPABASE_SERVICE_ROLE_KEY
if (!URL || !KEY) throw new Error("Missing NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY")
const db = createClient(URL, KEY, { auth: { persistSession: false } })

const SUFFIX = process.env.QA_SUFFIX ?? ""
const SITE = process.env.NEXT_PUBLIC_SITE_URL || "https://gunlicensenyc.com"
const PASSWORD = process.env.QA_PASSWORD || "QaTest!2026"

const TARGETS = [`se2018+applicant${SUFFIX}@gmail.com`, `se2018+sponsor${SUFFIX}@gmail.com`]

/** Guard rail: never touch anything that isn't a seeded QA alias. */
const isTestAlias = (e: string) => /^se2018\+(applicant|sponsor)[-\w]*@gmail\.com$/i.test(e)

async function main() {
  const out: Record<string, unknown> = {}
  const { data } = await db.auth.admin.listUsers({ page: 1, perPage: 1000 })

  for (const email of TARGETS) {
    if (!isTestAlias(email)) throw new Error(`refusing non-test address: ${email}`)
    const user = data.users.find((u) => (u.email ?? "").toLowerCase() === email.toLowerCase())
    if (!user) { out[email] = "NOT FOUND — run the seed first"; continue }

    await db.auth.admin.updateUserById(user.id, { password: PASSWORD, email_confirm: true })

    // Point at the app's OWN callback with the token_hash, NOT Supabase's action_link.
    // action_link goes through /auth/v1/verify, which hands the session back in a URL
    // FRAGMENT — and nothing in this app reads a fragment, so the session is silently
    // dropped and the user lands on the sign-in form. /auth/callback consumes
    // token_hash + type server-side and sets the cookie properly.
    const { data: link, error } = await db.auth.admin.generateLink({
      type: "magiclink",
      email,
      options: { redirectTo: `${SITE}/auth/callback` },
    })
    const hash = link?.properties?.hashed_token
    out[email] = {
      password: PASSWORD,
      signInLink: error || !hash
        ? `ERROR: ${error?.message ?? "no hashed_token"}`
        : `${SITE}/auth/callback?token_hash=${hash}&type=magiclink&next=/portal`,
    }
  }

  console.log(`\nSign in at ${SITE}/auth/login\n`)
  console.log(JSON.stringify(out, null, 2))
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
