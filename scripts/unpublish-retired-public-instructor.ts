import { createClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

const TARGET_INSTRUCTOR_ID = "6aa4d3bb-cff6-4341-9d4f-c3357d802916"

function modeFrom(argv: string[]): "dry-run" | "apply" | "rollback" {
  const apply = argv.includes("--apply")
  const rollback = argv.includes("--rollback")
  if (apply && rollback) throw new Error("Choose either --apply or --rollback, not both.")
  if (apply) return "apply"
  if (rollback) return "rollback"
  return "dry-run"
}

async function main() {
  const mode = modeFrom(process.argv.slice(2))
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
  if (!url || !serviceRoleKey) {
    throw new Error("NEXT_PUBLIC_SUPABASE_URL and SUPABASE_SERVICE_ROLE_KEY are required.")
  }

  // Operational cleanup needs the service role because public-profile flags are
  // staff-controlled. The exact immutable ID keeps the mutation narrowly scoped.
  const supabase = createClient<Database>(url, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  const { data: current, error: readError } = await supabase
    .from("instructors")
    .select("id, public_profile")
    .eq("id", TARGET_INSTRUCTOR_ID)
    .maybeSingle()

  if (readError) throw readError
  if (!current) throw new Error("Target instructor was not found; no changes made.")

  const desired = mode === "rollback"
  const wouldChange = current.public_profile !== desired ? 1 : 0
  console.log(JSON.stringify({ mode, matched: 1, wouldChange, currentPublicProfile: current.public_profile }))

  if (mode === "dry-run" || wouldChange === 0) return

  const { data: updated, error: updateError } = await supabase
    .from("instructors")
    .update({ public_profile: desired })
    .eq("id", TARGET_INSTRUCTOR_ID)
    .eq("public_profile", !desired)
    .select("id, public_profile")

  if (updateError) throw updateError
  if ((updated ?? []).length !== 1) {
    throw new Error("Expected exactly one row to change; operation stopped.")
  }

  console.log(JSON.stringify({ mode, changed: 1, publicProfile: updated![0].public_profile }))
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : error)
  process.exitCode = 1
})
