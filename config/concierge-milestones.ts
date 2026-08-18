/**
 * The concierge "control tower" narrative — a human, done-for-you view of what
 * WE are doing, derived entirely from REAL case state (the 13-stage case_stage
 * enum + case_requirements counts + the CP-5 submission guard). This is NOT a
 * parallel stage machine and it never lies about progress: a milestone only
 * advances when the case actually advances. NYPD-controlled stages are flagged as
 * such via config/stages.ts so we never imply we can speed the NYPD up.
 */
import { type CaseStageKey, stageIndex } from "@/config/stages"

export type MilestoneStatus = "done" | "in_progress" | "upcoming"

/** Everything the tower needs to derive honest milestone statuses. */
export interface ConciergeCaseState {
  stage: CaseStageKey
  requirementsTotal: number
  requirementsSatisfied: number
  /** REF-01/REF-02 satisfied (notarized letters back). */
  referencesSatisfied: boolean
  /** CP-5 pre-filing guard passed — packet is ready for review. */
  guardOk: boolean
}

interface MilestoneDef {
  key: string
  label: string
  detail: string
}

/** Ordered narrative shown top-to-bottom in the control tower. */
export const CONCIERGE_MILESTONES: MilestoneDef[] = [
  {
    key: "documents",
    label: "Reviewing your documents",
    detail: "We check every file you send, confirm it's readable and complete, and flag anything still missing.",
  },
  {
    key: "worksheet",
    label: "Preparing your worksheet",
    detail: "We turn your documents and answers into a copy-and-paste worksheet for the NYPD online application.",
  },
  {
    key: "references",
    label: "Collecting your references",
    detail: "We invite and chase your references so their notarized letters come back complete — you don't lift a finger.",
  },
  {
    key: "packet",
    label: "Assembling your packet",
    detail: "We put the full, correct packet together and run our pre-filing quality check on it.",
  },
  {
    key: "review",
    label: "Ready for your review & filing",
    detail: "Everything's prepared. You review it, sign what's yours, and file your own application — we walk you through every step.",
  },
]

function order(stage: CaseStageKey): number {
  return stageIndex(stage) + 1
}
const ASSEMBLED_ORDER = order("application_assembled")
const FILED_ORDER = order("filed")

function milestoneDone(key: string, s: ConciergeCaseState): boolean {
  const o = order(s.stage)
  const allDocsIn = s.requirementsTotal > 0 && s.requirementsSatisfied >= s.requirementsTotal
  switch (key) {
    case "documents":
      return o >= ASSEMBLED_ORDER || allDocsIn
    case "worksheet":
      return o >= ASSEMBLED_ORDER
    case "references":
      return o >= ASSEMBLED_ORDER || s.referencesSatisfied
    case "packet":
      return o >= ASSEMBLED_ORDER && s.guardOk
    case "review":
      return o >= FILED_ORDER
    default:
      return false
  }
}

export interface DerivedMilestone extends MilestoneDef {
  status: MilestoneStatus
}

/**
 * The single earliest not-done milestone is "in_progress"; everything before it
 * "done", everything after "upcoming". So the tower always points at the one
 * thing we're working on now.
 */
export function deriveMilestones(s: ConciergeCaseState): DerivedMilestone[] {
  let firstOpen = true
  return CONCIERGE_MILESTONES.map((m) => {
    let status: MilestoneStatus
    if (milestoneDone(m.key, s)) {
      status = "done"
    } else if (firstOpen) {
      status = "in_progress"
      firstOpen = false
    } else {
      status = "upcoming"
    }
    return { ...m, status }
  })
}
