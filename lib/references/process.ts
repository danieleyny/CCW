/**
 * Reference-outreach helpers (no `server-only` so scripts can drive them).
 * Token generation + recomputing REF-01 from the count of received references.
 */
import { randomBytes } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { requiredReferences } from "@/lib/intake/schema"
import type { WizardAnswers } from "@/lib/intake/answers"

type DB = SupabaseClient<Database>

/** Opaque, URL-safe capability token for a reference link. */
export function newReferenceToken(): string {
  return randomBytes(24).toString("base64url")
}

/** Public-link lifetime; rotated/extended on every resend. */
export const TOKEN_TTL_DAYS = 30

export function tokenExpiry(): string {
  return new Date(Date.now() + TOKEN_TTL_DAYS * 24 * 60 * 60 * 1000).toISOString()
}

/**
 * V3-P0.4 — a public token is usable only if not revoked and not expired.
 * (A null expiry means legacy/pre-hardening; the migration backfills those.)
 */
export function tokenActive(t: { expires_at?: string | null; revoked_at?: string | null }): boolean {
  if (t.revoked_at) return false
  if (t.expires_at && new Date(t.expires_at).getTime() < Date.now()) return false
  return true
}

export const REFERENCES_REQUIRED = 4

/**
 * Recompute the character-reference requirement (REF-01 carry / REF-02 premises).
 *
 * Satisfied on NOTARIZED count, not merely "received". A submitted questionnaire
 * is not the filing evidence — NYPD wants notarized letters, and lib/qa-gate.ts
 * counts notarized. Keying satisfaction off `received` let the checklist show
 * green while the CP-5 gate still blocked on `references_short`.
 *
 * The required count is track-aware (premises = 2, carry = 4, renewal = 0) via
 * the same requiredReferences() the intake validator and the gate use.
 * Never touches a manually rejected/na row.
 */
export async function recomputeReferenceRequirement(admin: DB, caseId: string) {
  const [{ count: receivedCount }, { count: notarizedCount }, { data: kase }, { data: session }] =
    await Promise.all([
      admin.from("character_references").select("id", { count: "exact", head: true }).eq("case_id", caseId).eq("received", true),
      admin.from("character_references").select("id", { count: "exact", head: true }).eq("case_id", caseId).eq("notarized", true),
      admin.from("cases").select("is_renewal").eq("id", caseId).maybeSingle(),
      admin.from("intake_sessions").select("answers").eq("case_id", caseId).maybeSingle(),
    ])
  const received = receivedCount ?? 0
  const notarized = notarizedCount ?? 0

  const answers = (session?.answers ?? {}) as unknown as WizardAnswers
  const required = requiredReferences(answers, { isRenewal: !!kase?.is_renewal })

  // required === 0 (renewal) → the row shouldn't be applicable; leave it pending
  // rather than auto-satisfying on a vacuous 0 >= 0.
  const status: Database["public"]["Enums"]["case_req_status"] =
    required > 0 && notarized >= required ? "satisfied" : "pending"

  // Bind the evidence. REF-01 carries a `reference_letter` document_type, so
  // forbid_satisfied_without_evidence (20260718000600) REJECTS a satisfied row
  // with no reference_id/document_id bound — correctly, since a satisfied
  // requirement should point at its proof.
  //
  // This used to be missing, and the failure was silent in the worst way: the
  // UPDATE raised, the error was never checked, and the function still RETURNED
  // status "satisfied". So a case with every reference notarized reported green
  // to its caller while the row stayed `pending` — and `pending` on a blocking
  // requirement means the CP-5 gate refuses to let the case be filed, forever.
  let referenceId: string | null = null
  if (status === "satisfied") {
    const { data: notarizedRef } = await admin
      .from("character_references")
      .select("id")
      .eq("case_id", caseId)
      .eq("notarized", true)
      .order("id")
      .limit(1)
      .maybeSingle()
    referenceId = notarizedRef?.id ?? null
  }

  // notes is the ONLY reference signal an engaged instructor can read (they can't
  // see character_references) — keep it an aggregate, never a name.
  const { error } = await admin
    .from("case_requirements")
    .update({
      status,
      notes: `${notarized}/${required} notarized · ${received} received`,
      ...(referenceId ? { reference_id: referenceId } : {}),
    })
    .eq("case_id", caseId)
    .in("req_code", ["REF-01", "REF-02"])
    .in("status", ["pending", "satisfied"])

  // Never report a status we failed to persist — that mismatch is what hid this
  // for as long as it did.
  if (error) {
    throw new Error(`Could not update the reference requirement for case ${caseId}: ${error.message}`)
  }

  return { received, notarized, required, status }
}
