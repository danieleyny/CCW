import { isNypdControlled, stageMeta, type CaseStageKey } from "@/config/stages"
import { countyExpiryStatus } from "@/lib/county-license"
import { loadSponsorCases, loadSponsorRequirements, type SponsorCaseRow, type SponsorRequirementRow } from "./queries"

/**
 * The employer board (S1 Phase 2). One row per worker answering: what is this worker
 * waiting on, and who owns it? The sponsor read layer only ever surfaces the company's
 * own (party='sponsor') requirement rows — the applicant's file stays hidden (P0.1) —
 * so the blocking item is either a visible employer packet item, or, when there is none,
 * the STAGE tells the story without exposing the applicant's documents. NYPD-controlled
 * stages are never ours to speed up (AGENTS.md #4).
 */

export type BoardOwner = "worker" | "employer" | "us" | "nypd" | "done"

export interface BoardRow {
  caseId: string
  applicantName: string
  trackLabel: string
  stageLabel: string
  blockingItem: string
  owner: BoardOwner
  ownerLabel: string
  lastMovement: string | null
  countyExpiry: string | null
  /** County licence lapses within 90 days (or already has) — the highest-consequence date. */
  countyExpiringSoon: boolean
  countyExpired: boolean
}

export interface SponsorBoard {
  rows: BoardRow[]
  total: number
  blockedOnEmployer: number
  waitingOnNypd: number
}

export const TRACK_LABEL: Record<string, string> = {
  carry_guard: "NYPD Carry Guard",
  special_carry_guard: "NYPD Special Carry Guard",
  sponsored_unresolved: "NYPD armed guard (category being confirmed)",
  concealed_carry: "NYPD licence",
}

const OWNER_LABEL: Record<BoardOwner, string> = {
  worker: "The worker",
  employer: "You (employer)",
  us: "Gun License NYC",
  nypd: "NYPD",
  done: "Licensed",
}

/**
 * Pure per-worker row derivation (unit-testable). `reqs` are ONLY the sponsor-visible
 * requirement rows (party='sponsor' after the P0.1 lockdown) — so the blocking item can
 * never be a hidden applicant document. Owner is decided before those rows are even
 * consulted for a licensed or NYPD-controlled case.
 */
export function deriveBoardRow(c: SponsorCaseRow, reqs: SponsorRequirementRow[], now: number): BoardRow {
  const stage = c.stage as CaseStageKey
  let owner: BoardOwner
  let blockingItem: string

  if (stage === "licensed") {
    owner = "done"
    blockingItem = "Licensed — nothing outstanding."
  } else if (isNypdControlled(stage)) {
    // Waiting on NYPD — never imply we can move it faster (AGENTS.md #4).
    owner = "nypd"
    blockingItem = `With the NYPD — ${stageMeta(stage).label.toLowerCase()}.`
  } else {
    const employerBlocker = reqs
      .filter((r) => r.party === "sponsor" && r.blocking && r.status !== "satisfied" && r.status !== "na")
      .sort((a, b) => a.req_code.localeCompare(b.req_code))[0]
    if (employerBlocker) {
      owner = "employer"
      blockingItem = employerBlocker.title
    } else if (stage === "notarization" || stage === "application_assembled") {
      owner = "us"
      blockingItem = "With our team — assembling and reviewing the packet."
    } else {
      owner = "worker"
      blockingItem = "With the worker — documents and training."
    }
  }

  const { expiry: countyExpiry, expired: countyExpired, expiringSoon: countyExpiringSoon } = countyExpiryStatus(c.county_license_expires_on, now)

  return {
    caseId: c.case_id,
    applicantName: c.applicant_name,
    trackLabel: TRACK_LABEL[c.license_track] ?? c.license_track,
    stageLabel: stageMeta(stage)?.label ?? c.stage,
    blockingItem,
    owner,
    ownerLabel: OWNER_LABEL[owner],
    lastMovement: c.updated_at,
    countyExpiry,
    countyExpiringSoon,
    countyExpired,
  }
}

export async function loadSponsorBoard(): Promise<SponsorBoard> {
  const cases = await loadSponsorCases()
  const now = Date.now()
  const rows: BoardRow[] = await Promise.all(
    cases.map(async (c) => {
      // Only fetch requirements when the stage doesn't already decide the owner.
      const stage = c.stage as CaseStageKey
      const needsReqs = stage !== "licensed" && !isNypdControlled(stage)
      const reqs = needsReqs ? await loadSponsorRequirements(c.case_id) : []
      return deriveBoardRow(c, reqs, now)
    })
  )
  return {
    rows,
    total: rows.length,
    blockedOnEmployer: rows.filter((r) => r.owner === "employer").length,
    waitingOnNypd: rows.filter((r) => r.owner === "nypd").length,
  }
}
