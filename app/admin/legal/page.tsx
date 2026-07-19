import { ShieldAlert, ShieldCheck, ExternalLink, Ban, CalendarClock } from "lucide-react"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { Button } from "@/components/ui/button"
import {
  LegalStatusBadge,
  LegalStatusEditor,
  type LegalStatusKey,
} from "@/components/admin/legal-status-editor"
import { LEGAL_REVIEW_STALE_DAYS } from "@/lib/legal-status"
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
      "id, req_code, title, authority, source_url, severity, blocking, trigger_cond, effective_from, needs_legal_review, verified_by, verified_on, legal_status, legal_status_note, legal_citation, jurisdiction_profiles(key, label)"
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

  // A verification isn't permanent — NYC is litigation-driven and a rule
  // confirmed a year ago may have been enjoined since.
  const cutoffDate = new Date()
  cutoffDate.setUTCDate(cutoffDate.getUTCDate() - LEGAL_REVIEW_STALE_DAYS)
  const staleCutoff = cutoffDate.toISOString().slice(0, 10)
  const stale = verified.filter((r) => !r.verified_on || r.verified_on < staleCutoff)
  const unenforced = all.filter((r) => r.legal_status !== "enforced")

  return (
    <div className="space-y-6">
      <PageHeader
        title="Legal verification"
        description="Every active registry rule, its authority, and whether a NY attorney has confirmed it. Nothing here is presumed correct until verified — NYC is a litigation-driven jurisdiction and rules shift."
      />

      {stale.length > 0 && (
        <div className="rounded-lg border border-warn/30 bg-warn/8 p-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-warn">
            <CalendarClock className="size-4" />
            {stale.length} verified rule{stale.length === 1 ? "" : "s"} not reviewed in{" "}
            {LEGAL_REVIEW_STALE_DAYS}+ days
          </div>
          <p className="mt-1 text-xs text-text-mid">
            {stale
              .slice(0, 8)
              .map((r) => r.req_code)
              .join(", ")}
            {stale.length > 8 && `, and ${stale.length - 8} more`}. A confirmation from last quarter
            can be overtaken by litigation — re-check and re-save the status to renew the date.
          </p>
        </div>
      )}

      {unenforced.length > 0 && (
        <div className="rounded-lg border border-signal/30 bg-signal/5 p-3 text-sm">
          <div className="flex items-center gap-2 font-semibold text-signal">
            <Ban className="size-4" /> Not currently enforceable ({unenforced.length})
          </div>
          <ul className="mt-1 space-y-0.5 text-xs text-text-mid">
            {/* Jurisdiction included: the same req_code exists once per
                profile, and without it two rows look like a duplication bug. */}
            {unenforced.map((r) => (
              <li key={r.id}>
                <span className="font-mono">{r.req_code}</span>{" "}
                <span className="text-text-low">({r.jurisdiction})</span> —{" "}
                {r.legal_citation ?? "no citation recorded"}
              </li>
            ))}
          </ul>
          <p className="mt-1 text-xs text-text-low">
            These can never block filing — the database enforces it, not just the UI.
          </p>
        </div>
      )}

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
    legal_status: string
    legal_status_note: string | null
    legal_citation: string | null
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
                {!r.blocking && r.legal_status === "enforced" && (
                  <span className="rounded bg-signal-dim px-1.5 py-0.5 text-[10px] uppercase tracking-wide text-signal">
                    advisory
                  </span>
                )}
                <LegalStatusBadge status={r.legal_status as LegalStatusKey} />
              </div>
              {r.legal_citation && (
                <p className="mt-1 text-xs italic text-text-mid">{r.legal_citation}</p>
              )}
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
          <LegalStatusEditor
            id={r.id}
            reqCode={r.req_code}
            status={r.legal_status as LegalStatusKey}
            note={r.legal_status_note}
            citation={r.legal_citation}
          />
        </li>
      ))}
    </ul>
  )
}
