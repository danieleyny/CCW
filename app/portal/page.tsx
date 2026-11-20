import Link from "next/link"
import { redirect } from "next/navigation"
import {
  ChevronRight,
  Clock3,
  CreditCard,
  Files,
  GraduationCap,
  MessageSquare,
} from "lucide-react"
import { SponsorBanner } from "@/components/portal/sponsor/sponsor-banner"
import { ReferralConsentCard } from "@/components/portal/referral-consent-card"
import { ScrollToTop } from "@/components/shared/scroll-to-top"
import { WelcomeCard } from "@/components/portal/welcome-card"
import {
  PortalHomeHero,
  type PortalHomeHeroProps,
} from "@/components/portal/portal-home-hero"
import { PortalHomeJourney } from "@/components/portal/portal-home-journey"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { getMyCase, getTrainingState, type TrainingState } from "@/lib/portal"
import {
  CLIENT_PHASES,
  clientPhaseIndex,
  stageIndex,
  type CaseStageKey,
  type ClientPhaseKey,
} from "@/config/stages"
import { DISPLAY_TIME_ZONE, initials } from "@/lib/format"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { hasPaidPackage } from "@/lib/packages"
import { computeNextStep } from "@/lib/portal/next-step"
import { decideConciergeRouting } from "@/lib/portal/concierge-routing"
import { getLocale, getMessages } from "@/lib/i18n"
import { interpolate } from "@/lib/i18n/interpolate"
import { isSystemVerified } from "@/lib/requirements/system-checks"
import { isUnenforced } from "@/lib/legal-status"
import { buildPortalForms } from "@/lib/forms/portal-forms"
import type { WizardAnswers } from "@/lib/intake/answers"
import { MESSAGE_REPLY_BUSINESS_DAYS } from "@/config/service-targets"
import {
  APPLICATION_TYPE_LABELS,
  applicationTypeNeedsCarryTraining,
  type ApplicationType,
} from "@/lib/application-types"
import type { Locale } from "@/config/i18n"

export async function generateMetadata() {
  const t = await getMessages()
  return { title: t.ui.yourApplication }
}

type StaffMessage = {
  body: string
  senderName: string | null
  senderRole: string | null
}

function localizedApplicationType(
  applicationType: ApplicationType | null,
  t: Awaited<ReturnType<typeof getMessages>>
) {
  if (!applicationType) return null
  if (applicationType === "premise_residence") return t.licensePath.premiseResidence
  if (applicationType === "concealed_carry") return t.licensePath.concealedCarry
  if (applicationType === "special_carry") return t.licensePath.specialCarry
  return APPLICATION_TYPE_LABELS[applicationType]
}

function formatPortalDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: DISPLAY_TIME_ZONE,
  }).format(new Date(value))
}

function nyHour() {
  return Number(
    new Intl.DateTimeFormat("en-US", {
      hour: "numeric",
      hourCycle: "h23",
      timeZone: DISPLAY_TIME_ZONE,
    }).format(new Date())
  )
}

export default async function PortalHome() {
  const [myCase, t, locale] = await Promise.all([getMyCase(), getMessages(), getLocale()])

  if (!myCase) {
    return (
      <section className="portal-home-empty">
        <h1>{t.ui.welcome}</h1>
        <p>{t.ui.conciergeWillReach}</p>
      </section>
    )
  }

  const supabase = await createClient()
  const stage = myCase.stage as CaseStageKey
  const applicationType = myCase.application_type as ApplicationType | null
  const trainingRequired = applicationTypeNeedsCarryTraining(applicationType)
  const serviceMode = (myCase.service_mode as "self_guided" | "concierge" | null) ?? null

  const [
    view,
    trainingState,
    paidConcierge,
    { data: payments },
    { data: intake },
    { data: recentMessages },
    { count: unreadMessages },
    { data: sponsorship },
    { data: refCase },
  ] = await Promise.all([
    loadRequirementView(supabase, myCase),
    trainingRequired
      ? getTrainingState(myCase.id)
      : Promise.resolve<TrainingState>({
          status: "none",
          interestedCount: 0,
          instructorName: null,
          bookingAt: null,
        }),
    hasPaidPackage(supabase, myCase.id, "full_concierge"),
    supabase
      .from("payments")
      .select("amount_cents, status, package_key")
      .eq("case_id", myCase.id),
    supabase
      .from("intake_sessions")
      .select("completed_at, answers")
      .eq("case_id", myCase.id)
      .maybeSingle(),
    supabase
      .from("messages")
      .select("body, created_at, profiles:sender_id(full_name, role)")
      .eq("case_id", myCase.id)
      .is("engagement_id", null)
      .order("created_at", { ascending: false })
      .limit(8),
    supabase
      .from("notifications")
      .select("id", { count: "exact", head: true })
      .eq("read", false),
    supabase
      .from("case_sponsorships")
      .select("id")
      .eq("case_id", myCase.id)
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle(),
    supabase
      .from("cases")
      .select("referred_by_sponsor_id")
      .eq("id", myCase.id)
      .maybeSingle(),
  ])

  const intakeDone = !!intake?.completed_at
  const nextStep = computeNextStep({ items: view.items, intakeDone, stage })
  const localizedNextStep =
    locale === "es"
      ? {
          ...nextStep,
          title:
            nextStep.title === "Finish your intake"
              ? t.portal.finishIntake
              : nextStep.title === "Nothing needed from you right now"
                ? t.ui.nothingNeededNow
                : nextStep.title,
          detail: nextStep.detail.startsWith("It's what builds your personalized")
            ? t.ui.finishIntakeDetail
            : nextStep.detail,
          cta:
            ({
              "Continue intake": t.portal.continueIntake,
              "See everything you've provided": t.ui.seeProvided,
              "See how to get it": t.ui.seeHow,
              "Start it now": t.ui.startNow,
              "Invite them now": t.ui.inviteNow,
              "Take a look": t.ui.takeLook,
            } as Record<string, string>)[nextStep.cta] ?? nextStep.cta,
        }
      : nextStep

  const isSponsored = !!sponsorship
  const isLicensed = stage === "licensed"
  const isDenied = myCase.status === "denied"
  const routing = decideConciergeRouting({
    intakeDone,
    serviceMode,
    paidConcierge,
    isSponsored,
    isLicensed,
    isDenied,
  })
  if (routing.redirectToConcierge) redirect("/portal/concierge")

  const needsPathChoice = !serviceMode && !isLicensed && !isDenied
  const needsConciergePayment = routing.needsConciergePayment
  const hasPackage = (payments ?? []).some((payment) => !!payment.package_key)
  const needsSelfGuidedPackage =
    !hasPackage && serviceMode === "self_guided" && !isLicensed && !isDenied

  const customerItems = view.items.filter(
    (item) =>
      item.status !== "na" &&
      !isSystemVerified(item.reqCode) &&
      !isUnenforced(item.legalStatus)
  )
  const documentsDone = customerItems.filter((item) => item.status === "satisfied").length
  const documentsTotal = customerItems.length
  const documentsLeft = Math.max(0, documentsTotal - documentsDone)
  const trainingCertificateReady = customerItems.some(
    (item) => item.documentType === "training_cert" && item.status === "satisfied"
  )
  const trainingComplete =
    trainingRequired && stageIndex(stage) >= stageIndex("training_complete")
  const statusByRequirement = new Map(view.items.map((item) => [item.reqCode, item.status]))
  const hasPreparedForms =
    intakeDone &&
    buildPortalForms(
      (intake?.answers ?? {}) as unknown as WizardAnswers,
      statusByRequirement
    ).length > 0

  const latestStaffMessage: StaffMessage | null =
    (recentMessages ?? [])
      .map((message) => {
        const sender = message.profiles as unknown as {
          full_name: string
          role: string
        } | null
        return {
          body: message.body,
          senderName: sender?.full_name ?? null,
          senderRole: sender?.role ?? null,
        }
      })
      .find((message) => message.senderRole !== "client") ?? null

  let referral: { company: string; sharing: boolean } | null = null
  if (refCase?.referred_by_sponsor_id) {
    // Applicants cannot read sponsor records. The service role resolves only the
    // referrer's public display name; the applicant still controls consent via RLS.
    const admin = createAdminClient()
    const [{ data: sponsor }, { data: consent }] = await Promise.all([
      admin
        .from("sponsors")
        .select("legal_name")
        .eq("id", refCase.referred_by_sponsor_id)
        .maybeSingle(),
      supabase
        .from("referral_consent")
        .select("consented_at, revoked_at")
        .eq("case_id", myCase.id)
        .maybeSingle(),
    ])
    referral = {
      company: sponsor?.legal_name ?? t.portal.home.referralCompanyFallback,
      sharing: !!consent?.consented_at && !consent.revoked_at,
    }
  }

  const firstName = myCase.client.full_name.trim().split(/\s+/)[0]
  const planLabel =
    serviceMode === "concierge"
      ? t.portal.home.fullConcierge
      : serviceMode === "self_guided"
        ? t.portal.home.selfGuided
        : null
  const applicationLabel = localizedApplicationType(applicationType, t)
  const hour = nyHour()
  const greeting = interpolate(
    hour < 12
      ? t.portal.home.goodMorning
      : hour < 17
        ? t.portal.home.goodAfternoon
        : t.portal.home.goodEvening,
    { name: firstName }
  )
  const mobileGreeting = interpolate(t.portal.home.mobileGreeting, { name: firstName })
  const phaseIndex = clientPhaseIndex(stage)
  const phaseKey = CLIENT_PHASES[phaseIndex].key
  const phaseSubline: Record<ClientPhaseKey, string> = {
    get_started: t.portal.home.getStartedSubline,
    training: t.portal.home.trainingSubline,
    documents: interpolate(t.portal.home.documentsSubline, { count: documentsLeft }),
    nypd_review: t.portal.home.nypdSubline,
    decision: t.portal.home.decisionSubline,
  }
  const phases = {
    get_started: {
      label: t.portal.home.phaseGetStarted,
      subline: t.portal.home.phaseGetStartedDetail,
    },
    training: {
      label: t.portal.home.phaseTraining,
      subline: t.portal.home.phaseTrainingDetail,
    },
    documents: {
      label: t.portal.home.phaseDocuments,
      subline: t.portal.home.phaseDocumentsDetail,
    },
    nypd_review: {
      label: t.portal.home.phaseNypd,
      subline: t.portal.home.phaseNypdDetail,
    },
    decision: {
      label: t.portal.home.phaseDecision,
      subline: t.portal.home.phaseDecisionDetail,
    },
  }

  let hero: PortalHomeHeroProps
  if (isDenied) {
    hero = {
      eyebrow: t.portal.home.deniedEyebrow,
      title: t.portal.home.deniedTitle,
      detail: t.portal.home.deniedDetail,
      variant: "denied",
      action: { label: t.portal.home.startAppeal, href: "/portal/appeal" },
    }
  } else if (isLicensed) {
    hero = {
      eyebrow: t.portal.home.licensedEyebrow,
      title: interpolate(t.portal.home.licensedTitle, { name: firstName }),
      detail: t.portal.home.licensedDetail,
      variant: "licensed",
      action: { label: t.portal.home.openLicenseHub, href: "/portal/license" },
    }
  } else if (needsPathChoice) {
    hero = {
      eyebrow: t.portal.home.firstDecision,
      title: t.portal.home.chooseWorkTitle,
      detail: t.portal.home.chooseWorkDetail,
      action: { label: t.portal.home.comparePlans, href: "/portal/choose-path" },
      choices: [
        {
          title: t.portal.home.selfChoiceTitle,
          detail: t.portal.home.selfChoiceDetail,
        },
        {
          title: t.portal.home.conciergeChoiceTitle,
          detail: t.portal.home.conciergeChoiceDetail,
        },
      ],
    }
  } else if (needsConciergePayment) {
    hero = {
      eyebrow: t.ui.almostThere,
      title: t.ui.paymentUnlockTitle,
      detail: t.ui.paymentUnlockDescription,
      action: { label: t.ui.finishEnrolling, href: "/portal/choose-path" },
    }
  } else if (needsSelfGuidedPackage) {
    hero = {
      eyebrow: t.ui.almostThere,
      title: t.portal.home.choosePackageTitle,
      detail: t.portal.home.choosePackageDetail,
      action: { label: t.portal.home.choosePackage, href: "/portal/enroll" },
    }
  } else {
    const remaining = Math.max(0, localizedNextStep.total - localizedNextStep.done)
    hero = {
      eyebrow: localizedNextStep.waiting
        ? t.portal.home.whereYouAre
        : t.portal.home.nextStep,
      title: localizedNextStep.title,
      detail: localizedNextStep.detail,
      variant: localizedNextStep.waiting ? "waiting" : "default",
      action: { label: localizedNextStep.cta, href: localizedNextStep.href },
      secondary: {
        label: interpolate(t.portal.home.seeEverythingLeft, { count: remaining }),
        href: "/portal/checklist",
      },
      progress: {
        done: localizedNextStep.done,
        total: localizedNextStep.total,
        label: interpolate(t.portal.home.todoAria, {
          done: localizedNextStep.done,
          total: localizedNextStep.total,
        }),
        caption: t.portal.home.todoDone,
      },
    }
  }

  const heroIsIntake = hero.action?.href === "/portal/intake"
  const trainingTile = getTrainingTile({
    trainingRequired,
    trainingComplete,
    trainingCertificateReady,
    trainingState,
    locale,
    t,
  })
  const unread = unreadMessages ?? 0
  const paidSelectedPackage = (payments ?? []).some(
    (payment) =>
      payment.status === "paid" &&
      (!serviceMode ||
        payment.package_key ===
          (serviceMode === "concierge" ? "full_concierge" : "self_guided"))
  )
  const paymentStatus = paidSelectedPackage
    ? t.portal.home.paidInFull
    : interpolate(t.portal.home.paymentDue, {
        package: planLabel ?? t.portal.home.selfGuided,
      })
  const showTiles = !isLicensed && !isDenied

  return (
    <div className="portal-home-page">
      <ScrollToTop />

      <header className="portal-home-header">
        <div>
          <p className="portal-t-eyebrow portal-home-header-eyebrow">
            {t.portal.home.applicationEyebrow}
            {planLabel ? <><span aria-hidden> · </span>{planLabel}</> : null}
          </p>
          <h1>
            <span className="portal-home-greeting-desktop">{greeting}</span>
            <span className="portal-home-greeting-mobile">{mobileGreeting}</span>
          </h1>
          <p className="portal-home-header-subline">{phaseSubline[phaseKey]}</p>
          {applicationLabel ? (
            <span className="portal-home-license-type">{applicationLabel}</span>
          ) : null}
        </div>
        <aside className="portal-home-team">
          <span>{t.portal.home.teamLabel}</span>
          <strong>{t.portal.home.supportName}</strong>
          <small>
            {interpolate(t.portal.home.repliesWithin, {
              days: MESSAGE_REPLY_BUSINESS_DAYS,
            })}
          </small>
        </aside>
      </header>

      <SponsorBanner caseId={myCase.id} />

      <PortalHomeHero {...hero} />

      <PortalHomeJourney
        currentStage={stage}
        title={t.portal.home.journey}
        phaseOf={t.portal.home.phaseOf}
        fullTimeline={t.portal.home.fullTimeline}
        youAreHere={t.portal.home.youAreHere}
        nypdClock={t.portal.home.nypdClock}
        phases={phases}
      />

      {showTiles ? (
        <>
          <section className="portal-home-tiles" aria-label={t.portal.home.applicationEyebrow}>
            <PortalTile
              icon={<GraduationCap aria-hidden />}
              title={t.portal.home.training}
              status={trainingTile.status}
              body={trainingTile.body}
              avatar={trainingTile.avatar}
              link={trainingTile.link}
            />
            <PortalTile
              icon={<Files aria-hidden />}
              title={t.portal.home.documents}
              status={interpolate(t.portal.home.documentsStatus, {
                done: documentsDone,
                total: documentsTotal,
              })}
              body={interpolate(t.portal.home.itemsLeft, { count: documentsLeft })}
              progress={documentsTotal ? (documentsDone / documentsTotal) * 100 : 0}
              link={{ label: t.portal.home.openDocuments, href: "/portal/documents" }}
              extra={
                <>
                  {!heroIsIntake ? (
                    <span className={intakeDone ? "is-complete" : undefined}>
                      {intakeDone
                        ? t.portal.home.intakeComplete
                        : t.portal.home.finishIntakeFirst}
                    </span>
                  ) : null}
                  {hasPreparedForms ? (
                    <Link href="/portal/forms">{t.portal.home.preparedForms}</Link>
                  ) : null}
                </>
              }
            />
            <PortalTile
              icon={<MessageSquare aria-hidden />}
              title={t.portal.home.messages}
              status={
                unread
                  ? interpolate(t.portal.home.newMessages, { count: unread })
                  : t.portal.home.upToDate
              }
              body={latestStaffMessage?.body ?? t.portal.home.noMessages}
              sender={
                latestStaffMessage
                  ? latestStaffMessage.senderRole === "instructor"
                    ? latestStaffMessage.senderName ?? t.portal.home.teamSender
                    : t.portal.home.teamSender
                  : undefined
              }
              link={{ label: t.portal.home.reply, href: "/portal/messages" }}
            />
          </section>

          <section className="portal-home-mobile-rows" aria-label={t.portal.home.applicationEyebrow}>
            <MobilePortalRow
              icon={<GraduationCap aria-hidden />}
              title={t.portal.home.training}
              status={trainingTile.body}
              href={trainingTile.link?.href}
            />
            <MobilePortalRow
              icon={<Files aria-hidden />}
              title={t.portal.home.documents}
              status={interpolate(t.portal.home.itemsLeft, { count: documentsLeft })}
              href="/portal/documents"
            />
            <MobilePortalRow
              icon={<MessageSquare aria-hidden />}
              title={t.portal.home.messages}
              status={
                unread
                  ? interpolate(t.portal.home.newMessages, { count: unread })
                  : t.portal.home.upToDate
              }
              href="/portal/messages"
            />
            <MobilePortalRow
              icon={<CreditCard aria-hidden />}
              title={t.portal.home.payments}
              status={paymentStatus}
              href="/portal/payments"
            />
          </section>
        </>
      ) : null}

      {referral ? (
        <ReferralConsentCard
          caseId={myCase.id}
          company={referral.company}
          sharing={referral.sharing}
        />
      ) : null}

      {showTiles &&
      !needsPathChoice &&
      !needsConciergePayment &&
      !needsSelfGuidedPackage &&
      ["lead", "eligibility_screened", "signed_up_paid"].includes(stage) ? (
        <WelcomeCard
          firstName={firstName}
          trainingHandled={
            trainingState.status === "engaged" || trainingState.status === "booked"
          }
          intakeDone={intakeDone}
          applicationType={applicationType}
        />
      ) : null}

      <section className="portal-home-timing-note">
        <Clock3 aria-hidden />
        <div>
          <h2>{t.portal.home.timingTitle}</h2>
          <p>
            {stageIndex(stage) >= stageIndex("filed")
              ? t.portal.home.timingAfter
              : t.portal.home.timingBefore}
          </p>
          {stageIndex(stage) >= stageIndex("filed") ? (
            <Link href="/portal/interview">{t.portal.home.prepareInterview}</Link>
          ) : null}
        </div>
      </section>
    </div>
  )
}

function getTrainingTile({
  trainingRequired,
  trainingComplete,
  trainingCertificateReady,
  trainingState,
  locale,
  t,
}: {
  trainingRequired: boolean
  trainingComplete: boolean
  trainingCertificateReady: boolean
  trainingState: TrainingState
  locale: Locale
  t: Awaited<ReturnType<typeof getMessages>>
}) {
  if (!trainingRequired) {
    return {
      status: t.portal.home.notRequired,
      body: t.portal.home.noTrainingRequired,
      link: undefined,
      avatar: undefined,
    }
  }
  if (trainingComplete) {
    return {
      status: t.portal.home.done,
      body: t.portal.home.trainingComplete,
      link: trainingCertificateReady
        ? { label: t.portal.home.viewCertificate, href: "/portal/documents" }
        : undefined,
      avatar: undefined,
    }
  }
  if (trainingState.status === "booked" && trainingState.bookingAt) {
    return {
      status: t.portal.home.upToDate,
      body: interpolate(t.portal.home.classBooked, {
        date: formatPortalDate(trainingState.bookingAt, locale),
      }),
      link: { label: t.portal.home.training, href: "/portal/marketplace" },
      avatar: undefined,
    }
  }
  if (trainingState.status === "engaged") {
    return {
      status: t.portal.home.yourInstructor,
      body: trainingState.instructorName ?? t.portal.home.yourInstructor,
      link: { label: t.portal.home.yourInstructor, href: "/portal/marketplace" },
      avatar: initials(trainingState.instructorName),
    }
  }
  if (trainingState.status === "pending") {
    return {
      status: t.portal.home.upToDate,
      body:
        trainingState.interestedCount > 0
          ? interpolate(t.portal.home.instructorsInterested, {
              count: trainingState.interestedCount,
            })
          : t.portal.home.findingInstructors,
      link: { label: t.portal.home.findInstructor, href: "/portal/marketplace" },
      avatar: undefined,
    }
  }
  return {
    status: t.portal.home.findInstructor,
    body: t.portal.home.findInstructor,
    link: { label: t.portal.home.findInstructor, href: "/portal/marketplace" },
    avatar: undefined,
  }
}

function PortalTile({
  icon,
  title,
  status,
  body,
  sender,
  avatar,
  progress,
  link,
  extra,
}: {
  icon: React.ReactNode
  title: string
  status: string
  body: string
  sender?: string
  avatar?: string
  progress?: number
  link?: { label: string; href: string }
  extra?: React.ReactNode
}) {
  return (
    <article className="portal-home-tile">
      <div className="portal-home-tile-heading">
        <span className="portal-home-icon-chip">{icon}</span>
        <h2>{title}</h2>
        <strong>{status}</strong>
      </div>
      <div className="portal-home-tile-body">
        {avatar ? <span className="portal-home-instructor-avatar">{avatar}</span> : null}
        <div>
          {sender ? <small>{sender}</small> : null}
          <p>{body}</p>
        </div>
      </div>
      {typeof progress === "number" ? (
        <div className="portal-home-tile-progress" aria-hidden="true">
          <i style={{ width: `${Math.min(100, Math.max(0, progress))}%` }} />
        </div>
      ) : null}
      {extra ? <div className="portal-home-tile-extra">{extra}</div> : null}
      {link ? <Link href={link.href}>{link.label}</Link> : <span className="portal-home-tile-spacer" />}
    </article>
  )
}

function MobilePortalRow({
  icon,
  title,
  status,
  href,
}: {
  icon: React.ReactNode
  title: string
  status: string
  href?: string
}) {
  const content = (
    <>
      <span className="portal-home-icon-chip">{icon}</span>
      <span>
        <strong>{title}</strong>
        <small>{status}</small>
      </span>
      {href ? <ChevronRight aria-hidden /> : null}
    </>
  )
  return href ? <Link href={href}>{content}</Link> : <div>{content}</div>
}
