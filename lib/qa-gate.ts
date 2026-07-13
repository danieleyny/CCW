/**
 * V3-P2.4 — the CP-5 pre-filing QA gate. This is the mechanism by which the
 * product actually reduces denials, and the one thing we can honestly market:
 * a case CANNOT enter `application_assembled` or `filed` until every check
 * below passes and a named staff member has signed off.
 *
 * No `server-only` so the reminder engine and verify harness can evaluate it
 * with a service-role client. Enforcement lives in setCaseStage.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { requiredReferences } from "@/lib/intake/schema"
import type { WizardAnswers } from "@/lib/intake/answers"
import { readImageDimensions } from "@/lib/files/image-dimensions"
import { PHOTO_MIN_PX, PHOTO_MAX_PX, PHOTO_ASPECT_TOLERANCE } from "@/lib/files/photo-spec"

type DB = SupabaseClient<Database>

export const GATED_STAGES = ["application_assembled", "filed"] as const

export interface GateBlocker {
  kind:
    | "blocking_requirements"
    | "disclosure_narratives"
    | "training_missing"
    | "training_expired"
    | "references_short"
    | "photo_spec"
    | "sign_off_missing"
  detail: string
}

export interface GateResult {
  ok: boolean
  blockers: GateBlocker[]
  /** ok ignoring the sign-off — "ready for sign-off". */
  readyForSignOff: boolean
}

/** Evaluate every CP-5 check for a case. Read-only. */
export async function evaluatePreFilingGate(db: DB, caseId: string): Promise<GateResult> {
  const blockers: GateBlocker[] = []

  const [{ data: kase }, { data: reqs }, { data: disclosures }, { data: session }, { data: refs }, { data: photoDocs }] =
    await Promise.all([
      db
        .from("cases")
        .select("is_renewal, training_expires_on, qa_signed_off_by")
        .eq("id", caseId)
        .single(),
      db
        .from("case_requirements")
        .select("req_code, status, requirements!inner(blocking, title)")
        .eq("case_id", caseId),
      db.from("disclosures").select("id, type, narrative").eq("case_id", caseId),
      db.from("intake_sessions").select("answers").eq("case_id", caseId).maybeSingle(),
      db.from("character_references").select("id, notarized").eq("case_id", caseId),
      db
        .from("documents")
        .select("file_path, file_name, status")
        .eq("case_id", caseId)
        .eq("type", "applicant_photo")
        .neq("status", "rejected")
        .not("file_path", "is", null)
        .order("created_at", { ascending: false }),
    ])
  if (!kase) return { ok: false, blockers: [{ kind: "blocking_requirements", detail: "Case not found." }], readyForSignOff: false }

  // 1. Every BLOCKING requirement satisfied (advisory rows can never block).
  //    `pending` AND `rejected` both count as open — a rejected blocking doc is
  //    still a gap; only `satisfied` (and legitimately-inapplicable `na`) clears.
  const openBlocking = (reqs ?? []).filter((r) => {
    const req = r.requirements as unknown as { blocking: boolean; title: string } | null
    return req?.blocking && (r.status === "pending" || r.status === "rejected")
  })
  if (openBlocking.length > 0) {
    const codes = openBlocking.map((r) => r.req_code).sort()
    blockers.push({
      kind: "blocking_requirements",
      detail: `${openBlocking.length} blocking requirement(s) not satisfied: ${codes.slice(0, 8).join(", ")}${codes.length > 8 ? "…" : ""}`,
    })
  }

  // 2. Every disclosure carries a real narrative — candor is the requirement.
  const emptyNarratives = (disclosures ?? []).filter((d) => !d.narrative || d.narrative.trim().length < 20)
  if (emptyNarratives.length > 0) {
    blockers.push({
      kind: "disclosure_narratives",
      detail: `${emptyNarratives.length} disclosure(s) lack a substantive written explanation (min ~20 chars).`,
    })
  }

  // 3. Training current at submission (≤6 months old). Applies when the case
  //    has an applicable training requirement (TRN-01 or RNW-01 not N/A).
  const trainingApplicable = (reqs ?? []).some(
    (r) => ["TRN-01", "RNW-01"].includes(r.req_code) && r.status !== "na"
  )
  if (trainingApplicable) {
    if (!kase.training_expires_on) {
      blockers.push({
        kind: "training_missing",
        detail: "No training completion is recorded — the certificate must be dated within 6 months of submission.",
      })
    } else if (kase.training_expires_on < new Date().toISOString().slice(0, 10)) {
      blockers.push({
        kind: "training_expired",
        detail: `Training expired ${kase.training_expires_on} — it must be ≤6 months old at submission; a refresher is needed.`,
      })
    }
  }

  // 4. Track-aware reference count, notarization met (renewals need none).
  const answers = ((session?.answers ?? {}) as WizardAnswers) || {}
  const needed = requiredReferences(answers, { isRenewal: !!kase.is_renewal })
  const notarized = (refs ?? []).filter((r) => r.notarized).length
  if (notarized < needed) {
    blockers.push({
      kind: "references_short",
      detail: `${notarized}/${needed} notarized character references on file for this track.`,
    })
  }

  // 5. If IDN-04 (photo) applies and a photo is on file, it must independently
  //    meet the NYPD spec server-side — the browser validator can be bypassed
  //    (curl straight to storage), so we re-check the actual bytes here.
  const photoApplicable = (reqs ?? []).some((r) => r.req_code === "IDN-04" && r.status !== "na")
  const photo = (photoDocs ?? [])[0]
  if (photoApplicable && photo?.file_path) {
    const { data: blob } = await db.storage.from("documents").download(photo.file_path)
    if (blob) {
      const dims = readImageDimensions(new Uint8Array(await blob.arrayBuffer()))
      if (!dims) {
        blockers.push({
          kind: "photo_spec",
          detail: "The application photo isn't a readable JPG or PNG — re-upload a standard image.",
        })
      } else {
        const aspectOff = Math.abs(dims.width - dims.height) / Math.max(dims.width, dims.height)
        const side = Math.min(dims.width, dims.height)
        if (aspectOff > PHOTO_ASPECT_TOLERANCE) {
          blockers.push({
            kind: "photo_spec",
            detail: `The application photo must be square — it is ${dims.width}×${dims.height} (38 RCNY §5-05(b)(1)).`,
          })
        } else if (side < PHOTO_MIN_PX || Math.max(dims.width, dims.height) > PHOTO_MAX_PX) {
          blockers.push({
            kind: "photo_spec",
            detail: `The application photo must be ${PHOTO_MIN_PX}–${PHOTO_MAX_PX}px per side — it is ${dims.width}×${dims.height}.`,
          })
        }
      }
    }
  }

  const readyForSignOff = blockers.length === 0

  // 6. A named human signed off — recorded, auditable.
  if (!kase.qa_signed_off_by) {
    blockers.push({
      kind: "sign_off_missing",
      detail: "Pre-filing QA has not been signed off by a staff member.",
    })
  }

  return { ok: blockers.length === 0, blockers, readyForSignOff }
}
