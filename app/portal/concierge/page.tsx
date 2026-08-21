import { redirect } from "next/navigation"
import { getMyCase } from "@/lib/portal"
import { hasPaidPackage } from "@/lib/packages"
import { createClient } from "@/lib/supabase/server"
import { type CaseStageKey, isNypdControlled } from "@/config/stages"
import { loadConciergeOnboarding } from "@/lib/concierge/onboarding"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { buildVaultItems } from "@/lib/concierge/vault"
import { buildReviewItems, readyToFile, conciergeSignable } from "@/lib/concierge/review"
import { computeNextStep } from "@/lib/portal/next-step"
import { evaluatePreFilingGate } from "@/lib/qa-gate"
import { sendMessage } from "@/app/portal/actions"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { ScrollToTop } from "@/components/shared/scroll-to-top"
import { AgreementsGate } from "@/components/portal/concierge/agreements-gate"
import { BookCall } from "@/components/portal/concierge/book-call"
import { DocumentVault } from "@/components/portal/concierge/document-vault"
import { ReviewAndFile } from "@/components/portal/concierge/review-and-file"
import { DisclosuresSection } from "@/components/portal/concierge/disclosures-section"
import { ControlTower } from "@/components/portal/concierge/control-tower"
import { SponsorBanner } from "@/components/portal/sponsor/sponsor-banner"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "Your concierge" }

/**
 * CONCIERGE — the done-for-you home. Access requires a paid concierge package.
 * First run is a strict order: the agreements gate blocks everything until it's
 * signed; then the intro call. Phases 3–4 add the secure vault and the live
 * control tower into this same page.
 */
export default async function ConciergeHome() {
  const myCase = await getMyCase()
  if (!myCase) redirect("/portal")

  const serviceMode = (myCase.service_mode as "self_guided" | "concierge" | null) ?? null
  if (serviceMode !== "concierge") redirect("/portal/choose-path")

  const supabase = await createClient()
  if (!(await hasPaidPackage(supabase, myCase.id, "full_concierge"))) redirect("/portal/choose-path")

  const onboarding = await loadConciergeOnboarding(supabase, myCase.id)
  const firstName = myCase.client.full_name.split(" ")[0]

  // The gate blocks everything until the engagement is signed.
  if (!onboarding.agreementsSigned) {
    return <AgreementsGate defaultName={myCase.client.full_name} />
  }

  const stage = myCase.stage as CaseStageKey
  const [view, gate, { data: msgs }] = await Promise.all([
    loadRequirementView(supabase, myCase),
    evaluatePreFilingGate(supabase, myCase.id),
    supabase
      .from("messages")
      .select("id, body, created_at, profiles:sender_id(full_name, role)")
      .eq("case_id", myCase.id)
      .is("engagement_id", null) // staff thread only — instructor chat lives on the engagement
      .order("created_at"),
  ])

  const vaultItems = buildVaultItems(view.items, view.currentByReq)
  const reviewItems = buildReviewItems(view)

  // Milestone state — REAL signals only, never cosmetic.
  const applicable = view.items.filter((i) => i.status !== "na")
  const controlState = {
    stage,
    requirementsTotal: applicable.length,
    requirementsSatisfied: applicable.filter((i) => i.status === "satisfied").length,
    referencesSatisfied: view.referenceProgress
      ? view.referenceProgress.notarizedCount >= view.referenceProgress.required
      : true,
    guardOk: gate.ok,
  }
  // CONCIERGE QA Phase 4 — "the one thing we need from you" is reserved for what
  // ONLY the applicant can supply: a document we don't have, their intake, their
  // references. Generate-and-sign items (AFF-01, SAF-01, sole-occupancy…) are OUR
  // work to prepare — they live in Review & file, not here — so filter them out.
  const applicantItems = view.items.filter((i) => !conciergeSignable(i.reqCode))
  // intakeDone: true always — concierge NEVER does intake themselves (we fill it
  // on their behalf), so the tower must never surface "finish your intake".
  const rawNext = computeNextStep({ items: applicantItems, intakeDone: true, stage })
  // Keep intake on its own page; route every other ask INTO the concierge surface
  // (the vault / roster) instead of the self-guided checklist.
  const nextStep = {
    ...rawNext,
    href: rawNext.href === "/portal/intake" ? rawNext.href : "/portal/concierge#vault",
  }

  const messages: MessageRow[] = (msgs ?? []).map((m) => {
    const p = m.profiles as unknown as { full_name: string; role: string } | null
    return {
      id: m.id,
      body: m.body,
      created_at: m.created_at,
      senderName: p?.full_name ?? null,
      senderRole: p?.role ?? null,
    }
  })

  // QA Phase 9 — surface the assigned concierge (auto-assigned on payment).
  const { data: agentRow } = await supabase
    .from("clients")
    .select("profiles:assigned_staff(full_name)")
    .eq("id", myCase.client_id)
    .maybeSingle()
  const agentFirst =
    (agentRow?.profiles as unknown as { full_name: string } | null)?.full_name?.split(" ")[0] ?? null

  // UX 1.3 — an UNBOOKED call is the single most valuable action → put the
  // scheduler above the fold, before the tower. A BOOKED call is a fact, not a
  // task → show it as a compact strip beneath the tower, not a full calendar.
  const callBooked = !!onboarding.introCall?.scheduledAt
  const bookCall = (
    <BookCall
      calendlyUrl={process.env.CALENDLY_CONCIERGE_URL ?? null}
      introToken={myCase.calendly_token}
      introCall={onboarding.introCall}
    />
  )

  return (
    <div className="space-y-6">
      <ScrollToTop />
      <div>
        <SectionEyebrow>Full Concierge</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome, {firstName}.</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          You&apos;re on the done-for-you path. We prepare and assemble everything — you review it at the
          end and file your own application.
          {agentFirst && (
            <>
              {" "}
              <span className="text-foreground">{agentFirst} is your concierge.</span>
            </>
          )}
        </p>
      </div>

      <SponsorBanner caseId={myCase.id} />

      {!callBooked && bookCall}

      <ControlTower state={controlState} nextStep={nextStep} nypdControlled={isNypdControlled(stage)} />

      {callBooked && bookCall}

      <div id="vault" className="scroll-mt-20">
        <DocumentVault
          caseId={myCase.id}
          clientId={myCase.client_id}
          items={vaultItems}
          referenceProgress={view.referenceProgress}
          cohabitantProgress={view.cohabitantProgress}
          // The single "one thing we need from you" ask, spotlighted at the top of
          // the vault — right where the applicant acts on it — instead of floating
          // in the progress narrative above.
          ask={
            !nextStep.waiting && nextStep.total > 0
              ? { title: nextStep.title, detail: nextStep.detail }
              : null
          }
        />
      </div>

      <DisclosuresSection view={view} caseId={myCase.id} clientId={myCase.client_id} />

      <ReviewAndFile items={reviewItems} ready={readyToFile(stage)} />

      <section className="space-y-3">
        <div>
          <SectionEyebrow>Your team</SectionEyebrow>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">Message your concierge</h2>
        </div>
        <Card>
          <CardContent className="p-5">
            <MessageThread
              caseId={myCase.id}
              messages={messages}
              send={sendMessage}
              placeholder="Ask your concierge anything…"
            />
          </CardContent>
        </Card>
      </section>
    </div>
  )
}
