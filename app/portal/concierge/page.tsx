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
import { getMessages } from "@/lib/i18n"

export const metadata = { title: "Your concierge" }

export default async function ConciergeHome() {
  const [myCase, t] = await Promise.all([getMyCase(), getMessages()])
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
      ? { title: `Finish ${firstDataAsk.label}`, label: "Continue", href: firstDataAsk.href }
      : firstRequirement
        ? {
            title: requirementAction?.customerTitle ?? firstRequirement.title,
            label: requirementAction?.actionLabel ?? "Open item",
            href: `#${firstRequirement.reqCode}`,
          }
        : filingReady
          ? { title: "Review and approve your packet", label: "Review", href: "#review" }
          : { title: "We’re on it", label: "View progress", href: "#progress" }

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
              ? `Finish ${firstDataAsk.label}`
              : firstRequirement
                ? requirementAction?.customerTitle ?? firstRequirement.title
                : "We continue preparing your packet"
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
          title={`Finish ${firstDataAsk.label}`}
          description="Add the remaining details once; we’ll reuse them across the documents we prepare."
          actionLabel="Open your details"
          href={firstDataAsk.href}
          then={firstRequirement ? requirementAction?.customerTitle ?? firstRequirement.title : "we continue preparing your packet"}
          eyebrow={t.concierge.nextStep}
        />
      ) : firstRequirement ? (
        <NextStepCard
          title={requirementAction?.customerTitle ?? firstRequirement.title}
          description="This is the first item that still needs you. Your concierge team will handle the follow-through."
          actionLabel={requirementAction?.actionLabel ?? "Open item"}
          href={`#${firstRequirement.reqCode}`}
          then="we review what you send and move to the next item"
          eyebrow={t.concierge.nextStep}
        />
      ) : filingReady ? (
        <NextStepCard
          title="Review and submit your packet"
          description="Your packet is assembled and quality-checked. Review it, then submit your own application."
          actionLabel="Review my packet"
          href="#review"
          eyebrow={t.concierge.nextStep}
        />
      ) : (
        <NextStepCard
          title="We’re on it"
          description="Your team is working through the current case milestone. Nothing new is required from you right now."
          actionLabel="See case progress"
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
                <p className="portal-t-eyebrow text-brass-deep">Your team</p>
                <h2 id="messages-title" className="portal-title-font">Message your concierge</h2>
                <p>Ask a question or send context without leaving your case.</p>
              </div>
            </header>
            <div className="concierge-message-thread">
              <MessageThread
                caseId={myCase.id}
                messages={messages}
                send={sendMessage}
                placeholder="Ask your concierge anything…"
              />
            </div>
          </section>
        </div>

        <aside className="concierge-rail" aria-label="Concierge case summary">
          <section className="concierge-rail-card concierge-team-card">
            <span className="concierge-team-avatar" aria-hidden>{agentName ? getInitials(agentName) : "GL"}</span>
            <div><small>Your concierge team</small><strong>{agentName ?? "Being assigned"}</strong><p>{agentName ? "Your named case contact" : "Usually within one business day"}</p></div>
            <a href="#messages"><MessageCircle className="size-4" aria-hidden /> Message your team</a>
            <footer>Routine follow-ups · unlimited support</footer>
          </section>

          <section className="concierge-rail-card concierge-people-card">
            <header><Users className="size-4" aria-hidden /><strong>People we contact for you</strong></header>
            {view.referenceProgress ? (
              <div><span aria-label={`${view.referenceProgress.notarizedCount} of ${view.referenceProgress.required} references back`}><b>{view.referenceProgress.notarizedCount}</b>/{view.referenceProgress.required}</span><p>References</p></div>
            ) : null}
            {view.cohabitantProgress ? (
              <div><span aria-label={`${view.cohabitantProgress.notarizedCount} of ${view.cohabitantProgress.required} household affidavits back`}><b>{view.cohabitantProgress.notarizedCount}</b>/{view.cohabitantProgress.required}</span><p>Household</p></div>
            ) : null}
            <Link href="/portal/people">Add names or check status</Link>
          </section>

          <section className="concierge-rail-card concierge-finish-card" data-ready={filingReady}>
            {filingReady ? <FileCheck2 className="size-5" aria-hidden /> : <Lock className="size-5" aria-hidden />}
            <small>The finish line</small>
            <h2>Review &amp; submit</h2>
            <p>When your packet is ready, you approve it here, then submit your own application with our guidance.</p>
            {filingReady ? <a href="#review">Review my packet</a> : <span>Unlocks when your packet is assembled</span>}
          </section>
        </aside>
      </div>

      <section className="concierge-mobile-finish" data-ready={filingReady}>
        {filingReady ? <FileCheck2 className="size-5" aria-hidden /> : <Lock className="size-5" aria-hidden />}
        <small>The finish line</small>
        <h2>Review &amp; submit</h2>
        <p>
          {filingReady
            ? "Your packet is ready for your review. You submit your own NYPD application with our guidance."
            : "Unlocks when your packet is assembled and quality-checked."}
        </p>
        {filingReady ? <a href="#review">Review my packet</a> : null}
      </section>

      <section className="concierge-mobile-team">
        <span className="concierge-team-avatar" aria-hidden>{agentName ? getInitials(agentName) : "GL"}</span>
        <div><small>Your concierge team</small><strong>{agentName ?? "Being assigned · unlimited support"}</strong></div>
        <a href="#messages" aria-label="Message your concierge"><MessageCircle className="size-5" /></a>
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
