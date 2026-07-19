/**
 * Every trainer-facing read goes through here, and every one of them reads a
 * `trainer_*` view.
 *
 * DO NOT reach for `getCaseRequirements()` (lib/requirements/materialize.ts) on
 * a trainer surface — it selects `case_requirements.notes`, which is staff prose
 * and can quote disclosure content. The views exist precisely because a policy
 * cannot hide a column.
 *
 * The views are `auth.uid()`-scoped and require an ACTIVE engagement, so these
 * take the caller's own Supabase client, never the service-role one.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

export type TrainerScope = "progress" | "full"

export interface TrainerCase {
  caseId: string
  engagementId: string
  stage: string
  isRenewal: boolean
  trainingExpiresOn: string | null
  applicantName: string
  applicantEmail: string | null
  applicantPhone: string | null
}

export interface TrainerRequirement {
  caseRequirementId: string
  reqCode: string
  title: string
  description: string | null
  authority: string | null
  severity: string
  blocking: boolean
  status: string
  documentId: string | null
  documentType: string | null
  scope: TrainerScope
}

export interface TrainerDocument {
  documentId: string
  caseRequirementId: string
  reqCode: string | null
  type: string
  fileName: string | null
  status: string
  generated: boolean
  signedAt: string | null
  notarized: boolean
  version: number
  createdAt: string
}

export interface RosterProgress {
  reqCode: string
  requiredCount: number | null
  doneCount: number
  invitedCount: number
}

/** Every case this trainer is actively engaged on, with the identity to work it. */
export async function getTrainerCases(db: DB): Promise<TrainerCase[]> {
  const { data } = await db
    .from("trainer_case_scope")
    .select("case_id, engagement_id, stage, is_renewal, training_expires_on, applicant_name, applicant_email, applicant_phone")
  return (data ?? []).map((r) => ({
    caseId: r.case_id!,
    engagementId: r.engagement_id!,
    stage: r.stage!,
    isRenewal: !!r.is_renewal,
    trainingExpiresOn: r.training_expires_on,
    applicantName: r.applicant_name ?? "Applicant",
    applicantEmail: r.applicant_email,
    applicantPhone: r.applicant_phone,
  }))
}

export async function getTrainerCase(db: DB, caseId: string): Promise<TrainerCase | null> {
  const all = await getTrainerCases(db)
  return all.find((c) => c.caseId === caseId) ?? null
}

/**
 * The requirements this trainer may work on. Hidden items are absent — not
 * redacted, not counted. A count would itself disclose that the applicant has
 * disclosure material.
 */
export async function getTrainerRequirements(db: DB, caseId: string): Promise<TrainerRequirement[]> {
  const { data } = await db
    .from("trainer_requirement_feed")
    .select("case_requirement_id, req_code, title, description, authority, severity, blocking, status, document_id, document_type, scope")
    .eq("case_id", caseId)
    .order("req_code")
  return (data ?? []).map((r) => ({
    caseRequirementId: r.case_requirement_id!,
    reqCode: r.req_code!,
    title: r.title ?? r.req_code!,
    description: r.description,
    authority: r.authority,
    severity: r.severity ?? "high",
    blocking: !!r.blocking,
    status: r.status!,
    documentId: r.document_id,
    documentType: r.document_type,
    scope: (r.scope as TrainerScope) ?? "progress",
  }))
}

export async function getTrainerDocuments(db: DB, caseId: string): Promise<TrainerDocument[]> {
  const { data } = await db
    .from("trainer_document_feed")
    .select("document_id, case_requirement_id, req_code, type, file_name, status, generated, signed_at, notarized, version, created_at")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
  return (data ?? []).map((d) => ({
    documentId: d.document_id!,
    caseRequirementId: d.case_requirement_id!,
    reqCode: d.req_code,
    type: d.type!,
    fileName: d.file_name,
    status: d.status!,
    generated: !!d.generated,
    signedAt: d.signed_at,
    notarized: !!d.notarized,
    version: d.version ?? 1,
    createdAt: d.created_at!,
  }))
}

/** Counts for the third-party documents — never the letters or the people. */
export async function getRosterProgress(db: DB, caseId: string): Promise<RosterProgress[]> {
  const { data } = await db
    .from("trainer_roster_progress")
    .select("req_code, required_count, done_count, invited_count")
    .eq("case_id", caseId)
  return (data ?? []).map((r) => ({
    reqCode: r.req_code!,
    requiredCount: r.required_count,
    doneCount: Number(r.done_count ?? 0),
    invitedCount: Number(r.invited_count ?? 0),
  }))
}

/** Approved-of-applicable, for the progress bar. */
export function progressOf(reqs: TrainerRequirement[]): { done: number; total: number; percent: number } {
  const applicable = reqs.filter((r) => r.status !== "na")
  const done = applicable.filter((r) => r.status === "satisfied").length
  return {
    done,
    total: applicable.length,
    percent: applicable.length ? Math.round((done / applicable.length) * 100) : 0,
  }
}
