import { createClient } from "@/lib/supabase/server"
import { getPreviewRegistry } from "@/lib/requirements/preview"
import { buildMetadata } from "@/lib/seo"
import { ChecklistView } from "@/components/marketing/checklist-view"
import { JsonLd, checklistHowToSchema } from "@/components/marketing/json-ld"

export const metadata = buildMetadata({
  title: "Free NYC Gun License Checklist",
  description:
    "Every document the NYPD License Division requires, personalized to your situation. Free, no account needed, and each item tied to the rule behind it.",
  path: "/checklist",
})

/**
 * V5b Workstream B — the anonymous lead magnet. Reads the active requirements
 * registry (a SELECT), then ChecklistView runs the PURE generator client-side.
 * Zero writes: no client row, no case, no case_requirements. The provenance is
 * the product; the account is optional.
 */
export default async function ChecklistPage() {
  const registry = await getPreviewRegistry(await createClient())
  return (
    <>
      <JsonLd data={checklistHowToSchema} />
      <ChecklistView registry={registry} />
    </>
  )
}
