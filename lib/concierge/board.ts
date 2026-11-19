import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { isNypdControlled, type CaseStageKey } from "@/config/stages"
import { buildQaQueue } from "@/lib/admin/queue"
import { loadPipeline, type PipelineCard } from "@/lib/admin/pipeline"
import { loadConciergeQueue } from "@/lib/concierge/queue"

type DB = SupabaseClient<Database>

export type ConciergeTab = "enrolled" | "leads" | "team"
export type ConciergeColumnKey =
  | "onboarding"
  | "training"
  | "gathering"
  | "qa"
  | "ready_to_file"
  | "nypd"
export type ConciergeMoveOwner = "Our move" | "Client" | "Third party" | "NYPD"

export interface ConciergeBoardCard {
  caseId: string
  clientName: string
  trackLabel: string
  agentId: string | null
  agentName: string | null
  agentInitials: string
  stage: CaseStageKey
  column: ConciergeColumnKey
  nextStep: string
  whoseMove: ConciergeMoveOwner
  days: number
  stalled: boolean
}

export interface ConciergeBoardColumn {
  key: ConciergeColumnKey
  label: string
  subtitle: string
  tone: "default" | "warm" | "agency"
  cards: ConciergeBoardCard[]
}

export interface ConciergeLeadRow {
  caseId: string
  clientName: string
  signal: string
  days: number
  path: string
  agentId: string | null
}

export interface ConciergeTeamMember {
  id: string
  name: string
  role: "admin" | "staff" | "instructor"
  isAgent: boolean
  clientCount: number
  ourMoveCount: number
}

export interface ConciergeBoardData {
  columns: ConciergeBoardColumn[]
  enrolled: ConciergeBoardCard[]
  leads: ConciergeLeadRow[]
  team: ConciergeTeamMember[]
  enrolledCount: number
  ourMoveCount: number
  waitingCount: number
  licensedThisMonth: number
  duplicatesHidden: number
  demoCount: number
  agentFilter: string
  currentUserId: string
  showHidden: boolean
}

const COLUMN_META: Array<Omit<ConciergeBoardColumn, "cards">> = [
  { key: "onboarding", label: "Onboarding", subtitle: "Agreements and intro call", tone: "default" },
  { key: "training", label: "Training", subtitle: "Class and range planning", tone: "default" },
  { key: "gathering", label: "Gathering", subtitle: "Documents, references, notary", tone: "default" },
  { key: "qa", label: "Assemble & QA", subtitle: "Final check and sign-off", tone: "default" },
  {
    key: "ready_to_file",
    label: "Ready to file",
    subtitle: "Applicant submits with our guidance",
    tone: "warm",
  },
  { key: "nypd", label: "With NYPD", subtitle: "Agency time", tone: "agency" },
]

const STAFF_SIGNAL_LABELS = new Set([
  "Invite them",
  "Intro call requested — schedule it",
  "Book the intro call",
  "All documents in — review for QA",
  "Ready for their review & filing",
])

function initials(name: string | null) {
  if (!name) return "—"
  return name
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("") || "—"
}

function columnFor(card: PipelineCard, qa?: { bucket: string; signedOff: boolean }): ConciergeColumnKey {
  if (card.stage === "filed" || isNypdControlled(card.stage)) return "nypd"
  if (qa?.signedOff) return "ready_to_file"
  if (card.stage === "application_assembled" || qa?.bucket === "ready") return "qa"
  if (card.stage === "document_collection" || card.stage === "notarization") return "gathering"
  if (card.stage === "training_scheduled" || card.stage === "training_complete") return "training"
  return "onboarding"
}

function ownerFor(card: PipelineCard, signal: string | null, qa?: { bucket: string; signedOff: boolean }): ConciergeMoveOwner {
  // A signed packet is ready for the applicant's own filing. Staff prepare and
  // guide; they do not submit to the NYPD on an applicant's behalf.
  if (qa?.signedOff && card.stage !== "filed") return "Client"
  if (qa?.bucket === "ready") return "Our move"
  if (signal && STAFF_SIGNAL_LABELS.has(signal)) return "Our move"
  if (card.whoseMove === "Staff") return "Our move"
  if (card.whoseMove === "Applicant" || card.whoseMove === "Licensed") return "Client"
  return card.whoseMove
}

function matchesAgent(card: { agentId: string | null }, filter: string, currentUserId: string) {
  if (!filter || filter === "anyone") return true
  if (filter === "me") return card.agentId === currentUserId
  if (filter === "unassigned") return card.agentId === null
  return card.agentId === filter
}

export const conciergeBoardModel = {
  columnFor,
  ownerFor,
  matchesAgent,
  columnMeta: COLUMN_META,
}

async function loadBoardCore(
  db: DB,
  { currentUserId, agentFilter = "anyone", showHidden = false, now = new Date() }: {
    currentUserId: string
    agentFilter?: string
    showHidden?: boolean
    now?: Date
  }
) {
  const monthStart = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)).toISOString().slice(0, 10)
  const [pipeline, queue, qaRows, teamResult, licensedResult, demoResult] = await Promise.all([
    loadPipeline(db, {
      view: "active",
      showHidden: true,
      filters: { track: "all", service: "all", assigned: "all", stalled: false, currentUserId },
      now,
    }),
    loadConciergeQueue(db),
    buildQaQueue(db, { showHidden: true, currentUserId }),
    db
      .from("profiles")
      .select("id, full_name, role, is_concierge_agent")
      .in("role", ["staff", "admin", "instructor"])
      .order("full_name"),
    db
      .from("cases")
      .select("id", { count: "exact", head: true })
      .eq("service_mode", "concierge")
      .eq("stage", "licensed")
      .gte("license_issued_on", monthStart),
    db.from("cases").select("id", { count: "exact", head: true }).eq("is_demo", true),
  ])

  if (teamResult.error) throw teamResult.error
  if (licensedResult.error) throw licensedResult.error
  if (demoResult.error) throw demoResult.error

  const queueByCase = new Map(queue.map((row) => [row.caseId, row]))
  const qaByCase = new Map(qaRows.map((row) => [row.caseId, row]))
  const conciergeCards = pipeline.allCards.filter((card) => card.serviceKey === "concierge")
  const visible = conciergeCards.filter((card) => !card.isDemo && (showHidden || !card.hiddenDuplicate))
  const duplicatesHidden = conciergeCards.filter((card) => !card.isDemo && card.hiddenDuplicate).length

  const enrolledAll = visible
    .filter((card) => card.classification === "active" && card.stage !== "licensed")
    .map((card): ConciergeBoardCard => {
      const queueRow = queueByCase.get(card.id)
      const qa = qaByCase.get(card.id)
      const column = columnFor(card, qa)
      const signal = queueRow?.tone === "attention" ? queueRow.label : null
      const whoseMove = ownerFor(card, signal, qa)
      const nextStep = qa?.signedOff && card.stage !== "filed"
        ? "Signed — ready for applicant filing"
        : qa?.bucket === "ready"
          ? "Ready to sign off"
          : signal ?? card.nextStep
      return {
        caseId: card.id,
        clientName: card.clientName,
        trackLabel: card.trackLabel,
        agentId: card.ownerId,
        agentName: card.ownerName,
        agentInitials: initials(card.ownerName),
        stage: card.stage,
        column,
        nextStep,
        whoseMove,
        days: card.days,
        stalled: card.stalled && whoseMove !== "Our move",
      }
    })

  const enrolled = enrolledAll.filter((card) => matchesAgent(card, agentFilter, currentUserId))
  const leads = visible
    .filter((card) => card.classification === "leads")
    .map((card): ConciergeLeadRow => ({
      caseId: card.id,
      clientName: card.clientName,
      signal: queueByCase.get(card.id)?.label ?? card.nextStep,
      days: card.days,
      path: card.trackLabel,
      agentId: card.ownerId,
    }))
    .filter((card) => matchesAgent(card, agentFilter, currentUserId))
    .sort((a, b) => b.days - a.days || a.clientName.localeCompare(b.clientName))

  return {
    enrolled,
    enrolledAll,
    leads,
    teamRows: teamResult.data ?? [],
    licensedThisMonth: licensedResult.count ?? 0,
    duplicatesHidden,
    demoCount: demoResult.count ?? 0,
  }
}

/** One board model shared by the page, team loads, and sidebar badge. */
export async function loadConciergeBoard(
  db: DB,
  options: { currentUserId: string; agentFilter?: string; showHidden?: boolean; now?: Date }
): Promise<ConciergeBoardData> {
  const core = await loadBoardCore(db, options)
  const ourMoveCount = core.enrolled.filter((card) => card.whoseMove === "Our move").length
  const loadByAgent = new Map<string, { clients: number; ourMove: number }>()
  for (const card of core.enrolledAll) {
    if (!card.agentId) continue
    const load = loadByAgent.get(card.agentId) ?? { clients: 0, ourMove: 0 }
    load.clients += 1
    if (card.whoseMove === "Our move") load.ourMove += 1
    loadByAgent.set(card.agentId, load)
  }

  const team: ConciergeTeamMember[] = core.teamRows.map((person) => {
    const load = loadByAgent.get(person.id) ?? { clients: 0, ourMove: 0 }
    return {
      id: person.id,
      name: person.full_name || "Staff member",
      role: person.role as ConciergeTeamMember["role"],
      isAgent: person.is_concierge_agent,
      clientCount: load.clients,
      ourMoveCount: load.ourMove,
    }
  })

  const sorted = [...core.enrolled].sort((a, b) => {
    if ((a.whoseMove === "Our move") !== (b.whoseMove === "Our move")) {
      return a.whoseMove === "Our move" ? -1 : 1
    }
    return b.days - a.days || a.clientName.localeCompare(b.clientName)
  })

  return {
    columns: COLUMN_META.map((column) => ({
      ...column,
      cards: sorted.filter((card) => card.column === column.key),
    })),
    enrolled: core.enrolled,
    leads: core.leads,
    team,
    enrolledCount: core.enrolled.length,
    ourMoveCount,
    waitingCount: core.enrolled.length - ourMoveCount,
    licensedThisMonth: core.licensedThisMonth,
    duplicatesHidden: core.duplicatesHidden,
    demoCount: core.demoCount,
    agentFilter: options.agentFilter ?? "anyone",
    currentUserId: options.currentUserId,
    showHidden: options.showHidden ?? false,
  }
}

/** Sidebar badge = paid, visible concierge clients whose next move belongs to staff. */
export async function conciergeAttentionCount(db: DB, currentUserId = ""): Promise<number> {
  // The badge renders on every admin page, so avoid the board's team, licensed,
  // and full QA-matrix queries. Pipeline already owns paid/hidden/duplicate and
  // ownership rules; the canonical concierge signal supplies onboarding moves.
  const [pipeline, queue] = await Promise.all([
    loadPipeline(db, {
      view: "active",
      showHidden: true,
      filters: { track: "all", service: "all", assigned: "all", stalled: false, currentUserId },
    }),
    loadConciergeQueue(db),
  ])
  const signals = new Map(queue.map((row) => [row.caseId, row]))
  return pipeline.allCards.filter((card) => {
    if (card.serviceKey !== "concierge" || card.classification !== "active" || card.stage === "licensed") return false
    if (card.isDemo || card.hiddenDuplicate || card.qaSignedOff) return false
    const row = signals.get(card.id)
    const signal = row?.tone === "attention" ? row.label : null
    return ownerFor(card, signal) === "Our move"
  }).length
}
