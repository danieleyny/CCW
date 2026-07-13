import { ShieldAlert, ShieldCheck, ExternalLink, Ban } from "lucide-react"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import { markRequirementVerified, flagRequirementForReview } from "./actions"

export const metadata = { title: "Legal verification" }

/**
 * V3-P1.3 — the standing legal-verification register. Every ACTIVE registry rule
 * with its authority + source, and whether a NY attorney has signed off on it.
 * Persistent + audited (replaces the old useState verify-live checklist).
 */
export default async function LegalPage() {
  await requireStaff()
  const supabase = await createClient()

  const today = new Date().toISOString().slice(0, 10)
  const { data: rows } = await supabase
    .from("requirements")
    .select(
      "id, req_code, title, authority, source_url, severity, blocking, trigger_cond, effective_from, needs_legal_review, verified_by, verified_on, jurisdiction_profiles(key, label)"
    )
    .lte("effective_from", today)
    .or(`effective_to.is.null,effective_to.gte.${today}`)
    .order("req_code", { ascending: true })

  const all = (rows ?? []).map((r) => ({
    ...r,
    jurisdiction: (r.jurisdiction_profiles as unknown as { key: string; label: string } | null)?.label ?? "—",
  }))

  // Resolve verifier names in one pass.
  const verifierIds = [...new Set(all.map((r) => r.verified_by).filter(Boolean))] as string[]
  const names = new Map<string, string>()
  if (verifierIds.length) {
    const { data: profs } = await supabase.from("profiles").select("id, full_name").in("id", verifierIds)
    for (const p of profs ?? []) names.set(p.id, p.full_name ?? "—")
  }

  const pending = all.filter((r) => r.needs_legal_review)
  const verified = all.filter((r) => !r.needs_legal_review)

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal verification"
        description="Every active registry rule, its authority, and whether a NY attorney has confirmed it. Nothing here is presumed correct until verified — NYC is a litigation-driven jurisdiction and rules shift."
      />

      <section>
        <h2 className="engraved mb-2 flex items-center gap-2 text-warn">
          <ShieldAlert className="size-4" /> Awaiting attorney verification ({pending.length})
        </h2>
        <RuleList rows={pending} names={names} pending />
      </section>

      <section>
        <h2 className="engraved mb-2 flex items-center gap-2 text-ok">
          <ShieldCheck className="size-4" /> Verified ({verified.length})
        </h2>
        <RuleList rows={verified} names={names} pending={false} />
      </section>

      <p className="text-xs text-text-low">
        Verifying is admin-only and recorded in the activity log (who + when). If litigation or an
        NYPD change touches a rule, flag it back for review — future corrections should be new dated
        versions in the registry, not edits to history.
      </p>
    </div>
  )
}

function RuleList({
  rows,
  names,
  pending,
}: {
  rows: Array<{
    id: string
    req_code: string
    title: string
    authority: string | null
    source_url: string | null
    severity: string
    blocking: boolean
    trigger_cond: string
    effective_from: string
    verified_by: string | null
    verified_on: string | null
    jurisdiction: string
  }>
  names: Map<string, string>
  pending: boolean
}) {
  if (rows.length === 0) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-6 text-center text-sm text-muted-foreground">
        {pending ? "Nothing awaiting review." : "Nothing verified yet."}
      </p>
    )
  }
  return (
    <ul className="space-y-2">
      {rows.map((r) => (
        <li key={r.id} className="rounded-lg border bg-card p-3 text-sm">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <div className="min-w-0">
              <div className="flex flex-wrap items-center gap-2">
                <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px]">{r.req_code}</span>
                <span className="font-medium">{r.title}</span>
                {!r.blocking && (
                  <span className="rounded bg-signal-dim px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-signal">
                    advisory
                  </span>
                )}
              </div>
              <p className="mt-1 text-xs text-text-low">
                {r.jurisdiction} · {r.authority ?? "no authority cited"} · trigger <code>{r.trigger_cond}</code> · since{" "}
                {r.effective_from}
                {!pending && r.verified_on && (
                  <>
                    {" "}
                    · verified {r.verified_on} by {names.get(r.verified_by ?? "") ?? "—"}
                  </>
                )}
              </p>
            </div>
            <div className="flex shrink-0 items-center gap-2">
              {r.source_url && (
                <a
                  href={r.source_url}
                  target="_blank"
                  rel="noreferrer"
                  className="inline-flex items-center gap-1 text-xs text-signal underline"
                >
                  source <ExternalLink className="size-3" />
                </a>
              )}
              {pending ? (
                <form action={markRequirementVerified}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" size="sm" variant="outline">
                    <ShieldCheck className="size-3.5" /> Mark verified
                  </Button>
                </form>
              ) : (
                <form action={flagRequirementForReview}>
                  <input type="hidden" name="id" value={r.id} />
                  <Button type="submit" size="sm" variant="ghost" className="text-text-low">
                    <Ban className="size-3.5" /> Flag for review
                  </Button>
                </form>
              )}
            </div>
          </div>
        </li>
      ))}
    </ul>
  )
}
