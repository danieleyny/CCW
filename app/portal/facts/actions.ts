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
  /** `skipRevalidate` — the inline "Your details" editor updates the screen from
   *  client state, so a revalidatePath mid-typing would re-render the server tree and
   *  steal focus while someone tabs the list. The pencil flows keep revalidating. */
  opts?: { reqCode?: string; skipRevalidate?: boolean }
): Promise<{ ok?: true; error?: string }> {
  const actor = await authorizeCaseActor(caseId)
  if (!actor) return { error: "Not authorized." }
  const def = factDef(key)
  if (!def || def.derive) return { error: "That value can't be edited directly." }

  const admin = createAdminClient()

  if (key === "applicant.ssn") {
    if (actor.actor !== "client") return { error: "Only you can set your Social Security number." }
    // The portal wants only the LAST FOUR digits — we never store a full SSN. Keep the
    // last 4 digits of whatever was entered.
    const last4 = value.replace(/\D/g, "").slice(-4)
    await setCaseSsn(admin, caseId, last4, actor.profileId)
    await logActivity({ action: "fact.ssn_updated", caseId, entity: "case", entityId: caseId })
    if (!opts?.skipRevalidate) revalidatePath("/portal/details")
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
  if (!opts?.skipRevalidate) {
    revalidatePath("/portal/details")
    revalidatePath("/portal/checklist")
  }
  return { ok: true }
}

/**
 * Save the five-year residence/employment history (Q29) and the out-of-city licence
 * (Q9) for a case. These are REPEATABLE rows, so they can't be scalar facts — they
 * merge into intake_sessions.answers (the same store the wizard writes and the
 * application mapper reads), CREATING the row if a concierge case has none. This is
 * the "door" that lets a concierge applicant supply data the wizard never asked.
 */
export async function saveApplicationHistory(
  caseId: string,
  input: {
    residenceHistory: unknown[]
    employmentHistory: unknown[]
    outOfCity: { number: string; county: string; issuedOn: string; expiresOn: string }
    /** Portal tables with no scalar home — optional so existing callers stay valid. */
    firearms?: unknown[]
    otherLicenses?: unknown[]
  }
): Promise<{ ok?: true; error?: string }> {
  const actor = await authorizeCaseActor(caseId)
  if (!actor) return { error: "Not authorized." }
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("intake_sessions")
    .select("answers, current_step")
    .eq("case_id", actor.caseId)
    .maybeSingle()
  const answers = {
    ...((existing?.answers ?? {}) as Record<string, unknown>),
    residenceHistory: input.residenceHistory,
    employmentHistory: input.employmentHistory,
    outOfCityLicenseNumber: input.outOfCity.number || undefined,
    outOfCityCounty: input.outOfCity.county || undefined,
    outOfCityIssuedOn: input.outOfCity.issuedOn || undefined,
    outOfCityExpiresOn: input.outOfCity.expiresOn || undefined,
    ...(input.firearms ? { firearms: input.firearms } : {}),
    ...(input.otherLicenses ? { otherLicenses: input.otherLicenses } : {}),
  }
  const { error } = await admin
    .from("intake_sessions")
    .upsert({ case_id: actor.caseId, current_step: existing?.current_step ?? 1, answers: answers as never }, { onConflict: "case_id" })
  if (error) return { error: "Couldn't save that." }

  await logActivity({ action: "application.history_saved", caseId: actor.caseId, entity: "case", entityId: actor.caseId })
  revalidatePath("/portal/details")
  return { ok: true }
}

/**
 * Save the portal's two record tables that have no scalar home — firearms currently
 * owned and other firearms licences held. Merges ONLY these keys into
 * intake_sessions.answers so it can never clobber the histories saved separately.
 */
export async function saveFirearmsAndLicenses(
  caseId: string,
  input: { firearms: unknown[]; otherLicenses: unknown[] }
): Promise<{ ok?: true; error?: string }> {
  const actor = await authorizeCaseActor(caseId)
  if (!actor) return { error: "Not authorized." }
  const admin = createAdminClient()

  const { data: existing } = await admin
    .from("intake_sessions")
    .select("answers, current_step")
    .eq("case_id", actor.caseId)
    .maybeSingle()
  const answers = {
    ...((existing?.answers ?? {}) as Record<string, unknown>),
    firearms: input.firearms,
    otherLicenses: input.otherLicenses,
  }
  const { error } = await admin
    .from("intake_sessions")
    .upsert({ case_id: actor.caseId, current_step: existing?.current_step ?? 1, answers: answers as never }, { onConflict: "case_id" })
  if (error) return { error: "Couldn't save that." }

  await logActivity({ action: "application.records_saved", caseId: actor.caseId, entity: "case", entityId: actor.caseId })
  revalidatePath("/portal/details")
  return { ok: true }
}
