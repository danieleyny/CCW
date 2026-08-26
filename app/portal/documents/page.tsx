import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { actionFor } from "@/lib/requirements/actions"
import { isSystemVerified } from "@/lib/requirements/system-checks"
import { DocumentLibrary, type LibraryEntry } from "@/components/portal/document-library"
import { buildApplicationReview } from "@/lib/concierge/application-review"
import { ApplicationReview } from "@/components/portal/concierge/application-review"
import { ScrollToTop } from "@/components/shared/scroll-to-top"

export const metadata = { title: "Your application" }

/**
 * The full document library — still needed + completed — driven off the SAME
 * requirement view as the checklist. It used to be a hardcoded list of nine
 * upload slots keyed on document TYPE, which is why a generated addendum could
 * surface under an upload slot it had nothing to do with, and why this page and
 * the checklist could disagree about what was outstanding.
 */
export default async function DocumentsPage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const supabase = await createClient()
  const view = await loadRequirementView(supabase, myCase)

  // CONCIERGE UX Phase 3 — a concierge applicant gets a READ-ONLY application
  // review, not the self-serve upload library. Self-guided is unchanged.
  if (myCase.service_mode === "concierge") {
    const [{ data: reqs }, { data: sp }] = await Promise.all([
      supabase.from("case_requirements").select("req_code, updated_at").eq("case_id", myCase.id),
      supabase
        .from("case_sponsorships")
        .select("sponsor:sponsors(legal_name)")
        .eq("case_id", myCase.id)
        .limit(1)
        .maybeSingle(),
    ])
    const lastActivity: Record<string, string> = {}
    for (const r of reqs ?? []) if (r.updated_at) lastActivity[r.req_code] = r.updated_at
    const sponsorName = (sp?.sponsor as unknown as { legal_name?: string } | null)?.legal_name ?? null
    return (
      <div>
        <ScrollToTop />
        <ApplicationReview groups={buildApplicationReview(view, lastActivity, sponsorName)} />
      </div>
    )
  }

  const entries: LibraryEntry[] = view.items
    // `na` doesn't apply to this case; system controls aren't the customer's job.
    .filter((i) => i.status !== "na" && !isSystemVerified(i.reqCode))
    .map((i) => ({
      reqCode: i.reqCode,
      title: actionFor(i.reqCode)?.customerTitle ?? i.title,
      officialTitle: i.title,
      status: i.status,
      files: view.filesByReq[i.reqCode] ?? [],
    }))

  const completed = entries.filter((e) => e.status === "satisfied")
  const needed = entries.filter((e) => e.status !== "satisfied")

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Every file for your application in one place — what we still need, and what we already
          have. This is the same list as your checklist, organized by file rather than by step.
        </p>
      </div>

      <DocumentLibrary
        needed={needed}
        completed={completed}
        loose={view.looseFiles}
        caseId={myCase.id}
        clientId={myCase.client.id}
        prefills={view.prefills}
        generated={view.generated}
        signatureOnFile={view.signatureOnFile}
        feeSummary={view.feeSummary}
        feeReceipts={view.feeReceipts}
      />
    </div>
  )
}
