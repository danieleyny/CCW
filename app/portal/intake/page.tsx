import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { getMyCase } from "@/lib/portal"
import { evaluateSubmissionGuard } from "@/lib/intake/process"
import type { WizardAnswers } from "@/lib/intake/answers"
import { ensureIntakeSession } from "./actions"
import { IntakeWizard } from "@/components/portal/intake/intake-wizard"
import { AI_ENABLED } from "@/lib/ai"

export const metadata = { title: "Application intake" }

export default async function IntakePage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const session = await ensureIntakeSession(myCase.id)
  const completed = !!session.completed_at

  // A sponsored (company-referred) applicant completes their OWN intake — the sponsor
  // never supplies the applicant's identity or disclosures. Show a clear first-run
  // prompt explaining why the interview comes first.
  let sponsorName: string | null = null
  if (!completed) {
    const { data: sp } = await createAdminClient()
      .from("case_sponsorships")
      .select("sponsor:sponsors(legal_name)")
      .eq("case_id", myCase.id)
      .is("revoked_at", null)
      .limit(1)
      .maybeSingle()
    sponsorName = (sp?.sponsor as unknown as { legal_name?: string } | null)?.legal_name ?? null
    if (sp && !sponsorName) sponsorName = "your sponsoring company"
  }

  // V3-P4.4 — carry the eligibility-quiz answers into intake: a brand-new
  // session prefills residence + training status from what the lead already
  // told us, so nobody answers the same question twice.
  let initialAnswers = (session.answers ?? {}) as WizardAnswers
  if (!completed && Object.keys(initialAnswers).length === 0) {
    const supabase0 = await createClient()
    const { data: clientRow } = await supabase0
      .from("clients")
      .select("eligibility")
      .eq("id", myCase.client_id)
      .single()
    const quiz = (clientRow?.eligibility ?? {}) as Record<string, string>
    const prefill: WizardAnswers = {}
    if (quiz.location === "non_resident") prefill.residence = "non_resident"
    else if (quiz.location) prefill.residence = "nyc"
    if (quiz.training === "done") prefill.trainingStatus = "completed"
    else if (quiz.training) prefill.trainingStatus = "planned"
    initialAnswers = prefill
  }

  let disclosures: { id: string; type: string; narrative: string; question_no: number | null }[] = []
  let guard = null
  if (completed) {
    const supabase = await createClient()
    const { data } = await supabase
      .from("disclosures")
      .select("id, type, narrative, question_no")
      .eq("case_id", myCase.id)
      .order("type", { ascending: true })
    disclosures = data ?? []
    // Guard is computed with the service-role client so the pending-requirements
    // count reflects every requirement, matching what generation produced.
    guard = await evaluateSubmissionGuard(createAdminClient(), myCase.id)
  }

  return (
    <div>
      {sponsorName && (
        <div className="mb-5 rounded-lg border border-brass/30 bg-brass/[0.06] p-4">
          <p className="text-sm font-medium text-brass">Let&apos;s start with your interview</p>
          <p className="mt-1 text-sm text-text-mid">
            {sponsorName} is sponsoring your licence and handles the company paperwork. This
            application, though, is yours — only you can answer these questions, so we start here.
            It takes a few minutes and saves as you go.
          </p>
        </div>
      )}
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Application intake</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          A guided interview that builds your personalized document set. Your
          answers save as you go — you can stop and resume anytime.
        </p>
      </div>
      <IntakeWizard
        caseId={myCase.id}
        isRenewal={!!myCase.is_renewal}
        initialAnswers={initialAnswers}
        initialStep={session.current_step ?? 1}
        completed={completed}
        disclosures={disclosures}
        guard={guard}
        aiEnabled={AI_ENABLED}
      />
    </div>
  )
}
