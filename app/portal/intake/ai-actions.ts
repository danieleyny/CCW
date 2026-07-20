"use server"

import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { logActivity } from "@/lib/activity"
import { AI_ENABLED } from "@/lib/ai"
import { draftDisclosureNarrative, type DisclosureFacts } from "@/lib/ai/disclosure-assistant"

/**
 * PART C / Phase 12 — draft a disclosure narrative from the applicant's OWN
 * facts. ⚖ Fails closed when AI is disabled; the draft is never saved
 * automatically (the applicant edits and owns it), and every use is flagged for
 * MANDATORY human review before it can go into an application.
 */
export async function draftMyDisclosure(
  facts: DisclosureFacts,
  disclosureId?: string
): Promise<{ draft?: string; error?: string; unavailable?: boolean }> {
  await requireRole(["client"])

  if (!AI_ENABLED) {
    // The feature is off by default — the applicant writes their own statement.
    return { unavailable: true, error: "The writing assistant isn't available. Please write your statement in your own words." }
  }

  const parsed = z
    .object({
      kind: z.enum(["arrest", "summons", "order_of_protection", "domestic_incident", "other"]),
      occurredOn: z.string().max(40).optional(),
      jurisdiction: z.string().max(200).optional(),
      charge: z.string().max(300).optional(),
      disposition: z.string().max(300).optional(),
      whatHappened: z.string().min(1).max(4000),
      outcome: z.string().max(1000).optional(),
    })
    .safeParse(facts)
  if (!parsed.success) return { error: "Tell us, in your own words, what happened." }

  const myCase = await getMyCase()
  if (!myCase) return { error: "No case found." }

  // Ownership: if a disclosure id is supplied it must belong to this case.
  // During intake the arrest rows aren't materialized yet, so the id is absent —
  // the applicant's own case (getMyCase) is the ownership boundary there.
  if (disclosureId) {
    const supabase = await createClient()
    const { data: disclosure } = await supabase
      .from("disclosures")
      .select("id")
      .eq("id", disclosureId)
      .eq("case_id", myCase.id)
      .maybeSingle()
    if (!disclosure) return { error: "That disclosure isn't part of your case." }
  }

  let result
  try {
    result = await draftDisclosureNarrative(parsed.data)
  } catch (err) {
    console.error("[ai] disclosure draft failed:", err)
    return { error: "Couldn't draft that right now. Please write your statement in your own words." }
  }

  // MANDATORY human review. An AI-assisted narrative gets a staff task so it's
  // read by a person (and the attorney seam) before it's ever used — the draft
  // is a starting point, never a finished legal statement.
  // Service-role justified: tasks are staff-write-only; server-derived values
  // after requireRole + ownership.
  await createAdminClient().from("tasks").insert({
    case_id: myCase.id,
    title: `Review AI-assisted disclosure narrative`,
    description:
      "The applicant used the writing assistant to organize a disclosure statement from their own facts. Read it for accuracy and completeness, and route any legal-interpretation question to the attorney seam. This is the highest-sensitivity content — staff/attorney review is required before use.",
    priority: 1,
    status: "open",
  })

  await logActivity({
    action: "disclosure.ai_draft_generated",
    caseId: myCase.id,
    entity: "disclosure",
    entityId: disclosureId ?? null,
    detail: { needs_legal_review: true },
  })

  return { draft: result.draft }
}
