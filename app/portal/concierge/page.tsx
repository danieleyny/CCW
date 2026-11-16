import Link from "next/link"
import { redirect } from "next/navigation"
import { FileCheck2, Lock, MessageCircle, Users } from "lucide-react"
import { getMyCase } from "@/lib/portal"
import { hasPaidPackage } from "@/lib/packages"
import { createClient } from "@/lib/supabase/server"
import { type CaseStageKey, isNypdControlled } from "@/config/stages"
import { loadConciergeOnboarding } from "@/lib/concierge/onboarding"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import type { RequirementCardCtx } from "@/components/portal/requirement-card"
import { buildReviewItems, readyToFile } from "@/lib/concierge/review"
import { evaluatePreFilingGate } from "@/lib/qa-gate"
import { sendMessage } from "@/app/portal/actions"
import { ScrollToTop } from "@/components/shared/scroll-to-top"
import { DeepLinkHighlight } from "@/components/portal/concierge/deep-link-highlight"
import { AgreementsGate } from "@/components/portal/concierge/agreements-gate"
import { BookCall } from "@/components/portal/concierge/book-call"
import { DocumentVault } from "@/components/portal/concierge/document-vault"
import { ReviewAndFile } from "@/components/portal/concierge/review-and-file"
import { DisclosuresSection } from "@/components/portal/concierge/disclosures-section"
import { DataAsksSection } from "@/components/portal/concierge/data-asks-section"
import { ControlTower } from "@/components/portal/concierge/control-tower"
import { NextStepCard, MobileNextStepBar } from "@/components/portal/concierge/next-step-card"
import { IntroCallNextStep } from "@/components/portal/concierge/intro-call-next-step"
import { createAdminClient } from "@/lib/supabase/admin"
import { buildDataAsks } from "@/lib/concierge/data-asks"
import { SponsorBanner } from "@/components/portal/sponsor/sponsor-banner"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { actionFor } from "@/lib/requirements/actions"
import { isDisclosureItem } from "@/lib/requirements/sections"
import { isUnenforced } from "@/lib/legal-status"
import { getLocale, getMessages } from "@/lib/i18n"
import { interpolate } from "@/lib/i18n/interpolate"

export const metadata = { title: "Your concierge" }

export default async function ConciergeHome() {
  const [myCase, t, locale] = await Promise.all([getMyCase(), getMessages(), getLocale()])
  if (!myCase) redirect("/portal")

  const serviceMode = (myCase.service_mode as "self_guided" | "concierge" | null) ?? null
  if (serviceMode !== "concierge") redirect("/portal/choose-path")

  const supabase = await createClient()
  const { data: activeSponsorship } = await supabase
    .from("case_sponsorships")
    .select("id")
    .eq("case_id", myCase.id)
    .is("revoked_at", null)
    .limit(1)
    .maybeSingle()
  if (!activeSponsorship && !(await hasPaidPackage(supabase, myCase.id, "full_concierge"))) {
    redirect("/portal/choose-path")
  }

  const onboarding = await loadConciergeOnboarding(supabase, myCase.id)
  if (!onboarding.agreementsSigned) {
    return <AgreementsGate defaultName={myCase.client.full_name} />
  }

  const stage = myCase.stage as CaseStageKey
  // Service-role use is limited to resolving the authenticated client's staff-only
  // fact rows into a read-only progress summary; no client-provided values are written.
  const admin = createAdminClient()
  const [view, gate, dataAsks, { data: msgs }, { data: agentRow }, { data: trackRow }] = await Promise.all([
    loadRequirementView(supabase, myCase),
    evaluatePreFilingGate(supabase, myCase.id),
    buildDataAsks(admin, myCase.id),
    supabase
      .from("messages")
      .select("id, body, created_at, profiles:sender_id(full_name, role)")
      .eq("case_id", myCase.id)
      .is("engagement_id", null)
      .order("created_at"),
    supabase.from("clients").select("profiles:assigned_staff(full_name)").eq("id", myCase.client_id).maybeSingle(),
    supabase.from("cases").select("license_track").eq("id", myCase.id).maybeSingle(),
  ])

  const reviewItems = buildReviewItems(view)
  const caseSponsored = view.items.some((item) => item.sponsorManaged)
  const cardCtx: RequirementCardCtx = {
    caseId: myCase.id,
    clientId: myCase.client_id,
    prefills: view.prefills,
    generated: view.generated,
    currentByReq: view.currentByReq,
    referenceProgress: view.referenceProgress,
    cohabitantProgress: view.cohabitantProgress,
    signatureOnFile: view.signatureOnFile,
    feeSummary: view.feeSummary,
    feeReceipts: view.feeReceipts,
    dmvApplicant: view.dmvApplicant,
    caseSponsored,
    licenseTrack: trackRow?.license_track ?? null,
    isConcierge: true,
  }

  const applicable = view.items.filter((item) => item.status !== "na")
  const controlState = {
    stage,
    requirementsTotal: applicable.length,
    requirementsSatisfied: applicable.filter((item) => item.status === "satisfied").length,
    referencesSatisfied: view.referenceProgress
      ? view.referenceProgress.notarizedCount >= view.referenceProgress.required
      : true,
    guardOk: gate.ok,
  }
  const messages: MessageRow[] = (msgs ?? []).map((message) => {
    const profile = message.profiles as unknown as { full_name: string; role: string } | null
    return {
      id: message.id,
      body: message.body,
      created_at: message.created_at,
      senderName: profile?.full_name ?? null,
      senderRole: profile?.role ?? null,
    }
  })
  const agentName = (agentRow?.profiles as unknown as { full_name: string } | null)?.full_name ?? null
  const agentFirst = agentName?.split(" ")[0] ?? null
  const detailsCaptured = dataAsks.reduce((sum, ask) => sum + ask.captured, 0)
  const detailsTotal = dataAsks.reduce((sum, ask) => sum + ask.total, 0)
  const callBooked = Boolean(onboarding.introCall?.scheduledAt)
  const filingReady = readyToFile(stage)
  const bookCallCopy = {
    title: t.concierge.bookIntroTitle,
    description: t.concierge.bookIntroDescription,
    chooseTime: t.concierge.chooseTime,
    modalTitle: t.concierge.modalTitle,
    modalDescription: t.concierge.modalDescription,
    scheduledToast: t.concierge.scheduledToast,
    frameTitle: t.concierge.frameTitle,
    trouble: t.concierge.trouble,
    openNewTab: t.concierge.openNewTab,
    request: t.concierge.request,
    sending: t.concierge.sending,
    requestReceived: t.concierge.requestReceived,
  }

  const firstDataAsk = dataAsks.find((ask) => ask.captured < ask.total)
  const firstDataAskLabel = firstDataAsk
    ? locale === "es"
      ? {
          details: "sus datos",
          residence: "dónde ha vivido",
          employment: "dónde ha trabajado",
          safeguard: "la seguridad de su arma",
          lon: "sus declaraciones escritas",
          confidentiality: "confidencialidad",
        }[firstDataAsk.key] ?? firstDataAsk.label
      : firstDataAsk.label
    : null
  const firstRequirement = view.items.find(
    (item) =>
      item.status !== "na" &&
      item.status !== "satisfied" &&
      item.ladder !== "approved" &&
      item.ladder !== "submitted" &&
      !item.sponsorManaged &&
      !isUnenforced(item.legalStatus) &&
      !(isDisclosureItem(item.reqCode) && actionFor(item.reqCode)?.mode === "generate")
  )
  const requirementAction = firstRequirement ? actionFor(firstRequirement.reqCode) : null

  const nextStep = !callBooked
    ? { title: t.concierge.bookIntroTitle, label: t.concierge.book, href: "#next-step" }
    : firstDataAsk
      ? { title: interpolate(t.concierge.finish, { label: firstDataAskLabel ?? firstDataAsk.label }), label: t.setup.continue, href: firstDataAsk.href }
      : firstRequirement
        ? {
            title: requirementAction?.customerTitle ?? firstRequirement.title,
            label: requirementAction?.actionLabel ?? t.concierge.openItem,
            href: `#${firstRequirement.reqCode}`,
          }
        : filingReady
          ? { title: t.concierge.reviewPacketTitle, label: t.concierge.review, href: "#review" }
          : { title: t.concierge.workingTitle, label: t.concierge.viewProgress, href: "#progress" }

  return (
    <div className="concierge-page">
      <ScrollToTop />
      <DeepLinkHighlight />

      <div id="progress">
        <ControlTower
          state={controlState}
          nypdControlled={isNypdControlled(stage)}
          introCall={onboarding.introCall}
          firstName={myCase.client.full_name.split(" ")[0]}
          agentFirst={agentFirst}
          detailsCaptured={detailsCaptured}
          detailsTotal={detailsTotal}
          copy={{
            eyebrow: t.concierge.fullConcierge,
            welcome: t.concierge.welcome,
            introCall: t.concierge.introCall,
            join: t.concierge.join,
            documentsIn: t.concierge.documentsIn,
            detailsCaptured: t.concierge.detailsCaptured,
            workInProgress: t.concierge.workInProgress,
            step: t.concierge.step,
            of: t.concierge.of,
          }}
        />
      </div>

      <SponsorBanner caseId={myCase.id} />

      {!callBooked ? (
        <IntroCallNextStep
          agentFirst={agentFirst}
          thenLabel={
            firstDataAsk
              ? interpolate(t.concierge.finish, { label: firstDataAskLabel ?? firstDataAsk.label })
              : firstRequirement
                ? requirementAction?.customerTitle ?? firstRequirement.title
                : t.concierge.continuePreparing
          }
          thenCaptured={firstDataAsk?.captured}
          thenTotal={firstDataAsk?.total}
        >
          <BookCall
            calendlyUrl={process.env.CALENDLY_CONCIERGE_URL ?? null}
            introToken={myCase.calendly_token}
            introCall={onboarding.introCall}
            embedded
            copy={bookCallCopy}
          />
        </IntroCallNextStep>
      ) : firstDataAsk ? (
        <NextStepCard
          title={interpolate(t.concierge.finish, { label: firstDataAskLabel ?? firstDataAsk.label })}
          description={t.concierge.finishDetails}
          actionLabel={t.concierge.openDetails}
          href={firstDataAsk.href}
          then={firstRequirement ? requirementAction?.customerTitle ?? firstRequirement.title : t.concierge.continuePreparing}
          eyebrow={t.concierge.nextStep}
        />
      ) : firstRequirement ? (
        <NextStepCard
          title={requirementAction?.customerTitle ?? firstRequirement.title}
          description={t.concierge.firstItemDetails}
          actionLabel={requirementAction?.actionLabel ?? t.concierge.openItem}
          href={`#${firstRequirement.reqCode}`}
          then={t.concierge.teamFollowThrough}
          eyebrow={t.concierge.nextStep}
        />
      ) : filingReady ? (
        <NextStepCard
          title={t.concierge.reviewPacketTitle}
          description={t.concierge.reviewPacketDescription}
          actionLabel={t.concierge.reviewMyPacket}
          href="#review"
          eyebrow={t.concierge.nextStep}
        />
      ) : (
        <NextStepCard
          title={t.concierge.workingTitle}
          description={t.concierge.workingDescription}
          actionLabel={t.concierge.seeProgress}
          href="#progress"
          eyebrow={t.concierge.nextStep}
        />
      )}

      {callBooked ? <MobileNextStepBar title={nextStep.title} label={nextStep.label} href={nextStep.href} /> : null}

      <div className="concierge-layout">
        <div className="concierge-main-column">
          <DataAsksSection asks={dataAsks} />

          <div id="vault" className="scroll-mt-20">
            <DocumentVault
              items={view.items}
              ctx={cardCtx}
              referenceProgress={view.referenceProgress}
              cohabitantProgress={view.cohabitantProgress}
              disclosures={
                <DisclosuresSection view={view} caseId={myCase.id} clientId={myCase.client_id} />
              }
            />
          </div>

          <div id="review" className="concierge-review-card scroll-mt-20" data-ready={filingReady}>
            <ReviewAndFile
              items={reviewItems}
              ready={filingReady}
              caseId={myCase.id}
              clientId={myCase.client_id}
            />
          </div>

          <section id="messages" className="concierge-messages scroll-mt-24" aria-labelledby="messages-title">
            <header className="concierge-section-heading">
              <div>
                <p className="portal-t-eyebrow text-brass-deep">{t.concierge.yourTeam}</p>
                <h2 id="messages-title" className="portal-title-font">{t.concierge.messageConcierge}</h2>
                <p>{t.concierge.messageDescription}</p>
              </div>
            </header>
            <div className="concierge-message-thread">
              <MessageThread
                caseId={myCase.id}
                messages={messages}
                send={sendMessage}
                placeholder={t.concierge.askAnything}
              />
            </div>
          </section>
        </div>

        <aside className="concierge-rail" aria-label={t.concierge.yourTeam}>
          <section className="concierge-rail-card concierge-team-card">
            <span className="concierge-team-avatar" aria-hidden>{agentName ? getInitials(agentName) : "GL"}</span>
            <div><small>{t.concierge.teamLabel}</small><strong>{agentName ?? t.concierge.beingAssigned}</strong><p>{agentName ? t.concierge.namedContact : t.concierge.assignedSoon}</p></div>
            <a href="#messages"><MessageCircle className="size-4" aria-hidden /> {t.concierge.messageTeam}</a>
            <footer>{t.concierge.unlimitedSupport}</footer>
          </section>

          <section className="concierge-rail-card concierge-people-card">
            <header><Users className="size-4" aria-hidden /><strong>{t.concierge.peopleContact}</strong></header>
            {view.referenceProgress ? (
              <div><span aria-label={`${view.referenceProgress.notarizedCount} ${t.concierge.of} ${view.referenceProgress.required} ${t.concierge.references}`}><b>{view.referenceProgress.notarizedCount}</b>/{view.referenceProgress.required}</span><p>{t.concierge.references}</p></div>
            ) : null}
            {view.cohabitantProgress ? (
              <div><span aria-label={`${view.cohabitantProgress.notarizedCount} ${t.concierge.of} ${view.cohabitantProgress.required} ${t.concierge.household}`}><b>{view.cohabitantProgress.notarizedCount}</b>/{view.cohabitantProgress.required}</span><p>{t.concierge.household}</p></div>
            ) : null}
            <Link href="/portal/people">{t.concierge.addNames}</Link>
          </section>

          <section className="concierge-rail-card concierge-finish-card" data-ready={filingReady}>
            {filingReady ? <FileCheck2 className="size-5" aria-hidden /> : <Lock className="size-5" aria-hidden />}
            <small>{t.concierge.finishLine}</small>
            <h2>{t.concierge.reviewSubmit}</h2>
            <p>{t.concierge.finishLineDescription}</p>
            {filingReady ? <a href="#review">{t.concierge.reviewMyPacket}</a> : <span>{t.concierge.unlocksAssembled}</span>}
          </section>
        </aside>
      </div>

      <section className="concierge-mobile-finish" data-ready={filingReady}>
        {filingReady ? <FileCheck2 className="size-5" aria-hidden /> : <Lock className="size-5" aria-hidden />}
        <small>{t.concierge.finishLine}</small>
        <h2>{t.concierge.reviewSubmit}</h2>
        <p>
          {filingReady
            ? t.concierge.readyReview
            : t.concierge.mobileUnlocks}
        </p>
        {filingReady ? <a href="#review">{t.concierge.reviewMyPacket}</a> : null}
      </section>

      <section className="concierge-mobile-team">
        <span className="concierge-team-avatar" aria-hidden>{agentName ? getInitials(agentName) : "GL"}</span>
        <div><small>{t.concierge.teamLabel}</small><strong>{agentName ?? `${t.concierge.beingAssigned} · ${t.concierge.unlimitedSupport}`}</strong></div>
        <a href="#messages" aria-label={t.concierge.messageConcierge}><MessageCircle className="size-5" /></a>
      </section>
    </div>
  )
}

function getInitials(name: string) {
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase()
}
