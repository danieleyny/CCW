/**
 * One-off repair: requirements marked SATISFIED by an unsigned generated draft.
 *
 * Before signing existed, generating a document satisfied its requirement
 * immediately. Those rows are still sitting "complete" on documents nobody ever
 * signed — which means an unsigned draft could ride through the CP-5 pre-filing
 * gate and be filed as if the applicant had executed it.
 *
 * This reverts them to `pending` with a note saying why. It DELETES NOTHING: the
 * document row and its bytes stay exactly where they are, and the applicant just
 * has to do the signing step that should have been asked of them.
 *
 * Only touches a row when ALL of these hold:
 *   - the requirement is signable (lib/requirements/actions — so never COH-01 /
 *     REF-01 / REF-02, which are signed by someone else entirely)
 *   - it is currently `satisfied`
 *   - its bound document is `generated` with `signed_at IS NULL`
 *
 * A requirement satisfied by an UPLOAD is left alone — a staff review approved
 * that, and this has no business second-guessing it.
 *
 * Usage:
 *   pnpm exec tsx scripts/repair-unsigned-satisfied.ts             # local
 *   ENV_FILE=/path/to/prod-env pnpm exec tsx scripts/repair-unsigned-satisfied.ts
 *   DRY=1 ...                                                      # report only
 */
import { createClient } from "@supabase/supabase-js"
import { readFileSync } from "node:fs"
import { actionFor, isSignable } from "../lib/requirements/actions"

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
const DRY = process.env.DRY === "1"

const NOTE =
  "Reverted to pending: this was marked complete by an unsigned draft, before signing was required. Sign the document to complete it."

async function main() {
  console.log(`Scanning ${envFile}${DRY ? " (DRY RUN)" : ""}`)

  const { data: rows, error } = await admin
    .from("case_requirements")
    .select("id, case_id, req_code, status, document_id")
    .eq("status", "satisfied")
    .not("document_id", "is", null)
  if (error) throw error

  const candidates = (rows ?? []).filter((r) => isSignable(actionFor(r.req_code)))
  console.log(`${rows?.length ?? 0} satisfied requirements with a document; ${candidates.length} are signable`)

  let reverted = 0
  const affectedCases = new Set<string>()

  for (const r of candidates) {
    const { data: doc } = await admin
      .from("documents")
      .select("id, generated, signed_at, file_name")
      .eq("id", r.document_id!)
      .maybeSingle()
    if (!doc?.generated || doc.signed_at) continue // upload, or properly signed

    console.log(`  ${r.req_code} (case ${r.case_id.slice(0, 8)}…) ← unsigned ${doc.file_name}`)
    reverted++
    affectedCases.add(r.case_id)

    if (!DRY) {
      const { error: upErr } = await admin
        .from("case_requirements")
        .update({ status: "pending", notes: NOTE })
        .eq("id", r.id)
      if (upErr) throw upErr
    }
  }

  console.log(
    reverted === 0
      ? "\nNothing to repair. ✓"
      : `\n${DRY ? "Would revert" : "Reverted"} ${reverted} requirement(s) across ${affectedCases.size} case(s) — satisfied → pending.`
  )
  if (reverted > 0 && !DRY) {
    console.log("Those cases can no longer pass the CP-5 gate until the documents are signed.")
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
