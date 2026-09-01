import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import type { WorksheetSection } from "@/lib/disclosures/worksheet-portal"
import type { PortalSlotView, HeldItem } from "@/lib/portal/application-tab"

type DB = SupabaseClient<Database>

/**
 * Three completion numbers computed in ONE pass so they can never disagree:
 *  · PORTAL    — everything needed to complete + submit the NYPD ONLINE application:
 *                the step 1–14 data fields, every STARRED upload slot accepted, and the
 *                signed answers + authorization record. The can-we-start/finalize number.
 *  · INTERVIEW — what the applicant still owes for the IN-PERSON visit: every
 *                interview-destination requirement not yet accepted.
 *  · OVERALL   — the UNION, deduplicated by item (never the sum — an item in both piles
 *                would inflate it).
 *
 * Counting rules (get these right or the numbers lie):
 *  · "submitted, awaiting our review" is NOT done — it's a third bar state, not progress.
 *  · status 'na' / a legitimately-blank optional field is excluded from BOTH numerator
 *    and denominator (same rule as the worksheet's red-glow states).
 *  · a rejected document counts as outstanding and carries its reason.
 */

export type CompletionState = "done" | "submitted" | "missing" | "rejected"

export interface OutstandingItem {
  key: string
  label: string
  state: Exclude<CompletionState, "done">
  note?: string
  /** Anchor within the Application tab (e.g. "step-13"), for a deep link. */
  anchor?: string
}

export interface Bucket {
  done: number
  submitted: number
  total: number
  outstanding: OutstandingItem[]
}

export interface CompletionMetrics {
  portal: Bucket
  interview: Bucket
  overall: { done: number; total: number; pct: number }
}

interface Item {
  key: string
  label: string
  state: CompletionState
  note?: string
  anchor?: string
}

const stateOfSlot = (s: PortalSlotView["state"]): CompletionState =>
  s === "accepted" ? "done" : s === "submitted" ? "submitted" : s === "rejected" ? "rejected" : "missing"

function bucketize(items: Item[]): Bucket {
  return {
    done: items.filter((i) => i.state === "done").length,
    submitted: items.filter((i) => i.state === "submitted").length,
    total: items.length,
    outstanding: items
      .filter((i) => i.state === "missing" || i.state === "rejected")
      .map((i) => ({ key: i.key, label: i.label, state: i.state as "missing" | "rejected", note: i.note, anchor: i.anchor })),
  }
}

export function computeCompletion(input: {
  sections: WorksheetSection[]
  slots: PortalSlotView[]
  held: HeldItem[]
  signedRecord: { reqCode: string; satisfied: boolean } | null
}): CompletionMetrics {
  const portalItems: Item[] = []

  // 1 — the step 1–14 data fields (skip uploads/checkpoint screens).
  for (const section of input.sections) {
    if (section.kind !== "fields" && section.kind !== "questions") continue
    section.fields.forEach((f, idx) => {
      if (f.notApplicable || f.atFiling) return // excluded from the denominator
      if (f.value) portalItems.push({ key: `f:${section.no}:${idx}`, label: f.label, state: "done" })
      else if (f.missing) portalItems.push({ key: `f:${section.no}:${idx}`, label: f.label, state: "missing", anchor: `step-${section.no}` })
      // else: an optional blank — excluded, same as the red-glow rule.
    })
  }

  // 2 — every STARRED upload slot (the catch-all is optional, excluded).
  for (const slot of input.slots) {
    if (!slot.starred || slot.isCatchAll || !slot.reqCode) continue
    const state = stateOfSlot(slot.state)
    portalItems.push({ key: `r:${slot.reqCode}`, label: slot.portalLabel, state, note: slot.rejectionNote ?? undefined, anchor: "step-13" })
  }

  // 3 — the signed answers + authorization record.
  if (input.signedRecord) {
    portalItems.push({
      key: `r:${input.signedRecord.reqCode}`,
      label: "Signed answers + authorization",
      state: input.signedRecord.satisfied ? "done" : "missing",
      anchor: "step-8",
    })
  }

  // INTERVIEW — the in-person deliverables.
  const interviewItems: Item[] = input.held.map((h) => ({
    key: `r:${h.reqCode}`,
    label: h.title,
    state: stateOfSlot(h.state),
    note: h.rejectionNote ?? undefined,
    anchor: "step-13",
  }))

  // OVERALL — union, deduplicated by key (the signed record can also be an interview
  // deliverable; it must count ONCE).
  const overallByKey = new Map<string, Item>()
  for (const it of [...portalItems, ...interviewItems]) {
    const prev = overallByKey.get(it.key)
    // Keep the more-complete of a duplicate so a done-in-one never reads as outstanding.
    if (!prev || (prev.state !== "done" && it.state === "done")) overallByKey.set(it.key, it)
  }
  const overallItems = [...overallByKey.values()]
  const overallDone = overallItems.filter((i) => i.state === "done").length
  const overallTotal = overallItems.length

  return {
    portal: bucketize(portalItems),
    interview: bucketize(interviewItems),
    overall: { done: overallDone, total: overallTotal, pct: overallTotal ? Math.round((overallDone / overallTotal) * 100) : 0 },
  }
}

/** Convenience: assemble the case and return only its completion metrics. */
export async function assembleCompletion(admin: DB, caseId: string): Promise<CompletionMetrics | null> {
  const { assembleApplicationTab } = await import("@/lib/portal/application-tab")
  const data = await assembleApplicationTab(admin, caseId)
  return data?.metrics ?? null
}
