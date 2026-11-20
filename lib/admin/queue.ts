import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { stageIndex, type CaseStageKey } from "@/config/stages"
import { APPLICATION_TYPE_LABELS, type ApplicationType } from "@/lib/application-types"
import { loadPipeline } from "@/lib/admin/pipeline"
import { evaluatePreFilingGate, type GateBlocker } from "@/lib/qa-gate"
import { requiredReferences } from "@/lib/intake/schema"
import type { WizardAnswers } from "@/lib/intake/answers"
import { referenceComposition } from "@/lib/references/composition"
import { readImageDimensions } from "@/lib/files/image-dimensions"

type DB = SupabaseClient<Database>

export type QueueBucket = "ready" | "near" | "waiting" | "signed" | "filed"
export type QueueOwner = "staff" | "applicant" | "third_party"
export type QueueCheckState = "pass" | "fail" | "watch" | "na"

export interface QueueCheck {
  number: number
  key: "checklist" | "disclosures" | "training" | "references" | "reference_mix" | "photo" | "track" | "signoff"
  label: string
  state: QueueCheckState
  evidence: string
  tooltip: string
}

export interface QueueThingLeft {
  owner: QueueOwner
  label: string
  titles: string[]
}

export interface QueueRow {
  caseId: string
  applicant: string
  initials: string
  stage: CaseStageKey
  bucket: QueueBucket
  blockers: GateBlocker[]
  /** Open blocking requirements + other distinct gate blockers — unchanged sort key. */
  distance: number
  signedOff: boolean
  signedOffBy: string | null
  signedOffAt: string | null
  trackLabel: string
  serviceMode: "concierge" | "self_guided" | null
  serviceLabel: string
  ownerName: string | null
  checks: QueueCheck[]
  thingsLeft: QueueThingLeft[]
  firstStaffRequirementId: string | null
  isDemo: boolean
  hiddenDuplicate: boolean
}

const PREFILE_MIN = stageIndex("training_complete")
const FILED = stageIndex("filed")
const APP_ASSEMBLED = stageIndex("application_assembled")
const DECISION = stageIndex("decision")

function initials(name: string) {
  return name.trim().split(/\s+/).slice(0, 2).map((part) => part[0]?.toUpperCase() ?? "").join("") || "A"
}

function dateLabel(value: string | null) {
  if (!value) return null
  return new Date(`${value}T12:00:00`).toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })
}

function daysUntil(value: string) {
  const target = new Date(`${value}T12:00:00`)
  return Math.ceil((target.getTime() - Date.now()) / 86_400_000)
}

function blockerOf(blockers: GateBlocker[], ...kinds: GateBlocker["kind"][]) {
  return blockers.find((blocker) => kinds.includes(blocker.kind))
}

interface RawRequirement {
  id: string
  case_id: string
  status: string
  document_id: string | null
  reference_id: string | null
  cohabitant_id: string | null
  req_code: string
  requirements: unknown
}

interface RawDocument {
  id: string
  case_id: string
  req_code: string | null
  status: string
  type: string
  file_path: string | null
  file_name: string | null
  created_at: string
}

function requirementInfo(row: RawRequirement) {
  return row.requirements as { title: string; blocking: boolean } | null
}

function serviceLabel(mode: QueueRow["serviceMode"]) {
  if (mode === "concierge") return "Full Concierge"
  if (mode === "self_guided") return "Self-Guided"
  return "No package"
}

function applicationLabel(type: ApplicationType | null, fallback: string) {
  return type ? APPLICATION_TYPE_LABELS[type].toUpperCase() : fallback
}

/**
 * Read-only projection of the real CP-5 gate. Gate evaluation and distance math
 * remain in their existing sources; this loader only adds evidence and plain
 * language for the filing desk.
 */
export async function buildQaQueue(db: DB, options?: { showHidden?: boolean; currentUserId?: string }): Promise<QueueRow[]> {
  const showHidden = options?.showHidden ?? false
  const pipeline = await loadPipeline(db, {
    view: "active",
    showHidden: true,
    filters: { track: "all", service: "all", assigned: "all", stalled: false, currentUserId: options?.currentUserId ?? "" },
  })
  const paidCards = new Map(pipeline.allCards.filter((card) => card.classification === "active").map((card) => [card.id, card]))

  const caseResult = await db
    .from("cases")
    .select("id, stage, status, application_type, license_track, service_mode, is_renewal, training_completed_on, training_expires_on, qa_signed_off_by, qa_signed_off_at, clients!inner(full_name)")
    .eq("status", "active")
    .neq("stage", "lead")
  if (caseResult.error) throw caseResult.error

  const cases = (caseResult.data ?? []).filter((kase) => paidCards.has(kase.id))
  const ids = cases.map((kase) => kase.id)
  if (ids.length === 0) return []

  const [requirementsResult, disclosuresResult, referencesResult, intakeResult, documentsResult] = await Promise.all([
    db.from("case_requirements").select("id, case_id, status, document_id, reference_id, cohabitant_id, req_code, requirements!inner(title, blocking)").in("case_id", ids),
    db.from("disclosures").select("id, case_id, narrative").in("case_id", ids),
    db.from("character_references").select("id, case_id, notarized, is_family").in("case_id", ids),
    db.from("intake_sessions").select("case_id, answers").in("case_id", ids),
    db.from("documents").select("id, case_id, req_code, status, type, file_path, file_name, created_at").in("case_id", ids).order("created_at", { ascending: false }),
  ])
  for (const [label, result] of [
    ["Queue requirements", requirementsResult],
    ["Queue disclosures", disclosuresResult],
    ["Queue references", referencesResult],
    ["Queue intake", intakeResult],
    ["Queue documents", documentsResult],
  ] as const) {
    if (result.error) throw new Error(`${label}: ${result.error.message}`)
  }

  const requirementsByCase = new Map<string, RawRequirement[]>()
  for (const requirement of (requirementsResult.data ?? []) as RawRequirement[]) {
    requirementsByCase.set(requirement.case_id, [...(requirementsByCase.get(requirement.case_id) ?? []), requirement])
  }
  const disclosuresByCase = new Map<string, Array<{ narrative: string }>>()
  for (const disclosure of disclosuresResult.data ?? []) {
    disclosuresByCase.set(disclosure.case_id, [...(disclosuresByCase.get(disclosure.case_id) ?? []), disclosure])
  }
  const referencesByCase = new Map<string, Array<{ notarized: boolean; is_family: boolean }>>()
  for (const reference of referencesResult.data ?? []) {
    referencesByCase.set(reference.case_id, [...(referencesByCase.get(reference.case_id) ?? []), reference])
  }
  const intakeByCase = new Map((intakeResult.data ?? []).map((intake) => [intake.case_id, (intake.answers ?? {}) as WizardAnswers]))
  const documentsByCase = new Map<string, RawDocument[]>()
  for (const document of (documentsResult.data ?? []) as RawDocument[]) {
    documentsByCase.set(document.case_id, [...(documentsByCase.get(document.case_id) ?? []), document])
  }

  const staffNames = new Map(pipeline.staff.map((staff) => [staff.id, staff.name]))
  const rows = await Promise.all(cases.map(async (kase): Promise<QueueRow | null> => {
    const stage = kase.stage as CaseStageKey
    const index = stageIndex(stage)
    if (index >= DECISION || index < PREFILE_MIN) return null

    const card = paidCards.get(kase.id)!
    if (!showHidden && (card.isDemo || card.hiddenDuplicate)) return null
    const applicant = ((kase.clients as unknown as { full_name: string } | null)?.full_name || "Applicant").trim()
    const signedOff = !!kase.qa_signed_off_by
    const requirements = requirementsByCase.get(kase.id) ?? []
    const documents = documentsByCase.get(kase.id) ?? []
    const refs = referencesByCase.get(kase.id) ?? []
    const disclosures = disclosuresByCase.get(kase.id) ?? []
    const openBlocking = requirements.filter((item) => {
      const info = requirementInfo(item)
      return info?.blocking && (item.status === "pending" || item.status === "rejected")
    })
    const blockingTotal = requirements.filter((item) => requirementInfo(item)?.blocking && item.status !== "na").length

    if (index >= FILED) {
      return {
        caseId: kase.id, applicant, initials: initials(applicant), stage, bucket: "filed", blockers: [], distance: 0,
        signedOff, signedOffBy: kase.qa_signed_off_by ? staffNames.get(kase.qa_signed_off_by) ?? "Staff member" : null,
        signedOffAt: kase.qa_signed_off_at, trackLabel: card.trackLabel, serviceMode: kase.service_mode,
        serviceLabel: serviceLabel(kase.service_mode), ownerName: card.ownerName, checks: [], thingsLeft: [],
        firstStaffRequirementId: null, isDemo: card.isDemo, hiddenDuplicate: card.hiddenDuplicate,
      }
    }

    const gate = await evaluatePreFilingGate(db, kase.id)
    const blockers = gate.blockers.filter((blocker) => blocker.kind !== "sign_off_missing")
    const otherBlockers = blockers.filter((blocker) => blocker.kind !== "blocking_requirements").length
    const distance = openBlocking.length + otherBlockers
    const bucket: QueueBucket = signedOff && index < APP_ASSEMBLED
      ? "signed"
      : gate.readyForSignOff && !signedOff
        ? "ready"
        : distance <= 3
          ? "near"
          : "waiting"

    const answered = intakeByCase.get(kase.id) ?? {}
    const neededReferences = requiredReferences(answered, {
      isRenewal: kase.is_renewal,
      licenseTrack: kase.license_track,
      applicationType: kase.application_type as ApplicationType | null,
    })
    const notarized = refs.filter((reference) => reference.notarized).length
    const composition = referenceComposition(refs, neededReferences)
    const trainingApplicable = requirements.some((item) => ["TRN-01", "RNW-01"].includes(item.req_code) && item.status !== "na")
    const photoApplicable = requirements.some((item) => item.req_code === "PHO-01" && item.status !== "na")
    const latestPhoto = documents.find((document) => document.type === "applicant_photo" && document.status !== "rejected" && document.file_path)
    let photoEvidence = photoApplicable ? "No photo recorded" : "Not required"
    if (photoApplicable && latestPhoto?.file_path) {
      const { data: blob } = await db.storage.from("documents").download(latestPhoto.file_path)
      if (blob) {
        const dims = readImageDimensions(new Uint8Array(await blob.arrayBuffer()))
        if (dims) photoEvidence = `${dims.width}×${dims.height} ${dims.format === "jpeg" ? "JPG" : "PNG"}`
        else photoEvidence = latestPhoto.file_name ?? "Unreadable image"
      }
    }

    const checklistBlocker = blockerOf(blockers, "blocking_requirements")
    const disclosureBlocker = blockerOf(blockers, "disclosure_narratives")
    const trainingBlocker = blockerOf(blockers, "training_missing", "training_expired")
    const referenceBlocker = blockerOf(blockers, "references_short")
    const compositionBlocker = blockerOf(blockers, "references_composition")
    const photoBlocker = blockerOf(blockers, "photo_spec")
    const trackBlocker = blockerOf(blockers, "track_unresolved")
    const trainingWatch = !!kase.training_expires_on && daysUntil(kase.training_expires_on) >= 0 && daysUntil(kase.training_expires_on) <= 30
    const checks: QueueCheck[] = [
      { number: 1, key: "checklist", label: "Checklist items", state: checklistBlocker ? "fail" : "pass", evidence: checklistBlocker ? `${openBlocking.length} item${openBlocking.length === 1 ? "" : "s"} open` : `All ${blockingTotal} checklist items accepted`, tooltip: openBlocking.map((item) => requirementInfo(item)?.title).filter(Boolean).join(", ") || "Every blocking checklist item is accepted." },
      { number: 2, key: "disclosures", label: "Disclosures", state: disclosureBlocker ? "fail" : "pass", evidence: disclosures.length ? `${disclosures.length} disclosure${disclosures.length === 1 ? "" : "s"}, all explained` : "No disclosures", tooltip: disclosureBlocker?.detail ?? "Every disclosure has a substantive explanation." },
      { number: 3, key: "training", label: "Training", state: !trainingApplicable ? "na" : trainingBlocker ? "fail" : trainingWatch ? "watch" : "pass", evidence: !trainingApplicable ? "Not required" : trainingBlocker ? trainingBlocker.kind === "training_expired" ? "Expired — refresher needed" : "Certificate not recorded" : trainingWatch ? `Valid · expires ${dateLabel(kase.training_expires_on)}` : `Certificate ${dateLabel(kase.training_completed_on) ?? "recorded"} · valid to ${dateLabel(kase.training_expires_on)}`, tooltip: trainingBlocker?.detail ?? (trainingWatch ? "Passes now, but file before the certificate expires." : "Training is current for filing.") },
      { number: 4, key: "references", label: "References", state: referenceBlocker ? "fail" : neededReferences === 0 ? "na" : "pass", evidence: neededReferences === 0 ? "Not required" : `${notarized} of ${neededReferences} notarized`, tooltip: referenceBlocker?.detail ?? "The track-aware notarized reference count is met." },
      { number: 5, key: "reference_mix", label: "Reference mix", state: compositionBlocker ? "fail" : neededReferences === 0 ? "na" : "pass", evidence: neededReferences === 0 ? "Not required" : `${composition.familyCount} family · ${composition.nonFamilyCount} non-family`, tooltip: compositionBlocker?.detail ?? "The family and non-family mix is valid." },
      { number: 6, key: "photo", label: "Photo", state: !photoApplicable ? "na" : photoBlocker || !latestPhoto ? "fail" : "pass", evidence: photoEvidence, tooltip: photoBlocker?.detail ?? (latestPhoto ? "The photo passes the mechanical file check." : "No application photo is attached.") },
      { number: 7, key: "track", label: "Track", state: trackBlocker ? "fail" : "pass", evidence: trackBlocker ? "License category unresolved" : `${applicationLabel(kase.application_type as ApplicationType | null, card.trackLabel)} confirmed`, tooltip: trackBlocker?.detail ?? "The license category is confirmed." },
      { number: 8, key: "signoff", label: "Named sign-off", state: signedOff ? "pass" : bucket === "ready" ? "watch" : "na", evidence: signedOff ? `Signed by ${staffNames.get(kase.qa_signed_off_by!) ?? "Staff member"} · ${dateLabel(kase.qa_signed_off_at?.slice(0, 10) ?? null)}` : bucket === "ready" ? "Waiting for a staff member" : "Available after checks 1–7", tooltip: signedOff ? "The named sign-off is recorded in the case activity." : "A staff member signs only after all seven checks pass." },
    ]

    const pendingDocumentCodes = new Set(documents.filter((document) => document.status === "pending" && document.req_code).map((document) => document.req_code!))
    const requirementGroups: Record<QueueOwner, RawRequirement[]> = { staff: [], applicant: [], third_party: [] }
    for (const requirement of openBlocking) {
      const owner: QueueOwner = requirement.reference_id || requirement.cohabitant_id
        ? "third_party"
        : requirement.document_id || pendingDocumentCodes.has(requirement.req_code)
          ? "staff"
          : "applicant"
      requirementGroups[owner].push(requirement)
    }
    const thingsLeft: QueueThingLeft[] = []
    const addRequirementGroup = (owner: QueueOwner, singular: string, plural: string) => {
      const group = requirementGroups[owner]
      if (group.length) thingsLeft.push({ owner, label: group.length === 1 ? singular : plural.replace("{n}", String(group.length)), titles: group.map((item) => requirementInfo(item)?.title).filter((title): title is string => !!title) })
    }
    addRequirementGroup("staff", "1 document to review", "{n} documents to review")
    addRequirementGroup("applicant", "1 item to send", "{n} items to send")
    addRequirementGroup("third_party", "1 third-party item", "{n} third-party items")
    if (disclosureBlocker) thingsLeft.push({ owner: "applicant", label: disclosureBlocker.detail.replace(/ lack.*$/, " need an explanation"), titles: ["Disclosure explanations"] })
    if (trainingBlocker) thingsLeft.push({ owner: "applicant", label: trainingBlocker.kind === "training_expired" ? "Training older than 6 months — refresher needed" : "Training certificate not recorded", titles: ["Current training certificate"] })
    if (referenceBlocker) thingsLeft.push({ owner: "third_party", label: `${Math.max(0, neededReferences - notarized)} more notarized reference(s) (${notarized}/${neededReferences})`, titles: ["Notarized character references"] })
    if (compositionBlocker) thingsLeft.push({ owner: "applicant", label: `Swap a family reference — ${compositionBlocker.detail}`, titles: ["Reference composition"] })
    if (photoBlocker) thingsLeft.push({ owner: "applicant", label: `Photo isn't to spec — ${photoBlocker.detail}`, titles: ["Application photo"] })
    if (trackBlocker) thingsLeft.push({ owner: "staff", label: "Confirm the license category", titles: ["License category"] })

    return {
      caseId: kase.id, applicant, initials: initials(applicant), stage, bucket, blockers, distance, signedOff,
      signedOffBy: kase.qa_signed_off_by ? staffNames.get(kase.qa_signed_off_by) ?? "Staff member" : null,
      signedOffAt: kase.qa_signed_off_at, trackLabel: card.trackLabel, serviceMode: kase.service_mode,
      serviceLabel: serviceLabel(kase.service_mode), ownerName: card.ownerName, checks, thingsLeft,
      firstStaffRequirementId: requirementGroups.staff[0]?.id ?? null,
      isDemo: card.isDemo, hiddenDuplicate: card.hiddenDuplicate,
    }
  }))

  return rows.filter((row): row is QueueRow => row !== null)
}

/** Sort within a bucket: closest to filing first, then staff-owned, then name. */
export function sortQueue(rows: QueueRow[]): QueueRow[] {
  return [...rows].sort((a, b) => {
    if (a.distance !== b.distance) return a.distance - b.distance
    const aStaff = a.thingsLeft.some((thing) => thing.owner === "staff")
    const bStaff = b.thingsLeft.some((thing) => thing.owner === "staff")
    if (aStaff !== bStaff) return aStaff ? -1 : 1
    return a.applicant.localeCompare(b.applicant)
  })
}
