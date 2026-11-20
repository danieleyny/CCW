import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { loadRequirementView } from "@/lib/portal/requirement-view"
import { actionFor } from "@/lib/requirements/actions"
import { isSystemVerified } from "@/lib/requirements/system-checks"
import { DocumentLibrary, type LibraryEntry } from "@/components/portal/document-library"
import { buildApplicationReview } from "@/lib/concierge/application-review"
import { ApplicationReview } from "@/components/portal/concierge/application-review"
import { ScrollToTop } from "@/components/shared/scroll-to-top"
import { getMessages } from "@/lib/i18n"
import { categoryKeyFor } from "@/lib/requirements/categories"

export async function generateMetadata() {
  const t = await getMessages()
  return { title: t.pages.documentsTitle }
}

/**
 * The full document library — still needed + completed — driven off the SAME
 * requirement view as the checklist. It used to be a hardcoded list of nine
 * upload slots keyed on document TYPE, which is why a generated addendum could
 * surface under an upload slot it had nothing to do with, and why this page and
 * the checklist could disagree about what was outstanding.
 */
export default async function DocumentsPage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[]; group?: string | string[] }>
}) {
  const [myCase, t, query] = await Promise.all([getMyCase(), getMessages(), searchParams])
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        {t.common.noCase}
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
        <ApplicationReview
          groups={buildApplicationReview(view, lastActivity, sponsorName)}
          asOf={new Date().toISOString()}
        />
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
      ladder: i.ladder,
      destination: i.destination ?? null,
      categoryKey: categoryKeyFor(i.reqCode),
      parts: i.parts ?? null,
      files: view.filesByReq[i.reqCode] ?? [],
    }))

  const completed = entries.filter((e) => e.status === "satisfied")
  const needed = entries.filter((e) => e.status !== "satisfied")

  return (
    <div>
      <DocumentLibrary
        needed={needed}
        completed={completed}
        loose={view.looseFiles}
        initialTab={typeof query.tab === "string" ? query.tab : null}
        initialGroup={typeof query.group === "string" ? query.group : null}
      />
    </div>
  )
}
