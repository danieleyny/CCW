import Link from "next/link"
import { ArrowRight, ShieldCheck, Inbox } from "lucide-react"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { QueueSignOff } from "@/components/admin/queue-sign-off"
import { buildQaQueue, sortQueue, QUEUE_TABS, type QueueBucket } from "@/lib/admin/queue"
import { stageMeta, type CaseStageKey } from "@/config/stages"
import { cn } from "@/lib/utils"

export const metadata = { title: "Filing queue" }

/**
 * PART B / Phase 6 — work the queue, not one case at a time. Every pre-filing
 * case bucketed by exactly what's between it and filing, driven by the CP-5
 * gate itself. Sign-off and stage changes stay exactly as they were — this is
 * the map, not a new road.
 */
export default async function QueuePage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  await requireStaff()
  const sp = await searchParams
  const supabase = await createClient()

  const all = await buildQaQueue(supabase)
  const counts = Object.fromEntries(QUEUE_TABS.map((t) => [t.key, all.filter((r) => r.bucket === t.key).length])) as Record<
    QueueBucket,
    number
  >

  // Default to the most valuable non-empty tab.
  const requested = sp.tab as QueueBucket | undefined
  const active: QueueBucket =
    requested && QUEUE_TABS.some((t) => t.key === requested)
      ? requested
      : (QUEUE_TABS.find((t) => counts[t.key] > 0)?.key ?? "ready")

  const rows = sortQueue(all.filter((r) => r.bucket === active))
  const tabMeta = QUEUE_TABS.find((t) => t.key === active)!

  return (
    <div className="space-y-5">
      <PageHeader
        title="Filing queue"
        description="Every active case that isn't a lead, grouped by what's left before it can file. The gate here is the same one that blocks setCaseStage — nothing is bypassed."
      />

      <div className="flex flex-wrap gap-2">
        {QUEUE_TABS.map((t) => (
          <Link
            key={t.key}
            href={`/admin/queue?tab=${t.key}`}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-medium transition-colors",
              active === t.key
                ? "border-brass bg-brass/10 text-brass-bright"
                : "border-hairline text-text-mid hover:text-foreground"
            )}
          >
            {t.label}
            <span className="ml-1.5 tabular-nums opacity-70">{counts[t.key]}</span>
          </Link>
        ))}
      </div>

      <p className="text-sm text-text-mid">{tabMeta.hint}</p>

      {rows.length === 0 ? (
        <p className="flex items-center justify-center gap-2 rounded-lg border border-dashed bg-card p-10 text-center text-sm text-muted-foreground">
          <Inbox className="size-4" /> Nothing in this bucket.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((r) => (
            <li key={r.caseId} className="rounded-lg border bg-card p-3">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    {r.applicant}
                    <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase text-text-mid">
                      {stageMeta(r.stage as CaseStageKey).short}
                    </span>
                    {r.signedOff && (
                      <span className="inline-flex items-center gap-1 text-[10px] uppercase text-ok">
                        <ShieldCheck className="size-3" /> signed
                      </span>
                    )}
                  </div>
                  {r.blockers.length > 0 ? (
                    <ul className="mt-1.5 flex flex-wrap gap-1.5">
                      {r.blockers.map((b, i) => (
                        <li
                          key={i}
                          className="rounded bg-warn/10 px-1.5 py-0.5 text-[11px] text-warn"
                          title={b.kind}
                        >
                          {b.detail}
                        </li>
                      ))}
                    </ul>
                  ) : (
                    <p className="mt-1 text-xs text-text-low">
                      {active === "ready"
                        ? "Every check passes."
                        : active === "filed"
                          ? "With the License Division."
                          : "No blocking items."}
                    </p>
                  )}
                </div>
                <div className="flex shrink-0 items-center gap-2">
                  {active === "ready" && <QueueSignOff caseId={r.caseId} />}
                  <Link
                    href={`/admin/cases/${r.caseId}`}
                    className="inline-flex items-center gap-1 rounded-md border border-hairline px-2.5 py-1.5 text-xs text-text-mid transition-colors hover:text-foreground"
                  >
                    Open <ArrowRight className="size-3.5" />
                  </Link>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
