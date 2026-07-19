import Link from "next/link"
import { ArrowRight, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { stageMeta, type CaseStageKey } from "@/config/stages"
import { getTrainerCases, getTrainerRequirements, progressOf } from "@/lib/trainer/queries"
import { computeTrainerNextStep } from "@/lib/trainer/next-steps"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "My cases" }

/**
 * The trainer's book of business. Reads `trainer_case_scope`, which returns one
 * row per ACTIVE engagement and carries the applicant's name — you can't chase a
 * missing document from someone you can't address. Disclosure items never appear
 * in the counts because they never appear in the feed at all.
 */
export default async function InstructorCasesPage() {
  const supabase = await createClient()
  const cases = await getTrainerCases(supabase)

  const rows = await Promise.all(
    cases.map(async (c) => {
      const reqs = await getTrainerRequirements(supabase, c.caseId)
      return { ...c, progress: progressOf(reqs), next: computeTrainerNextStep(reqs) }
    })
  )
  // Action first: anything waiting on THIS trainer goes to the top, then the
  // least-finished. A book of 20 cases is only useful if it sorts itself.
  rows.sort((a, b) => {
    if (a.next.reviewCount !== b.next.reviewCount) return b.next.reviewCount - a.next.reviewCount
    return a.progress.percent - b.progress.percent
  })
  const totalToReview = rows.reduce((n, r) => n + r.next.reviewCount, 0)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My cases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Applicants you&apos;re working with. You see their paperwork — never their
          disclosures, which Gun License NYC handles.
        </p>
      </div>

      {totalToReview > 0 && (
        <p className="rounded-md border border-brass/30 bg-brass/8 px-3 py-2 text-sm text-brass-bright">
          {totalToReview === 1
            ? "1 item across your cases needs your review."
            : `${totalToReview} items across your cases need your review.`}
        </p>
      )}

      {rows.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No active cases yet. Accept one from your feed.
        </p>
      ) : (
        <ul className="space-y-2">
          {rows.map((c) => (
            <li key={c.caseId}>
              <Link href={`/instructor/cases/${c.caseId}`}>
                <Card className="transition-colors hover:border-hairline-strong">
                  <CardContent className="space-y-2 p-4">
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <div className="flex items-center gap-1.5 text-sm font-medium">
                          <Users className="size-3.5 text-brass" />
                          {c.applicantName}
                        </div>
                        <div className="mt-0.5 text-xs text-text-mid">
                          {stageMeta(c.stage as CaseStageKey).label}
                        </div>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-text-mid">
                        {c.next.reviewCount > 0 && (
                          <span className="rounded-full bg-brass px-2 py-0.5 text-[10px] font-semibold text-brand-foreground">
                            {c.next.reviewCount} to review
                          </span>
                        )}
                        <span className="font-mono tabular-nums">
                          {c.progress.done}/{c.progress.total}
                        </span>
                        <ArrowRight className="size-4 text-text-low" />
                      </div>
                    </div>
                    <div className="h-1.5 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-brass transition-[width]"
                        style={{ width: `${c.progress.percent}%` }}
                      />
                    </div>
                    <p className="text-xs text-text-low">{c.next.headline}</p>
                  </CardContent>
                </Card>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
