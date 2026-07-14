import { createClient } from "@/lib/supabase/server"
import { getPreviewRegistry } from "@/lib/requirements/preview"
import { ChecklistView } from "@/components/marketing/checklist-view"
import { JsonLd, checklistHowToSchema } from "@/components/marketing/json-ld"

export const metadata = {
  title: "Free NYC concealed carry checklist",
  description:
    "The exact documents NYC requires for a concealed carry license — personalized to your situation, cited to the rule, and free with no account.",
}

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
