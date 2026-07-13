/**
 * V3-P2.1 backfill — every case gets case_requirements rows so the admin can
 * retire the V1 checklist_items path. Cases with completed intake generate from
 * their real answers; everything else gets the baseline "always" set (staff can
 * regenerate after intake). Idempotent — run any number of times, local or
 * hosted:  pnpm tsx scripts/backfill-requirements.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import type { Database } from "../lib/supabase/types"
import { materializeCaseRequirements } from "../lib/requirements/materialize"
import { toGeneratorAnswers, type WizardAnswers } from "../lib/intake/answers"

loadEnv({ path: ".env.local" })
const admin = createClient<Database>(
  process.env.NEXT_PUBLIC_SUPABASE_URL!,
  process.env.SUPABASE_SERVICE_ROLE_KEY!,
  { auth: { persistSession: false } }
)

async function main() {
  const { data: cases } = await admin
    .from("cases")
    .select("id, is_renewal, clients(track)")
  const { data: existing } = await admin.from("case_requirements").select("case_id")
  const covered = new Set((existing ?? []).map((r) => r.case_id))

  const { data: sessions } = await admin.from("intake_sessions").select("case_id, answers")
  const answersByCase = new Map((sessions ?? []).map((s) => [s.case_id, s.answers as unknown as WizardAnswers]))

  let done = 0
  for (const c of cases ?? []) {
    if (covered.has(c.id)) continue
    const track = (c.clients as unknown as { track: string } | null)?.track
    const jurisdiction = track === "non_resident" ? "special_carry" : "nyc"
    const answers = answersByCase.get(c.id) ?? {}
    const result = await materializeCaseRequirements(
      admin,
      c.id,
      jurisdiction,
      toGeneratorAnswers(answers, { isRenewal: !!c.is_renewal })
    )
    done++
    console.log(`backfilled ${c.id} (${jurisdiction}${c.is_renewal ? ", renewal" : ""}): ${result.applicable}/${result.total} applicable`)
  }
  console.log(`\nBACKFILL DONE — ${done} case(s) materialized, ${covered.size} already covered.`)
}

main().then(() => process.exit(0)).catch((e) => { console.error(e); process.exit(1) })
