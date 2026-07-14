import "server-only"
import { unstable_cache } from "next/cache"
import { createAdminClient } from "@/lib/supabase/admin"
import { STAGE_KEYS, stageIndex, type CaseStageKey } from "@/config/stages"

/**
 * V5b Workstream C — trust stats: small, true, dated, footnoted, or absent.
 * Cached 1h. Each figure is SUPPRESSED below n<25 (a stat from four cases is a
 * lie with a decimal point). NEVER an approval rate — filedIncomplete measures
 * US, not the NYPD.
 */
export interface TrustStat {
  value: number
  suffix?: string
  label: string
  footnote: string
}

const MIN = 25

const assembledStages = STAGE_KEYS.filter(
  (s) => stageIndex(s) >= stageIndex("application_assembled")
) as CaseStageKey[]

async function compute(): Promise<TrustStat[]> {
  const admin = createAdminClient()
  const asOf = new Date().toISOString().slice(0, 10)
  const out: TrustStat[] = []

  const [assembledRes, verifiedRes, filedRows, incompleteRes] = await Promise.all([
    admin.from("cases").select("id", { count: "exact", head: true }).in("stage", assembledStages),
    admin.from("documents").select("id", { count: "exact", head: true }).eq("status", "approved"),
    admin.from("cases").select("opened_at, stage_entered_at").eq("stage", "filed"),
    // The honest inverse of an approval rate. Logged when we record a returned
    // packet (activity action 'case.returned_incomplete'); 0 until one occurs.
    admin.from("activity_log").select("id", { count: "exact", head: true }).eq("action", "case.returned_incomplete"),
  ])

  const assembled = assembledRes.count ?? 0
  if (assembled >= MIN) {
    out.push({
      value: assembled,
      label: "Packets assembled",
      footnote: `CARRY cases that reached filing-ready assembly — all-time, from our own case records, as of ${asOf}.`,
    })
    // filedIncomplete rides the same denominator: only meaningful with real volume.
    out.push({
      value: incompleteRes.count ?? 0,
      label: "Returned incomplete",
      footnote: `Packets the License Division returned to us as incomplete, out of ${assembled} assembled, as of ${asOf}. This measures our work, not the NYPD's decision.`,
    })
  }

  const verified = verifiedRes.count ?? 0
  if (verified >= MIN) {
    out.push({
      value: verified,
      label: "Documents verified",
      footnote: `Applicant documents reviewed and approved by our staff — all-time, from our own records, as of ${asOf}.`,
    })
  }

  const days = (filedRows.data ?? [])
    .map((r) => (new Date(r.stage_entered_at).getTime() - new Date(r.opened_at).getTime()) / 86_400_000)
    .filter((d) => d >= 0)
    .sort((a, b) => a - b)
  if (days.length >= MIN) {
    const mid = Math.floor(days.length / 2)
    const median = days.length % 2 ? days[mid] : (days[mid - 1] + days[mid]) / 2
    out.push({
      value: Math.round(median),
      suffix: " days",
      label: "Median intake to filing",
      footnote: `Median (not mean) across cases at the filed stage, opened-to-filed, from our own records, as of ${asOf}.`,
    })
  }

  return out
}

/** Cached 1h. Returns [] or a partial list; render the band only when ≥2 clear. */
export const getTrustStats = unstable_cache(compute, ["trust-stats-v1"], { revalidate: 3600 })
