"use server"

import { revalidatePath } from "next/cache"
import { authorizeCaseActor } from "@/lib/case-actor"
import { createAdminClient } from "@/lib/supabase/admin"
import { factDef } from "@/lib/facts/registry"
import { setCaseSsn } from "@/lib/facts/ssn"
import { logActivity } from "@/lib/activity"

/**
 * Edit a fact. Default is PROPAGATE — write the shared case_facts row so the
 * correction reaches every form. Pass reqCode for a form-local override. A shared
 * change marks already-SIGNED generated documents stale (never rewrites them).
 * Attributed, so the applicant's activity view shows a sponsor edit by name.
 * The SSN routes to the encrypted store and is applicant-only.
 */
export async function setCaseFact(
  caseId: string,
  key: string,
  value: string,
  opts?: { reqCode?: string }
): Promise<{ ok?: true; error?: string }> {
  const actor = await authorizeCaseActor(caseId)
  if (!actor) return { error: "Not authorized." }
  const def = factDef(key)
  if (!def || def.derive) return { error: "That value can't be edited directly." }

  const admin = createAdminClient()

  if (key === "applicant.ssn") {
    if (actor.actor !== "client") return { error: "Only you can set your Social Security number." }
    await setCaseSsn(admin, caseId, value, actor.profileId)
    await logActivity({ action: "fact.ssn_updated", caseId, entity: "case", entityId: caseId })
    revalidatePath("/portal/details")
    return { ok: true }
  }

  const overrideReq = opts?.reqCode ?? ""
  const { error } = await admin.from("case_facts").upsert(
    {
      case_id: caseId,
      key,
      value: value.trim(),
      sensitive: !!def.sensitive,
      source: actor.actor,
      updated_by: actor.profileId,
      override_req_code: overrideReq,
    },
    { onConflict: "case_id,key,override_req_code" }
  )
  if (error) return { error: "Couldn't save that." }

  // A shared fact change makes signed generated documents stale — regenerate + re-sign.
  if (!overrideReq) {
    await admin.from("documents").update({ stale: true }).eq("case_id", caseId).eq("generated", true).not("signed_at", "is", null)
  }
  await logActivity({
    action: "fact.updated",
    caseId,
    entity: "case",
    entityId: caseId,
    detail: { key, ...(overrideReq ? { override: overrideReq } : {}) },
  })
  revalidatePath("/portal/details")
  revalidatePath("/portal/checklist")
  return { ok: true }
}
