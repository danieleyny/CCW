import { redirect } from "next/navigation"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { type CaseStageKey, isNypdControlled } from "@/config/stages"
import { loadConciergeOnboarding } from "@/lib/concierge/onboarding"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { buildVaultItems } from "@/lib/concierge/vault"
import { computeNextStep } from "@/lib/portal/next-step"
import { evaluatePreFilingGate } from "@/lib/qa-gate"
import { sendMessage } from "@/app/portal/actions"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { AgreementsGate } from "@/components/portal/concierge/agreements-gate"
import { BookCall } from "@/components/portal/concierge/book-call"
import { DocumentVault } from "@/components/portal/concierge/document-vault"
import { ControlTower } from "@/components/portal/concierge/control-tower"
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
  const { data: paid } = await supabase
    .from("payments")
    .select("package_key")
    .eq("case_id", myCase.id)
    .eq("status", "paid")
    .eq("package_key", "full_concierge")
    .limit(1)
  if ((paid ?? []).length === 0) redirect("/portal/choose-path")

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
  const nextStep = computeNextStep({ items: view.items, intakeDone: view.intakeDone, stage })

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

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Full Concierge</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Welcome, {firstName}.</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          You&apos;re on the done-for-you path. We prepare and assemble everything — you review it at the
          end and file your own application.
        </p>
      </div>

      <ControlTower state={controlState} nextStep={nextStep} nypdControlled={isNypdControlled(stage)} />

      <BookCall
        calendlyUrl={process.env.CALENDLY_CONCIERGE_URL ?? null}
        caseId={myCase.id}
        introCall={onboarding.introCall}
      />

      <DocumentVault
        caseId={myCase.id}
        clientId={myCase.client_id}
        items={vaultItems}
        referenceProgress={view.referenceProgress}
        cohabitantProgress={view.cohabitantProgress}
      />

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
