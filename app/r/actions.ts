"use server"

import { createAdminClient } from "@/lib/supabase/admin"
import { recomputeReferenceRequirement } from "@/lib/references/process"

export interface SubmitReferenceInput {
  attest: boolean
  statement: string
  notarized: boolean
}

/**
 * Public, no-login reference submission. The token IS the capability — every
 * write is derived from it and scoped to that one reference. Runs via the
 * service-role client (bypasses RLS) but trusts nothing from the form except
 * the attestation/statement.
 */
export async function submitReference(
  token: string,
  input: SubmitReferenceInput
): Promise<{ ok?: boolean; error?: string; alreadyDone?: boolean }> {
  if (!input.attest) return { error: "Please confirm the attestation to submit." }

  const admin = createAdminClient()
  const { data: req } = await admin
    .from("reference_requests")
    .select("id, reference_id, case_id, status")
    .eq("token", token)
    .maybeSingle()
  if (!req) return { error: "This link is invalid or has expired." }
  if (req.status === "submitted" || req.status === "notarized") {
    return { alreadyDone: true, ok: true }
  }

  await admin
    .from("character_references")
    .update({ received: true, notarized: input.notarized })
    .eq("id", req.reference_id)

  await admin
    .from("reference_requests")
    .update({
      status: input.notarized ? "notarized" : "submitted",
      submitted_at: new Date().toISOString(),
    })
    .eq("id", req.id)

  const rec = await recomputeReferenceRequirement(admin, req.case_id)

  await admin.from("activity_log").insert({
    case_id: req.case_id,
    action: "reference.submitted",
    entity: "reference",
    entity_id: req.reference_id,
    detail: { notarized: input.notarized, statement: input.statement.slice(0, 2000), ...rec } as never,
  })

  return { ok: true }
}
