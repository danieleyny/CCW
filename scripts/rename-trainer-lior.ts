/**
 * One-off, reversible data edit: give the live trainer "Lior" the surname
 * "Carlo" → instructors.name = "Lior Carlo", keeping the linked profile and
 * auth-user metadata consistent so every surface (instructor portal header,
 * marketplace instructor card, request feed) renders the same name.
 *
 * Safety:
 *  - Read-only by default: prints every `name ilike 'Lior%'` match and exits.
 *  - Refuses to touch anything unless there is EXACTLY ONE match.
 *  - Mutates only with APPLY=1, logging old → new for every row touched.
 *
 * Usage:
 *   ENV_FILE=/path/to/prod-env pnpm exec tsx scripts/rename-trainer-lior.ts          # dry run
 *   ENV_FILE=/path/to/prod-env APPLY=1 pnpm exec tsx scripts/rename-trainer-lior.ts  # apply
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"

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

const NEW_NAME = "Lior Carlo"
const apply = process.env.APPLY === "1"

async function main() {
  const { data: matches, error } = await admin
    .from("instructors")
    .select("id, name, email, profile_id")
    .ilike("name", "Lior%")
  if (error) throw error

  console.log(`Matches for name ilike 'Lior%': ${matches?.length ?? 0}`)
  for (const m of matches ?? []) {
    console.log(`  instructor ${m.id} | name="${m.name}" | email=${m.email ?? "—"} | profile_id=${m.profile_id ?? "—"}`)
  }

  if ((matches ?? []).length !== 1) {
    console.log("Not exactly one match — STOPPING. Disambiguate by hand before rerunning.")
    process.exit(1)
  }

  const target = matches![0]
  console.log(`\nPlan: instructors.name "${target.name}" → "${NEW_NAME}"`)

  // The linked identity, if any, should carry the same display name.
  let profileName: string | null = null
  let authName: string | null = null
  if (target.profile_id) {
    const { data: prof } = await admin.from("profiles").select("full_name").eq("id", target.profile_id).maybeSingle()
    profileName = prof?.full_name ?? null
    const { data: user } = await admin.auth.admin.getUserById(target.profile_id)
    authName = (user?.user?.user_metadata?.full_name as string | undefined) ?? null
    console.log(`Linked profile.full_name="${profileName}" | auth user_metadata.full_name="${authName}"`)
  }

  if (!apply) {
    console.log("\nDRY RUN — nothing changed. Re-run with APPLY=1 to write.")
    return
  }

  const { error: upErr } = await admin.from("instructors").update({ name: NEW_NAME }).eq("id", target.id)
  if (upErr) throw upErr
  console.log(`✔ instructors.name: "${target.name}" → "${NEW_NAME}"`)

  if (target.profile_id) {
    // Only rewrite identity fields that actually carried the old display name —
    // a profile someone deliberately named differently is not ours to change.
    if (profileName && profileName.startsWith("Lior")) {
      const { error: pErr } = await admin.from("profiles").update({ full_name: NEW_NAME }).eq("id", target.profile_id)
      if (pErr) throw pErr
      console.log(`✔ profiles.full_name: "${profileName}" → "${NEW_NAME}"`)
    } else {
      console.log(`· profiles.full_name left as "${profileName}" (doesn't carry the old name)`)
    }
    if (authName && authName.startsWith("Lior")) {
      const { error: aErr } = await admin.auth.admin.updateUserById(target.profile_id, {
        user_metadata: { full_name: NEW_NAME },
      })
      if (aErr) throw aErr
      console.log(`✔ auth user_metadata.full_name: "${authName}" → "${NEW_NAME}"`)
    } else {
      console.log(`· auth user_metadata.full_name left as "${authName}" (doesn't carry the old name)`)
    }
  }

  console.log("\nDone. Reverse by rerunning with the names swapped if ever needed.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
