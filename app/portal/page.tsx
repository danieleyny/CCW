import Link from "next/link"
import { redirect } from "next/navigation"
import { ArrowRight, ClipboardList, CalendarDays, CreditCard, CheckCircle2, Compass } from "lucide-react"
import { SponsorBanner } from "@/components/portal/sponsor/sponsor-banner"
import { createClient } from "@/lib/supabase/server"
import { getMyCase, getTrainingState } from "@/lib/portal"
import {
  stageMeta,
  nextStage,
  type CaseStageKey,
} from "@/config/stages"
import { money } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { ReticleProgress } from "@/components/ui/reticle-progress"
import { CaseTimeline } from "@/components/portal/case-timeline"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { ScrollToTop } from "@/components/shared/scroll-to-top"
import { WelcomeCard } from "@/components/portal/welcome-card"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { hasPaidPackage } from "@/lib/packages"
import { computeNextStep } from "@/lib/portal/next-step"
import { getLocale, getMessages } from "@/lib/i18n"
import { interpolate } from "@/lib/i18n/interpolate"
import type { ApplicationType } from "@/lib/application-types"

export async function generateMetadata() {
  const t = await getMessages()
  return { title: t.ui.yourApplication }
}

export default async function PortalHome() {
  const [myCase, t, locale] = await Promise.all([getMyCase(), getMessages(), getLocale()])
  const ui = t.ui

  if (!myCase) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-lg font-semibold">{ui.welcome}</h2>
          <p className="mt-2 text-sm text-text-mid">
            {ui.conciergeWillReach}
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
  const localizedNextStep = locale === "es"
    ? {
        ...nextStep,
        title:
          nextStep.title === "Finish your intake"
            ? t.portal.finishIntake
            : nextStep.title === "Nothing needed from you right now"
              ? ui.nothingNeededNow
              : nextStep.title,
        detail:
          nextStep.detail.startsWith("It's what builds your personalized")
            ? ui.finishIntakeDetail
            : nextStep.detail,
        cta:
          ({
            "Continue intake": t.portal.continueIntake,
            "See everything you've provided": ui.seeProvided,
            "See how to get it": ui.seeHow,
            "Start it now": ui.startNow,
            "Invite them now": ui.inviteNow,
            "Take a look": ui.takeLook,
          } as Record<string, string>)[nextStep.cta] ?? nextStep.cta,
      }
    : nextStep
  // V3-P3 — which lifecycle cards to show.
  const hasPackage = (payments ?? []).some((p) => p.package_key)
  const isLicensed = stage === "licensed"
  const isDenied = myCase.status === "denied"

  // CONCIERGE Phase 1 — a paid concierge applicant lives on the concierge
  // control tower, not this self-guided home. The fork records service_mode;
  // once the concierge package is paid, this is where the two experiences part.
  const serviceMode = (myCase.service_mode as "self_guided" | "concierge" | null) ?? null
  const paidConcierge = await hasPaidPackage(supabase, myCase.id, "full_concierge")
  if (serviceMode === "concierge" && paidConcierge) redirect("/portal/concierge")
  // Not yet forked: the one decision that comes first is HOW we work together.
  // (The onboarding gate already carries brand-new cases to the fork; this covers
  // anyone who lands on /portal without a path set.)
  const needsPathChoice = !serviceMode && !isLicensed && !isDenied
  // CONCIERGE QA Phase 2 — payment limbo: chose concierge, abandoned checkout.
  // Without this they landed on the self-guided home with no way back to pay.
  const needsConciergePayment =
    intakeDone && serviceMode === "concierge" && !paidConcierge && !isLicensed && !isDenied

  // V3-P2.1 — to-dos come from the requirements engine (the one checklist).
  const outstanding = (reqs ?? []).filter((r) => r.status === "pending").length
  const nextTraining = (training ?? []).find((t) => t.class_date)
  const paidCents = (payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount_cents, 0)

  return (
    <div className="space-y-6">
      <ScrollToTop />
      <div>
        <SectionEyebrow>{ui.yourApplication}</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {myCase.client.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-text-mid">{t.portal.tagline}</p>
      </div>

      <SponsorBanner caseId={myCase.id} />

      {/* CONCIERGE QA Phase 2 — chose Full Concierge, hasn't paid: a warm,
          recoverable card, ABOVE the fold, instead of the silent self-guided
          fallthrough. It replaces the next-step card for this state. */}
      {needsConciergePayment && (
        <Card className="brass-edge">
          <CardContent className="p-5">
            <SectionEyebrow>{t.common.almostThere}</SectionEyebrow>
            <h2 className="mt-2 text-lg font-semibold tracking-tight">
              {ui.paymentUnlockTitle}
            </h2>
            <p className="mt-1 text-sm text-text-mid">
              {ui.paymentUnlockDescription}
            </p>
            <Link
              href="/portal/choose-path"
              className="mt-4 inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brass px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brass-bright"
            >
              {ui.finishEnrolling} <ArrowRight className="size-4" />
            </Link>
          </CardContent>
        </Card>
      )}

      {/* Phase 10 — WHAT TO DO NEXT, first thing, above the fold on a phone.
          A returning applicant shouldn't have to hunt three screens down for
          their own to-do list. */}
      {!isLicensed && !isDenied && !needsConciergePayment && (
        <Card className={nextStep.waiting ? "" : "brass-edge"}>
          <CardContent className="p-5">
            <div className="flex items-center justify-between gap-3">
              <SectionEyebrow>{localizedNextStep.waiting ? ui.whereYouAre : ui.yourNextStep}</SectionEyebrow>
              <span className="font-mono text-[11px] tabular-nums text-text-low">
                {interpolate(ui.doneOf, { done: localizedNextStep.done, total: localizedNextStep.total })}
              </span>
            </div>

            <h2 className="mt-2 text-lg font-semibold tracking-tight">{localizedNextStep.title}</h2>
            {localizedNextStep.detail && <p className="mt-1 text-sm text-text-mid">{localizedNextStep.detail}</p>}

            <div className="mt-3 h-1.5 overflow-hidden rounded-full bg-surface-3">
              <div
                className="h-full rounded-full bg-brass transition-[width]"
                style={{ width: `${localizedNextStep.total ? (localizedNextStep.done / localizedNextStep.total) * 100 : 0}%` }}
              />
            </div>

            <div className="mt-4 flex flex-wrap items-center gap-3">
              <Link
                href={localizedNextStep.href}
                className="inline-flex min-h-[44px] items-center gap-2 rounded-md bg-brass px-4 text-sm font-semibold text-brand-foreground transition-colors hover:bg-brass-bright"
              >
                {localizedNextStep.cta} <ArrowRight className="size-4" />
              </Link>
              <Link href="/portal/checklist" className="text-sm text-signal underline">
                {t.portal.viewEverything}
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
          applicationType={myCase.application_type as ApplicationType | null}
        />
      )}

      {/* V3-P3.3 — denial: the appeal window is the only thing that matters */}
      {isDenied && (
        <Link
          href="/portal/appeal"
          className="flex items-center justify-between rounded-md border border-danger/40 bg-danger/10 px-4 py-3.5 text-danger transition-colors hover:border-danger/60"
        >
          <span className="text-sm font-medium">
            {ui.appealOpen}
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
            {ui.licenseHubLink}
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {/* CONCIERGE Phase 1 — the fork, surfaced on home until they pick a path */}
      {needsPathChoice && (
        <Link
          href="/portal/choose-path"
          className="flex items-center justify-between rounded-md border border-brass/40 bg-brass/10 px-4 py-3.5 text-brass-bright transition-colors hover:border-brass/60"
        >
          <span className="flex items-center gap-2 text-sm font-medium">
            <Compass className="size-4" />
            {ui.chooseWorkMode}
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}

      {/* Self-Guided chosen but not paid → close the enrollment loop at checkout.
          (Concierge-unpaid is handled by the payment card above; null path by the
          fork nudge above.) */}
      {!hasPackage && serviceMode === "self_guided" && !isLicensed && !isDenied && (
        <Link
          href="/portal/enroll"
          className="flex items-center justify-between rounded-md border border-brass/40 bg-brass/10 px-4 py-3.5 text-brass-bright transition-colors hover:border-brass/60"
        >
          <span className="text-sm font-medium">{ui.choosePackage}</span>
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
            {ui.intakeCompleteLink}
          </span>
          <ArrowRight className="size-4" />
        </Link>
      ) : (
        <Link
          href="/portal/intake"
          className="flex items-center justify-between rounded-md border border-signal/30 bg-signal-dim px-4 py-3.5 text-signal transition-colors hover:border-signal/50"
        >
          <span className="text-sm font-medium">
            {ui.intakeBuildLink}
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
            ? interpolate(ui.trainingBooked, { date: new Date(trainingState.bookingAt).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" }) })
            : trainingState.status === "engaged"
              ? interpolate(ui.instructorNamed, { name: trainingState.instructorName ?? "" })
              : trainingState.status === "pending"
                ? trainingState.interestedCount > 0
                  ? trainingState.interestedCount === 1
                    ? ui.instructorInterested
                    : interpolate(ui.instructorsInterested, { count: trainingState.interestedCount })
                  : ui.trainingAwaiting
                : ui.findInstructor}
        </span>
        <ArrowRight className="size-4" />
      </Link>

      {/* Prepared documents entry */}
      <Link
        href="/portal/forms"
        className="flex items-center justify-between rounded-md border border-hairline bg-surface-2/40 px-4 py-3.5 text-text-mid transition-colors hover:text-foreground"
      >
        <span className="text-sm font-medium">{ui.preparedDocuments}</span>
        <ArrowRight className="size-4" />
      </Link>

      {/* Reticle progress — centerpiece */}
      <Card className="brass-edge">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="engraved">{ui.currentStage}</div>
              <div className="mt-1 font-display text-xl font-semibold">{stageMeta(stage).label}</div>
            </div>
            <StatusBadge status={myCase.status} />
          </div>
          <ReticleProgress currentStage={stage} />
          <p className="mt-5 rounded-md border border-brass/25 bg-brass/8 p-3 text-sm text-brass-bright">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brass">{ui.nextLabel}</span>{" "}
            {next ? stageMeta(next).clientHint : stageMeta(stage).clientHint}
          </p>
        </CardContent>
      </Card>

      {/* Full application timeline — plain language + honest ETAs */}
      <details className="rounded-lg border bg-card">
        <summary className="cursor-pointer px-5 py-3.5 text-sm font-medium">
          {ui.fullTimeline}
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
          label={ui.todos}
        />
        <HudCard
          icon={CalendarDays}
          value={nextTraining?.class_date ? new Date(nextTraining.class_date).toLocaleDateString(locale === "es" ? "es-US" : "en-US", { month: "short", day: "numeric", year: "numeric" }) : "—"}
          label={ui.trainingLabel}
          small
        />
        <HudCard href="/portal/payments" icon={CreditCard} value={money(paidCents)} label={ui.paidLabel} small />
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
