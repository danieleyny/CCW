import { Suspense } from "react"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { staleTemplateWarnings } from "@/lib/forms/drift"
import { CATEGORIES, categoryKeyFor } from "@/lib/requirements/categories"
import { ruleReviewCounts } from "@/lib/admin/rule-review"
import {
  ruleReviewStatus,
  worstRuleReviewStatus,
} from "@/lib/admin/rule-review-model"
import {
  RuleReviewPermissionNotice,
  RuleReviewSkeleton,
  RuleReviewWorkspace,
  type RecentRuleReview,
  type RuleReviewGroup,
  type RuleReviewVersion,
} from "@/components/admin/rule-review-workspace"
import type { LegalStatus } from "@/lib/legal-status"

export const metadata = { title: { absolute: "Rule review · Staff" } }

type Search = {
  status?: string | string[]
  topic?: string | string[]
  mode?: string | string[]
  rule?: string | string[]
}

interface RawRequirement {
  id: string
  req_code: string
  title: string
  description: string | null
  authority: string | null
  source_url: string | null
  severity: string
  blocking: boolean
  trigger_cond: string
  effective_from: string
  effective_to: string | null
  needs_legal_review: boolean
  verified_by: string | null
  verified_on: string | null
  legal_status: LegalStatus
  legal_status_note: string | null
  legal_citation: string | null
  jurisdiction_profiles: { key: string; label: string } | null
}

function value(input: string | string[] | undefined, fallback: string) {
  return Array.isArray(input) ? input[0] ?? fallback : input ?? fallback
}

function changedFields(current: RawRequirement, previous: RawRequirement | undefined) {
  if (!previous) return null
  const fields: Array<[keyof RawRequirement, string]> = [
    ["title", "title"],
    ["description", "requirement text"],
    ["authority", "authority"],
    ["source_url", "source"],
    ["severity", "severity"],
    ["blocking", "filing impact"],
    ["trigger_cond", "application condition"],
  ]
  const changed = fields.filter(([key]) => current[key] !== previous[key]).map(([, label]) => label)
  if (!changed.length) return "No rule-text fields changed; this version refreshed the effective date."
  return `${changed.join(", ")} changed.`
}

function topicLabel(key: string) {
  return CATEGORIES.find((category) => category.key === key)?.label ?? "Conditional"
}

async function RuleReviewData({ search }: { search: Search }) {
  const supabase = await createClient()
  const now = new Date()
  const today = now.toISOString().slice(0, 10)

  const [{ data, error }, counts, templateWarnings] = await Promise.all([
    supabase
      .from("requirements")
      .select("id, req_code, title, description, authority, source_url, severity, blocking, trigger_cond, effective_from, effective_to, needs_legal_review, verified_by, verified_on, legal_status, legal_status_note, legal_citation, jurisdiction_profiles(key, label)")
      .order("req_code", { ascending: true })
      .order("effective_from", { ascending: true }),
    ruleReviewCounts(supabase, now),
    staleTemplateWarnings(supabase),
  ])
  if (error) throw error

  const all = (data ?? []) as unknown as RawRequirement[]
  const active = all.filter((row) => row.effective_from <= today && (!row.effective_to || row.effective_to >= today))
  const verifierIds = [...new Set(active.map((row) => row.verified_by).filter(Boolean))] as string[]
  const names = new Map<string, string>()
  if (verifierIds.length) {
    const { data: profiles, error: profileError } = await supabase.from("profiles").select("id, full_name").in("id", verifierIds)
    if (profileError) throw profileError
    for (const profile of profiles ?? []) names.set(profile.id, profile.full_name ?? "Admin")
  }

  const versions = new Map<string, RawRequirement[]>()
  for (const row of all) {
    const key = `${row.jurisdiction_profiles?.key ?? "unknown"}:${row.req_code}`
    const list = versions.get(key) ?? []
    list.push(row)
    versions.set(key, list)
  }
  for (const list of versions.values()) list.sort((a, b) => a.effective_from.localeCompare(b.effective_from))

  const grouped = new Map<string, RuleReviewGroup>()
  for (const row of active) {
    const jurisdictionKey = row.jurisdiction_profiles?.key ?? "unknown"
    const history = versions.get(`${jurisdictionKey}:${row.req_code}`) ?? [row]
    const currentIndex = history.findIndex((item) => item.id === row.id)
    const status = ruleReviewStatus(row, now)
    const version: RuleReviewVersion = {
      id: row.id,
      jurisdictionKey,
      jurisdictionLabel: row.jurisdiction_profiles?.label ?? "Unknown jurisdiction",
      status,
      legalStatus: row.legal_status,
      legalStatusNote: row.legal_status_note,
      citation: row.legal_citation,
      sourceUrl: row.source_url,
      authority: row.authority,
      effectiveFrom: row.effective_from,
      version: currentIndex + 1,
      changedSummary: changedFields(row, currentIndex > 0 ? history[currentIndex - 1] : undefined),
      verifiedByName: row.verified_by ? names.get(row.verified_by) ?? "Admin" : null,
      verifiedOn: row.verified_on,
      blocking: row.blocking,
    }
    const topicKey = categoryKeyFor(row.req_code)
    const existing = grouped.get(row.req_code)
    if (existing) existing.versions.push(version)
    else grouped.set(row.req_code, {
      reqCode: row.req_code,
      title: row.title,
      description: row.description,
      severity: row.severity,
      triggerCond: row.trigger_cond,
      topicKey,
      topicLabel: topicLabel(topicKey),
      status,
      mixedStatusTooltip: null,
      versions: [version],
    })
  }

  const groups = [...grouped.values()].map((group) => {
    group.versions.sort((a, b) => a.jurisdictionKey.localeCompare(b.jurisdictionKey))
    group.status = worstRuleReviewStatus(group.versions.map((version) => version.status))
    const distinct = new Set(group.versions.map((version) => version.status))
    if (group.status === "not_enforced") {
      group.mixedStatusTooltip = group.versions
        .map((version) => `${version.jurisdictionLabel}: ${version.legalStatus.replaceAll("_", " ")}${version.legalStatusNote ? ` — ${version.legalStatusNote}` : ""}`)
        .join(" · ")
    } else if (distinct.size > 1) {
      group.mixedStatusTooltip = group.versions
        .map((version) => `${version.jurisdictionLabel}: ${version.status.replaceAll("_", " ")}`)
        .join(" · ")
    }
    return group
  })

  const recentByCode = new Map<string, RecentRuleReview>()
  for (const row of active
    .filter((item) => !item.needs_legal_review && item.verified_on)
    .sort((a, b) => (b.verified_on ?? "").localeCompare(a.verified_on ?? ""))) {
    if (!recentByCode.has(row.req_code)) recentByCode.set(row.req_code, {
      reqCode: row.req_code,
      staffName: row.verified_by ? names.get(row.verified_by) ?? "Admin" : "Admin",
      reviewedOn: row.verified_on!,
    })
  }

  return (
    <RuleReviewWorkspace
      groups={groups}
      counts={counts}
      templateWarnings={templateWarnings}
      recent={[...recentByCode.values()].slice(0, 5)}
      filter={value(search.status, "attention")}
      topic={value(search.topic, "all")}
      mode={value(search.mode, "list")}
      rule={value(search.rule, "")}
    />
  )
}

export default async function RuleReviewPage({ searchParams }: { searchParams: Promise<Search> }) {
  const auth = await requireStaff()
  if (auth.profile.role !== "admin") return <RuleReviewPermissionNotice />
  const search = await searchParams
  return <Suspense fallback={<RuleReviewSkeleton />}><RuleReviewData search={search} /></Suspense>
}
