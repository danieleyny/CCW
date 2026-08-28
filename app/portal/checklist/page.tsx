import Link from "next/link"
import { CheckCircle2, ArrowRight, ConciergeBell } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { RequirementsChecklist } from "@/components/portal/requirements-checklist"

export const metadata = { title: "Your checklist" }

export default async function ChecklistPage() {
  const myCase = await getMyCase()
  if (!myCase) return <NoCase />

  // V3-P2.1 — ONE source of truth: the versioned requirements engine, loaded by
  // the same function /portal/documents uses so the two views cannot disagree.
  const supabase = await createClient()
  const view = await loadRequirementView(supabase, myCase)
  const isConcierge = myCase.service_mode === "concierge"
  // A sponsored case always carries party='sponsor' packet items — so if any item is
  // sponsor-managed, the case is sponsored. Used to lock the employer's Letter-of-
  // Necessity fields (statements 1/3/5) read-only for the applicant.
  const caseSponsored = view.items.some((i) => i.sponsorManaged)

  return (
    <div>
      {/* CONCIERGE QA Phase 4 — a concierge applicant who lands here by URL is on
          the done-for-you path; this list is ours to run, not their to-do list. */}
      {isConcierge && (
        <div className="brass-edge mb-5 flex items-start gap-3 rounded-lg border border-brass/40 bg-brass/8 p-4">
          <ConciergeBell className="mt-0.5 size-5 shrink-0 text-brass" />
          <div>
            <p className="text-sm font-medium">You&apos;re on the done-for-you path.</p>
            <p className="mt-0.5 text-sm text-text-mid">
              We&apos;re handling this list for you — no need to work it yourself. Your dashboard shows what
              we&apos;re doing and the few things we need from you.
            </p>
            <Link
              href="/portal/concierge"
              className="mt-2 inline-flex items-center gap-1.5 text-sm font-medium text-brass-bright underline"
            >
              Go to your concierge dashboard <ArrowRight className="size-3.5" />
            </Link>
          </div>
        </div>
      )}
      <Header intakeDone={view.intakeDone} />
      <RequirementsChecklist
        items={view.items}
        caseId={myCase.id}
        clientId={myCase.client.id}
        prefills={view.prefills}
        generated={view.generated}
        currentByReq={view.currentByReq}
        referenceProgress={view.referenceProgress}
        cohabitantProgress={view.cohabitantProgress}
        dmvApplicant={view.dmvApplicant}
        signatureOnFile={view.signatureOnFile}
        feeSummary={view.feeSummary}
        feeReceipts={view.feeReceipts}
        caseSponsored={caseSponsored}
      />
    </div>
  )
}

function Header({ intakeDone }: { intakeDone: boolean }) {
  return (
    <div className="mb-5">
      {/* Desktop heading — on mobile the sticky checklist header carries the title. */}
      <h1 className="hidden text-2xl font-semibold tracking-tight sm:block">Your checklist</h1>
      {intakeDone ? (
        <>
          <div className="mt-3 flex items-center gap-2 rounded-md border border-ok/30 bg-ok/8 px-3 py-2 text-sm text-ok">
            <CheckCircle2 className="size-4 shrink-0" />
            <span>
              Intake complete — this is your personalized checklist. Each item finishes as you
              provide its document.
            </span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            This is the journey view: what&apos;s left and what to do next. Documents holds every
            file, needed and provided.
          </p>
        </>
      ) : (
        <p className="mt-1 text-sm text-muted-foreground">
          The actions we need from you right now. Documents holds every file, needed and provided.
        </p>
      )}
    </div>
  )
}

function NoCase() {
  return (
    <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
      Your case isn&apos;t set up yet.
    </p>
  )
}
