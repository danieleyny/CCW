import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { requirementApplies, type IntakeAnswers } from "./generate"

type DB = SupabaseClient<Database>

/**
 * V5b Workstream B — data for the ANONYMOUS /checklist. The registry is READ
 * (a SELECT, never a write); the applies/N-A decision runs through the same
 * PURE generator the real engine uses, client-side. No client row, no case, no
 * case_requirements — a stranger sees their real checklist giving us nothing.
 */
export interface RegistryItem {
  reqCode: string
  title: string
  authority: string | null
  sourceUrl: string | null
  severity: string
  blocking: boolean
  triggerCond: string
  jurisdiction: string
}

/** Active registry rows (both NYC + Special Carry), flattened with provenance. */
export async function getPreviewRegistry(db: DB): Promise<RegistryItem[]> {
  const today = new Date().toISOString().slice(0, 10)
  const { data } = await db
    .from("requirements")
    .select("req_code, title, authority, source_url, severity, blocking, trigger_cond, jurisdiction_profiles(key)")
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
  return (data ?? []).map((r) => ({
    reqCode: r.req_code,
    title: r.title,
    authority: r.authority,
    sourceUrl: r.source_url,
    severity: r.severity,
    blocking: r.blocking,
    triggerCond: r.trigger_cond,
    jurisdiction: (r.jurisdiction_profiles as unknown as { key: string } | null)?.key ?? "nyc",
  }))
}

/** Pure + client-safe: the items that apply for this jurisdiction + answers. */
export function applicableFor(
  rows: RegistryItem[],
  jurisdiction: string,
  answers: IntakeAnswers
): RegistryItem[] {
  return rows.filter((r) => r.jurisdiction === jurisdiction && requirementApplies(r.triggerCond, answers))
}

const SEV_ORDER = ["critical", "high", "long_lead", "watch"] as const
export const SEV_LABEL: Record<string, string> = {
  critical: "Must-have to file",
  high: "Required",
  long_lead: "Start early — these take time",
  watch: "Good to know",
}

/** Group applicable items by severity into ordered sections for rendering. */
export function groupBySeverity(items: RegistryItem[]): { severity: string; label: string; items: RegistryItem[] }[] {
  return SEV_ORDER.map((sev) => ({
    severity: sev,
    label: SEV_LABEL[sev],
    items: items.filter((i) => i.severity === sev),
  })).filter((g) => g.items.length > 0)
}
