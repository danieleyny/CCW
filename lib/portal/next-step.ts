/**
 * "What do I do next?" — computed, not guessed.
 *
 * The portal home led with orientation cards and put the actual work three
 * screens down, so a returning applicant landed and had to go looking for their
 * own to-do list. This picks the ONE thing that matters most right now.
 *
 * Ordering is by how much the item can hurt: an unstarted intake first (nothing
 * else is even personalized without it), then pending requirements worst-first,
 * with optional items last. When nothing is outstanding it says so plainly and
 * names what's being waited on — an ambiguous "all clear" is its own anxiety.
 */
import { stageMeta, type CaseStageKey } from "@/config/stages"
import { actionFor } from "@/lib/requirements/actions"
import { isSystemVerified } from "@/lib/requirements/system-checks"
import { isUnenforced } from "@/lib/legal-status"
import type { ReqChecklistItem } from "@/components/portal/requirements-checklist"

export interface NextStep {
  title: string
  detail: string
  href: string
  cta: string
  /** Nothing to do right now — we're waiting on someone else. */
  waiting: boolean
  done: number
  total: number
}

const SEVERITY_RANK: Record<string, number> = { critical: 0, high: 1, long_lead: 2, watch: 3 }

export function computeNextStep(args: {
  items: ReqChecklistItem[]
  intakeDone: boolean
  stage: CaseStageKey
}): NextStep {
  const { items, intakeDone, stage } = args

  // System controls aren't the customer's work, and `na` doesn't apply to them.
  // Neither is a rule a court has stopped: it can never be satisfied, so
  // counting it left the home page stuck one short of its own total forever
  // (SOC-01 did exactly this). It's shown on the checklist, explained — but it
  // is not work, and it is not part of the denominator.
  const mine = items.filter(
    (i) => i.status !== "na" && !isSystemVerified(i.reqCode) && !isUnenforced(i.legalStatus)
  )
  const done = mine.filter((i) => i.status === "satisfied").length
  const total = mine.length

  if (!intakeDone) {
    return {
      title: "Finish your intake",
      detail:
        "It's what builds your personalized document list — until it's done, we're guessing at what you need.",
      href: "/portal/intake",
      cta: "Continue intake",
      waiting: false,
      done,
      total,
    }
  }

  const outstanding = mine
    .filter((i) => i.status !== "satisfied")
    .sort((a, b) => {
      const optA = actionFor(a.reqCode)?.optional ? 1 : 0
      const optB = actionFor(b.reqCode)?.optional ? 1 : 0
      if (optA !== optB) return optA - optB
      const sevA = SEVERITY_RANK[a.severity] ?? 9
      const sevB = SEVERITY_RANK[b.severity] ?? 9
      if (sevA !== sevB) return sevA - sevB
      return a.reqCode.localeCompare(b.reqCode)
    })

  const next = outstanding[0]
  if (!next) {
    return {
      title: "Nothing needed from you right now",
      detail: stageMeta(stage).clientHint,
      href: "/portal/checklist",
      cta: "See everything you've provided",
      waiting: true,
      done,
      total,
    }
  }

  const action = actionFor(next.reqCode)
  return {
    title: action?.customerTitle ?? next.title,
    detail: action?.help ?? next.description ?? "",
    // The checklist is where every item's real action lives — one place to act,
    // rather than a second half-copy of the same controls on the home page.
    href: "/portal/checklist",
    cta:
      action?.mode === "obtain"
        ? "See how to get it"
        : action?.mode === "generate"
          ? "Start it now"
          : action?.mode === "roster"
            ? "Invite them now"
            : "Take a look",
    waiting: false,
    done,
    total,
  }
}
