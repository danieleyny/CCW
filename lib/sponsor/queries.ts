import "server-only"

import { createClient } from "@/lib/supabase/server"

/**
 * Sponsor read layer. EVERY read goes through a `sponsor_*` security-barrier view
 * with the caller's OWN client — never the admin client. The views' WHERE clauses
 * are the security boundary (active + consented + non-revoked binding for this
 * rep); there is no direct SELECT grant to a sponsor on cases/case_requirements/
 * documents, so a missing binding simply returns nothing.
 */

export interface SponsorCaseRow {
  case_id: string
  sponsorship_id: string
  sponsor_id: string
  scope: "packet_only" | "assist" | "full"
  stage: string
  license_track: string
  applicant_name: string
  /** Home-county pistol-licence expiry (Special Carry Guard) — null until known. */
  county_license_expires_on: string | null
  /** The case's last-movement timestamp, for the board. */
  updated_at: string | null
}

/** The sponsorships (cases) this rep may currently work — one card each. */
export async function loadSponsorCases(): Promise<SponsorCaseRow[]> {
  const db = await createClient()
  const { data } = await db.from("sponsor_case_scope").select("*")
  return (data ?? []) as SponsorCaseRow[]
}

/** One case's scope row, or null if this rep has no active binding to it. */
export async function loadSponsorCase(caseId: string): Promise<SponsorCaseRow | null> {
  const db = await createClient()
  const { data } = await db.from("sponsor_case_scope").select("*").eq("case_id", caseId).maybeSingle()
  return (data as SponsorCaseRow | null) ?? null
}

export interface SponsorRequirementRow {
  case_requirement_id: string
  case_id: string
  req_code: string
  status: string
  document_id: string | null
  party: string
  title: string
  description: string | null
  authority: string | null
  severity: string
  blocking: boolean
  document_type: string | null
  scope: "hidden" | "progress" | "full"
}

export async function loadSponsorRequirements(caseId: string): Promise<SponsorRequirementRow[]> {
  const db = await createClient()
  const { data } = await db
    .from("sponsor_requirement_feed")
    .select("*")
    .eq("case_id", caseId)
    .order("req_code", { ascending: true })
  return (data ?? []) as SponsorRequirementRow[]
}

export interface SponsorDocumentRow {
  document_id: string
  case_id: string
  case_requirement_id: string
  req_code: string
  party: string
  type: string
  file_name: string | null
  status: string
  review_notes: string | null
  generated: boolean
  signed_at: string | null
  notarized: boolean
  version: number
  created_at: string
}

/** Full-scope documents this rep may open (NO file_path — bytes via the RPC). */
export async function loadSponsorDocuments(caseId: string): Promise<SponsorDocumentRow[]> {
  const db = await createClient()
  const { data } = await db
    .from("sponsor_document_feed")
    .select("*")
    .eq("case_id", caseId)
    .order("created_at", { ascending: false })
  return (data ?? []) as SponsorDocumentRow[]
}

export interface SponsorRosterRow {
  case_id: string
  req_code: string
  required_count: number | null
  done_count: number | null
  invited_count: number | null
}

export async function loadSponsorRosterProgress(caseId: string): Promise<SponsorRosterRow[]> {
  const db = await createClient()
  const { data } = await db.from("sponsor_roster_progress").select("*").eq("case_id", caseId)
  return (data ?? []) as SponsorRosterRow[]
}

export interface SponsorWorkerRequestRow {
  id: string
  applicant_name: string
  applicant_email: string
  assignment_role: string | null
  requested_scope: "packet_only" | "assist" | "full"
  status: "pending" | "approved" | "declined"
  decline_reason: string | null
  created_at: string
  resolved_at: string | null
}

/** This rep's own worker requests (RLS scopes to requested_by = them). */
export async function loadMyWorkerRequests(): Promise<SponsorWorkerRequestRow[]> {
  const db = await createClient()
  const { data } = await db
    .from("sponsor_worker_requests")
    .select("id, applicant_name, applicant_email, assignment_role, requested_scope, status, decline_reason, created_at, resolved_at")
    .order("created_at", { ascending: false })
  return (data ?? []) as SponsorWorkerRequestRow[]
}
