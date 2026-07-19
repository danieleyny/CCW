import Link from "next/link"
import { ArrowRight, Users } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { stageMeta, type CaseStageKey } from "@/config/stages"
import { getTrainerCases, getTrainerRequirements, progressOf } from "@/lib/trainer/queries"
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
      return { ...c, progress: progressOf(reqs) }
    })
  )
  // Least-finished first: the ones needing work should be at the top.
  rows.sort((a, b) => a.progress.percent - b.progress.percent)

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My cases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Applicants you&apos;re working with. You see their paperwork — never their
          disclosures, which Gun License NYC handles.
        </p>
      </div>

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
