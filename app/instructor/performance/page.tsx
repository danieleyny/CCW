import { BarChart3, CheckCircle2, Clock, FolderOpen, MessageSquareWarning } from "lucide-react"
import { requireRole } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { getMyInstructor } from "@/lib/instructor"
import { getTrainerPerformance } from "@/lib/trainer/performance"
import { Card, CardContent } from "@/components/ui/card"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

export const metadata = { title: "Performance" }

/**
 * PART B / Phase 8 — the trainer's own numbers. Real throughput only; no
 * outcome or approval-rate claims. What a trainer can honestly see about their
 * own book of work.
 */
export default async function TrainerPerformancePage() {
  await requireRole(["instructor"])
  const supabase = await createClient()
  const [me, perf] = await Promise.all([getMyInstructor(), getTrainerPerformance(supabase)])

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Instructor</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your performance</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Your own throughput across the applicants you&apos;re working with. These are facts about
          your work — not predictions about anyone&apos;s application.
        </p>
      </div>

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        <Stat icon={FolderOpen} label="Active cases" value={String(perf.activeCases)} />
        <Stat
          icon={CheckCircle2}
          label="Reviewable work done"
          value={perf.completion.total ? `${perf.completion.percent}%` : "—"}
          sub={perf.completion.total ? `${perf.completion.done} of ${perf.completion.total}` : undefined}
        />
        <Stat
          icon={Clock}
          label="Median time to approve"
          value={perf.medianHoursToApprove == null ? "—" : formatHours(perf.medianHoursToApprove)}
        />
        <Stat icon={BarChart3} label="Items reviewed" value={String(perf.itemsReviewed)} />
        <Stat icon={CheckCircle2} label="Approved" value={String(perf.approved)} />
        <Stat icon={MessageSquareWarning} label="Sent back for a fix" value={String(perf.changesRequested)} />
      </div>

      {perf.awaitingReview > 0 && (
        <div className="rounded-md border border-brass/30 bg-brass/8 px-4 py-3 text-sm text-brass-bright">
          {perf.awaitingReview} item{perf.awaitingReview === 1 ? "" : "s"} across your cases are waiting
          on your review right now.
        </div>
      )}

      {me?.rating_count ? (
        <p className="text-xs text-text-low">
          Your client rating is {me.rating_avg ?? "—"} across {me.rating_count} review
          {me.rating_count === 1 ? "" : "s"}.
        </p>
      ) : null}

      <p className="text-xs text-text-low">
        &ldquo;Reviewed&rdquo; means you checked a document for completeness and correctness. Whether
        an application succeeds is the NYPD&apos;s decision, and no metric here predicts it.
      </p>
    </div>
  )
}

function formatHours(h: number): string {
  if (h < 1) return `${Math.round(h * 60)} min`
  if (h < 48) return `${h < 10 ? h.toFixed(1) : Math.round(h)} hr`
  return `${Math.round(h / 24)} days`
}

function Stat({
  icon: Icon,
  label,
  value,
  sub,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  value: string
  sub?: string
}) {
  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-center gap-1.5 text-xs text-text-mid">
          <Icon className="size-3.5 text-brass" /> {label}
        </div>
        <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{value}</div>
        {sub && <div className="text-[11px] text-text-low">{sub}</div>}
      </CardContent>
    </Card>
  )
}
