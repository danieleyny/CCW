import { redirect } from "next/navigation"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { resolveFacts } from "@/lib/facts/resolve"
import { hasCaseSsn } from "@/lib/facts/ssn"
import { FACTS, type FactGroup } from "@/lib/facts/registry"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { FactGroups } from "@/components/portal/facts/fact-groups"

export const metadata = { title: "Your details" }

const GROUP_ORDER: FactGroup[] = ["you", "address", "contact", "physical", "employer", "safeguard", "sponsor"]

/**
 * "Your details" — the preparation form. Every reusable fact captured once, edited
 * in place, propagated to every form. Enter your details here and every
 * questionnaire afterward is nearly empty.
 */
export default async function DetailsPage() {
  const myCase = await getMyCase()
  if (!myCase) redirect("/portal")
  const db = await createClient()
  const facts = await resolveFacts(db, myCase.id)
  const hasSsn = await hasCaseSsn(createAdminClient(), myCase.id)

  // Completeness meter over the editable, non-SSN facts.
  const editable = FACTS.filter((f) => !f.derive && f.key !== "applicant.ssn")
  const captured = editable.filter((f) => (facts[f.key] ?? "").trim()).length
  const total = editable.length

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Prepared once, reused everywhere</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your details</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          Everything the NYPD forms ask for, in one place. Correct something here and it&apos;s corrected on
          every form that uses it — so your questionnaires stay nearly empty.
        </p>
      </div>

      <div className="rounded-lg border border-brass/30 bg-brass/[0.05] p-4">
        <div className="flex items-center justify-between text-sm">
          <span className="font-medium">
            {captured} of {total} details captured
          </span>
          {captured < total && <span className="text-text-mid">{total - captured} still needed</span>}
        </div>
        <div className="mt-2 h-2 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-brass" style={{ width: `${Math.round((captured / total) * 100)}%` }} />
        </div>
      </div>

      <FactGroups caseId={myCase.id} facts={facts} hasSsn={hasSsn} groups={GROUP_ORDER} showSsn />
    </div>
  )
}
