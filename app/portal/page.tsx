import Link from "next/link"
import { ArrowRight, ClipboardList, CalendarDays, CreditCard, CheckCircle2 } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase, getTrainingState } from "@/lib/portal"
import {
  stageMeta,
  nextStage,
  type CaseStageKey,
} from "@/config/stages"
import { money, formatDate } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { ReticleProgress } from "@/components/ui/reticle-progress"
import { CaseTimeline } from "@/components/portal/case-timeline"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { WelcomeCard } from "@/components/portal/welcome-card"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { computeNextStep } from "@/lib/portal/next-step"
import { getMessages } from "@/lib/i18n"

export const metadata = { title: "Your application" }

export default async function PortalHome() {
  const myCase = await getMyCase()

  if (!myCase) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-lg font-semibold">Welcome.</h2>
          <p className="mt-2 text-sm text-text-mid">
            Your case isn&apos;t set up yet. Your Gun License NYC concierge will reach out shortly to get you
            started.
          </p>
        </CardContent>
      </Card>
    )
  }

  const supabase = await createClient()
  const stage = myCase.stage as CaseStageKey
  const next = nextStage(stage)

  const [{ data: reqs }, { data: training }, { data: payments }, { data: intake }] =
    await Promise.all([
      supabase.from("case_requirements").select("status").eq("case_id", myCase.id),
      supabase
        .from("training_sessions")
        .select("class_date")
        .eq("case_id", myCase.id)
        .order("class_date", { ascending: true }),
      supabase.from("payments").select("amount_cents, status, package_key").eq("case_id", myCase.id),
      supabase.from("intake_sessions").select("completed_at").eq("case_id", myCase.id).maybeSingle(),
    ])
  const intakeDone = !!intake?.completed_at
  const trainingState = await getTrainingState(myCase.id)

  // Phase 10 — the single most important outstanding action, computed from the
  // same requirement view the checklist and documents pages read.
  const view = await loadRequirementView(supabase, myCase)
  const nextStep = computeNextStep({ items: view.items, intakeDone, stage })
  const t = await getMessages()

  // V3-P3 — which lifecycle cards to show.
  const hasPackage = (payments ?? []).some((p) => p.package_key)
  const isLicensed = stage === "licensed"
  const isDenied = myCase.status === "denied"

  // V3-P2.1 — to-dos come from the requirements engine (the one checklist).
  const outstanding = (reqs ?? []).filter((r) => r.status === "pending").length
  const nextTraining = (training ?? []).find((t) => t.class_date)
  const paidCents = (payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount_cents, 0)

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Your Application</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {myCase.client.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-text-mid">{t.portal.tagline}</p>
      </div>

      {/* Phase 10 — WHAT TO DO NEXT, first thing, above the fold on a phone.
          A returning applicant shouldn't have to hunt three screens down for
          their own to-do list. */}
      {!isLicensed && !isDenied && (
        <Card className={nextStep.waiting ? "" : "brass-edge"}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <SectionEyebrow>{nextStep.waiting ? "Where you are" : "Your next step"}</SectionEyebrow>
              <span className="font-mono text-[11px] tabular-nums text-text-low">
                {nextStep.done} of {nextStep.total} done
              </span>
            </div>

            <h2 className="mt-2 text-lg font-semibold tracking-tight">{nextStep.title}</h2>
            {nextStep.detail && <p className="mt-1 text-sm text-text-mid">{nextStep.detail}</p>}

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-brass transition-[width]"
                style={{ width: `${nextStep.total ? (nextStep.done / nextStep.total) * 100 : 0}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={nextStep.href}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brass px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brass-bright"
              >
                {nextStep.cta} <ArrowRight className="size-4" />
              </Link>
              <Link href="/portal/checklist" className="text-sm text-signal underline">
                View everything left to do
              </Link>
            </div>
          </CardContent>
        </Card>
      )}

      {/* V3-P4.4 — first-visit orientation (dismissible, early stages only) */}
      {!isLicensed && !isDenied && ["lead", "eligibility_screened", "signed_up_paid"].includes(stage) && (
        <WelcomeCard
          firstName={myCase.client.full_name.split(" ")[0]}
          trainingHandled={trainingState.status === "engaged" || trainingState.status === "booked"}
          intakeDone={intakeDone}
        />
      )}

      {/* V3-P3.3 — denial: the appeal window is the only thing that matters */}
      {isDenied && (
        <Link
          href="/portal/appeal"
          className="flex items-center justify-between rounded-md border border-danger/40 bg-danger/10 px-4 py-3.5 text-danger transition-colors hover:border-danger/60"
        >
          <span className="text-sm font-medium">
            Your appeal window is open — 90 days, strict rules. Start here.
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {/* V3-P3.2 — licensed: the 3-year lifecycle hub */}
      {isLicensed && (
        <Link
          href="/portal/license"
          className="flex items-center justify-between rounded-md border border-ok/30 bg-ok/8 px-4 py-3.5 text-ok transition-colors hover:border-ok/50"
        >
          <span className="text-sm font-medium">
            Your license — purchase authorizations, inspections, reporting duties &amp; renewal
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {/* V3-P3.1 — no package yet: close the enrollment loop */}
      {!hasPackage && !isLicensed && !isDenied && (
        <Link
          href="/portal/enroll"
          className="flex items-center justify-between rounded-md border border-brass/40 bg-brass/10 px-4 py-3.5 text-brass-bright transition-colors hover:border-brass/60"
        >
          <span className="text-sm font-medium">Choose your package — start your engagement</span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {/* Guided intake entry — flips to a completed state once submitted, so
          finishing the wizard visibly registers as progress. */}
      {intakeDone ? (
        <Link
          href="/portal/checklist"
          className="flex items-center justify-between rounded-md border border-ok/30 bg-ok/8 px-4 py-3.5 text-ok transition-colors hover:border-ok/50"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <CheckCircle2 className="size-4" />
            Intake complete — view your personalized checklist
          </span>
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <Link
          href="/portal/intake"
          className="flex items-center justify-between rounded-md border border-signal/30 bg-signal-dim px-4 py-3.5 text-signal transition-colors hover:border-signal/50"
        >
          <span className="text-sm font-medium">
            Application intake — build your personalized document set
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {/* Marketplace entry — reflects where the applicant is in getting trained,
          so "find an instructor" disappears once they're engaged/booked. */}
      <Link
        href="/portal/marketplace"
        className={
          trainingState.status === "engaged" || trainingState.status === "booked"
            ? "flex items-center justify-between rounded-md border border-ok/30 bg-ok/8 px-4 py-3.5 text-ok transition-colors hover:border-ok/50"
            : "flex items-center justify-between rounded-md border border-brass/30 bg-brass/8 px-4 py-3.5 text-brass-bright transition-colors hover:border-brass/50"
        }
      >
        <span className="text-sm font-medium">
          {trainingState.status === "booked" && trainingState.bookingAt
            ? `Training booked — ${formatDate(trainingState.bookingAt)}`
            : trainingState.status === "engaged"
              ? `Your instructor: ${trainingState.instructorName} — schedule your session`
              : trainingState.status === "pending"
                ? trainingState.interestedCount > 0
                  ? `${trainingState.interestedCount} instructor${trainingState.interestedCount === 1 ? "" : "s"} interested — choose yours`
                  : "Training request sent — awaiting interested instructors"
                : "Find a verified local instructor"}
        </span>
        <ArrowRight className="size-4" />
      </Link>

      {/* Prepared documents entry */}
      <Link
        href="/portal/forms"
        className="flex items-center justify-between rounded-md border border-hairline bg-surface-2/40 px-4 py-3.5 text-text-mid transition-colors hover:text-foreground"
      >
        <span className="text-sm font-medium">Documents we prepared for you — download &amp; sign</span>
        <ArrowRight className="size-4" />
      </Link>

      {/* Reticle progress — centerpiece */}
      <Card className="brass-edge">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="engraved">Current Stage</div>
              <div className="mt-1 font-display text-xl font-semibold">{stageMeta(stage).label}</div>
            </div>
            <StatusBadge status={myCase.status} />
          </div>
          <ReticleProgress currentStage={stage} />
          <p className="mt-5 rounded-md border border-brass/25 bg-brass/8 p-3 text-sm text-brass-bright">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brass">Next //</span>{" "}
            {next ? stageMeta(next).clientHint : stageMeta(stage).clientHint}
          </p>
        </CardContent>
      </Card>

      {/* Full application timeline — plain language + honest ETAs */}
      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium">
          Your full application timeline
        </summary>
        <div className="border-t border-hairline p-5">
          <CaseTimeline currentStage={stage} />
        </div>
      </details>

      {/* HUD quick cards */}
      <div className="grid grid-cols-3 gap-3">
        <HudCard
          href="/portal/checklist"
          icon={ClipboardList}
          value={String(outstanding)}
          label="To-dos"
        />
        <HudCard
          icon={CalendarDays}
          value={nextTraining?.class_date ? formatDate(nextTraining.class_date) : "—"}
          label="Training"
          small
        />
        <HudCard href="/portal/payments" icon={CreditCard} value={money(paidCents)} label="Paid" small />
      </div>

    </div>
  )
}

function HudCard({
  href,
  icon: Icon,
  value,
  label,
  small,
}: {
  href?: string
  icon: React.ComponentType<{ className?: string }>
  value: string
  label: string
  small?: boolean
}) {
  const inner = (
    <Card className="h-full transition-colors hover:border-hairline-strong">
      <CardContent className="p-4">
        <Icon className="size-4 text-signal" />
        <div
          className={`mt-2 font-display font-semibold tabular-nums ${small ? "text-sm" : "text-2xl"}`}
        >
          {value}
        </div>
        <div className="engraved mt-1">{label}</div>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}
