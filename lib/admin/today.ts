import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { buildQaQueue } from "@/lib/admin/queue"
import { loadConciergeQueue } from "@/lib/concierge/queue"
import { isNypdControlled, type CaseStageKey } from "@/config/stages"
import { addAdminBusinessDays, adminDayKey } from "@/lib/admin/business-time"
import { loadInbox } from "@/lib/admin/inbox"
import type { InboxData } from "@/lib/admin/inbox-model"
import { loadCalendar, type CalendarData } from "@/lib/admin/calendar"
import { ruleReviewCounts, type RuleReviewCounts } from "@/lib/admin/rule-review"
export { deriveCaseOwnership } from "@/lib/admin/ownership"
export type { CaseMoveOwner } from "@/lib/admin/ownership"
import { deriveCaseOwnership } from "@/lib/admin/ownership"
import {
  DOCUMENT_REVIEW_BUSINESS_DAYS,
  PAYMENT_FOLLOWUP_DAYS,
  REFERENCE_EXPIRY_WARN_DAYS,
  STALLED_DAYS,
} from "@/config/service-targets"

type DB = SupabaseClient<Database>

/**
 * "Waiting on others" includes active cases with no staff-owned Today item in
 * the selected scope. NYPD-controlled cases belong to NYPD; cases with open
 * reference/cohabitant outreach or an instructor booking request belong to a
 * third party; all remaining waiting cases belong to the applicant.
 */

export type TodayScope = "mine" | "team" | "unassigned"
export type TodayItemType = "message" | "document" | "qa" | "concierge" | "people" | "payment" | "stalled" | "task" | "privacy"
export type TodaySection = "overdue" | "today" | "week"
export type TodayOwner = "You" | "Team" | "Applicant" | "Third party" | "NYPD"

export interface TodayItem {
  id: string
  caseId: string | null
  type: TodayItemType
  section: TodaySection
  title: string
  reason: string
  clientName: string
  track: string
  owner: TodayOwner
  unassigned: boolean
  assignedStaff: string | null
  age: string
  ageDays: number
  triggerAt: string
  dueAt: string
  href: string
  action: string
}

export interface TodayScheduleItem {
  id: string
  caseId: string
  when: string
  title: string
  detail: string
  owner: "You" | "NYPD milestone" | "Instructor"
}

export interface TodayWaiting {
  nypd: { count: number; detail: string; href: string }
  thirdParty: { count: number; detail: string; href: string }
  applicant: { count: number; detail: string; href: string }
}

export interface TodayHealthItem {
  key: "message" | "document" | "stalled" | "legal"
  label: string
  value: string
  pastTarget: boolean
  available: boolean
}

export interface TodayData {
  items: TodayItem[]
  schedule: TodayScheduleItem[]
  waiting: TodayWaiting
  health: TodayHealthItem[]
  errors: string[]
  unassignedCount: number
  inboxNeedsReplyCount: number
  asOf: string
}

interface CaseContext {
  id: string
  stage: CaseStageKey
  status: string
  stageEnteredAt: string
  updatedAt: string
  clientId: string
  clientName: string
  track: string
  assignedStaff: string | null
}

const DAY = 86_400_000
function dayKey(value: Date) {
  return adminDayKey(value)
}

function addBusinessDays(value: Date, count: number) {
  return addAdminBusinessDays(value, count)
}

function sectionFor(due: Date, now: Date): TodaySection | null {
  const dueKey = dayKey(due)
  const nowKey = dayKey(now)
  if (dueKey < nowKey) return "overdue"
  if (dueKey === nowKey) return "today"
  return due.getTime() <= now.getTime() + 7 * DAY ? "week" : null
}

function daysBetween(from: string | Date, to: Date) {
  return Math.max(0, Math.floor((to.getTime() - new Date(from).getTime()) / DAY))
}

function ageText(from: string, now: Date, suffix?: string) {
  const ms = Math.max(0, now.getTime() - new Date(from).getTime())
  const minutes = Math.floor(ms / 60_000)
  if (minutes < 60) return `${Math.max(1, minutes)} min${suffix ? ` ${suffix}` : ""}`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"}${suffix ? ` ${suffix}` : ""}`
  const days = Math.floor(hours / 24)
  return `${days} day${days === 1 ? "" : "s"}${suffix ? ` ${suffix}` : ""}`
}

function trackLabel(value: string) {
  const labels: Record<string, string> = {
    premise_residence: "PREMISE RESIDENCE",
    concealed_carry: "CONCEALED CARRY",
    special_carry: "SPECIAL CARRY",
    carry: "CONCEALED CARRY",
    premises: "PREMISE RESIDENCE",
  }
  return labels[value] ?? value.replaceAll("_", " ").toUpperCase()
}

function inScope(item: TodayItem, scope: TodayScope, userId: string) {
  if (scope === "team") return true
  if (scope === "unassigned") return item.unassigned
  if (item.type === "privacy") return true
  return item.assignedStaff === userId || (item.unassigned && item.section === "overdue") || (item.type === "task" && item.owner === "You")
}

function ownerFor(c: CaseContext, userId: string): TodayOwner {
  return c.assignedStaff === userId ? "You" : "Team"
}

function caseItem(input: Omit<TodayItem, "clientName" | "track" | "assignedStaff" | "unassigned">, c: CaseContext): TodayItem {
  return { ...input, clientName: c.clientName, track: c.track, assignedStaff: c.assignedStaff, unassigned: !c.assignedStaff }
}

function sortItems(items: TodayItem[]) {
  const sectionOrder: Record<TodaySection, number> = { overdue: 0, today: 1, week: 2 }
  const tieOrder: Record<TodayItemType, number> = { qa: 0, message: 1, document: 2, concierge: 3, people: 4, payment: 5, stalled: 6, task: 7, privacy: 8 }
  return items.sort((a, b) => sectionOrder[a.section] - sectionOrder[b.section] || a.triggerAt.localeCompare(b.triggerAt) || tieOrder[a.type] - tieOrder[b.type])
}

export async function loadToday(
  db: DB,
  { userId, role, scope = "mine", now = new Date() }: { userId: string; role: string; scope?: TodayScope; now?: Date }
): Promise<TodayData> {
  const casesResult = await db
    .from("cases")
    .select("id, client_id, stage, status, stage_entered_at, updated_at, license_track, clients!inner(full_name, assigned_staff, track)")

  if (casesResult.error) throw casesResult.error

  const cases = new Map<string, CaseContext>()
  for (const raw of casesResult.data ?? []) {
    const client = raw.clients as unknown as { full_name: string; assigned_staff: string | null; track: string }
    cases.set(raw.id, {
      id: raw.id,
      stage: raw.stage as CaseStageKey,
      status: raw.status,
      stageEnteredAt: raw.stage_entered_at,
      updatedAt: raw.updated_at,
      clientId: raw.client_id,
      clientName: client.full_name,
      track: trackLabel(raw.license_track ?? client.track),
      assignedStaff: client.assigned_staff,
    })
  }

  const startKey = dayKey(now)
  const sourceNames = ["Messages", "Documents", "Final QA", "Concierge", "Tasks", "People", "Payments", "Privacy", "Schedule", "Rule review"] as const
  const settled = await Promise.allSettled([
    loadInbox(db, { userId, scope, showHidden: false, now }),
    db.from("documents").select("id, case_id, created_at").eq("status", "pending").order("created_at", { ascending: true }),
    buildQaQueue(db),
    loadConciergeQueue(db),
    db.from("tasks").select("id, case_id, assignee, created_at, due_date, title, description, status").eq("status", "open"),
    Promise.all([
      db.from("reference_requests").select("id, case_id, expires_at, created_at, status, answered_at, revoked_at").in("status", ["sent", "opened"]),
      db.from("cohabitants").select("id, case_id, token_expires_at, created_at, affidavit_status, answered_at, token_revoked_at").eq("affidavit_status", "not_started").not("sent_at", "is", null),
    ]),
    db.from("payments").select("id, case_id, client_id, created_at, status").eq("status", "pending"),
    role === "admin" ? db.from("data_requests").select("id, case_id, client_id, requested_at, kind, status").in("status", ["open", "acknowledged"]) : Promise.resolve({ data: [], error: null }),
    loadCalendar(db, {
      from: startKey,
      to: startKey,
      scope: scope === "mine" ? "mine" : "team",
      types: [],
      host: "anyone",
      currentUserId: userId,
      now,
    }),
    role === "admin" ? ruleReviewCounts(db, now) : Promise.resolve({ attention: 0 }),
  ])

  const errors: string[] = []
  settled.forEach((result, index) => {
    if (result.status === "rejected") errors.push(sourceNames[index])
    else {
      const value = result.value as { error?: unknown } | [{ error?: unknown }, { error?: unknown }]
      const errored = Array.isArray(value) ? value.some((part) => part.error) : !!value?.error
      if (errored) errors.push(sourceNames[index])
    }
  })

  const ok = <T>(index: number): T | null => {
    const result = settled[index]
    if (result.status !== "fulfilled" || errors.includes(sourceNames[index])) return null
    return result.value as T
  }

  const allItems: TodayItem[] = []

  const inbox = ok<InboxData>(0)
  const messageThreads = (inbox?.threads ?? []).filter((thread) => thread.needsReply && thread.waitingSince && thread.dueAt)
  for (const thread of messageThreads) {
    const c = cases.get(thread.caseId)
    if (!c) continue
    const due = new Date(thread.dueAt!)
    const section = sectionFor(due, now)
    if (!section) continue
    allItems.push(caseItem({
      id: `message-${thread.caseId}`, caseId: thread.caseId, type: "message", section,
      title: `Reply to ${c.clientName}`, reason: `“${thread.firstUnansweredBody ?? thread.lastBody}”`, owner: ownerFor(c, userId),
      age: ageText(thread.waitingSince!, now, "unanswered"), ageDays: daysBetween(thread.waitingSince!, now), triggerAt: thread.waitingSince!,
      dueAt: due.toISOString(), href: `/admin/inbox?tab=needs&scope=${scope}&thread=${thread.caseId}`, action: "Reply",
    }, c))
  }

  const documents = ok<{ data: Array<{ id: string; case_id: string; created_at: string }> }>(1)?.data ?? []
  const docsByCase = new Map<string, typeof documents>()
  for (const document of documents) {
    const rows = docsByCase.get(document.case_id) ?? []
    rows.push(document)
    docsByCase.set(document.case_id, rows)
  }
  for (const [caseId, rows] of docsByCase) {
    const c = cases.get(caseId)
    if (!c) continue
    const due = addBusinessDays(new Date(rows[0].created_at), DOCUMENT_REVIEW_BUSINESS_DAYS)
    const section = sectionFor(due, now)
    if (!section) continue
    allItems.push(caseItem({
      id: `document-${caseId}`, caseId, type: "document", section,
      title: `Review ${rows.length} document${rows.length === 1 ? "" : "s"} — ${c.clientName}`,
      reason: "Files are uploaded and awaiting staff review.", owner: ownerFor(c, userId),
      age: ageText(rows[0].created_at, now), ageDays: daysBetween(rows[0].created_at, now), triggerAt: rows[0].created_at,
      dueAt: due.toISOString(), href: `/admin/cases/${caseId}?tab=documents`, action: "Review",
    }, c))
  }

  const qaRows = ok<Awaited<ReturnType<typeof buildQaQueue>>>(2) ?? []
  for (const row of qaRows.filter((entry) => entry.bucket === "ready" || entry.bucket === "signed")) {
    const c = cases.get(row.caseId)
    if (!c) continue
    allItems.push(caseItem({
      id: `qa-${row.caseId}`, caseId: row.caseId, type: "qa", section: "today",
      title: row.bucket === "ready" ? `Final QA — ${c.clientName}` : `Open signed case — ${c.clientName}`,
      reason: row.bucket === "ready" ? "The real pre-filing gate is ready for staff review and sign-off." : "QA is signed; the case is ready for the next filing step.",
      owner: ownerFor(c, userId), age: "Due today", ageDays: 0, triggerAt: c.updatedAt, dueAt: now.toISOString(),
      href: `/admin/queue?bucket=${row.bucket}#case-${row.caseId}`, action: row.bucket === "ready" ? "Review & sign" : "Open",
    }, c))
  }

  const conciergeRows = ok<Awaited<ReturnType<typeof loadConciergeQueue>>>(3) ?? []
  const staffConcierge = new Set(["Invite them", "Intro call requested — schedule it", "Book the intro call", "All documents in — review for QA", "Ready for their review & filing"])
  for (const row of conciergeRows.filter((entry) => entry.tone === "attention")) {
    const c = cases.get(row.caseId)
    if (!c) continue
    const staffOwned = staffConcierge.has(row.label)
    allItems.push(caseItem({
      id: `concierge-${row.caseId}`, caseId: row.caseId, type: "concierge", section: staffOwned ? "today" : "week",
      title: `${row.label} — ${c.clientName}`, reason: staffOwned ? "This concierge step needs a staff member." : "This step is waiting on the applicant.",
      owner: staffOwned ? ownerFor(c, userId) : "Applicant", age: staffOwned ? "Due today" : "This week", ageDays: daysBetween(c.updatedAt, now),
      triggerAt: c.updatedAt, dueAt: staffOwned ? now.toISOString() : new Date(now.getTime() + 7 * DAY).toISOString(),
      href: `/admin/cases/${row.caseId}`, action: row.label.includes("schedule") ? "Schedule" : "Open case",
    }, c))
  }

  for (const c of cases.values()) {
    if (c.status !== "active" || isNypdControlled(c.stage)) continue
    const ageDays = daysBetween(c.stageEnteredAt, now)
    if (ageDays <= STALLED_DAYS) continue
    allItems.push(caseItem({
      id: `stalled-${c.id}`, caseId: c.id, type: "stalled", section: "overdue",
      title: `Move ${c.clientName}'s case forward`, reason: `No stage movement past the ${STALLED_DAYS}-day service target.`,
      owner: ownerFor(c, userId), age: `${ageDays} days in stage`, ageDays, triggerAt: c.stageEnteredAt,
      dueAt: new Date(new Date(c.stageEnteredAt).getTime() + STALLED_DAYS * DAY).toISOString(), href: `/admin/cases/${c.id}`, action: "Open case",
    }, c))
  }

  const tasks = ok<{ data: Array<{ id: string; case_id: string | null; assignee: string | null; created_at: string; due_date: string | null; title: string; description: string | null }> }>(4)?.data ?? []
  for (const task of tasks) {
    const c = task.case_id ? cases.get(task.case_id) : null
    const due = task.due_date ? new Date(`${task.due_date}T12:00:00-05:00`) : new Date(now.getTime() + 7 * DAY)
    const section = task.due_date ? sectionFor(due, now) : "week"
    if (!section) continue
    const assignedStaff = task.assignee ?? c?.assignedStaff ?? null
    allItems.push({
      id: `task-${task.id}`, caseId: task.case_id, type: "task", section,
      title: task.title, reason: task.description ?? "Open staff task.", clientName: c?.clientName ?? "General",
      track: c?.track ?? "OPERATIONS", owner: assignedStaff === userId ? "You" : "Team", unassigned: !assignedStaff,
      assignedStaff, age: task.due_date ? (section === "overdue" ? `${daysBetween(due, now)} days overdue` : section === "today" ? "Due today" : "Due this week") : "This week",
      ageDays: daysBetween(task.created_at, now), triggerAt: task.created_at, dueAt: due.toISOString(),
      href: task.case_id ? `/admin/cases/${task.case_id}?tab=tasks` : "/admin", action: "Open task",
    })
  }

  const people = ok<[{ data: Array<{ id: string; case_id: string; expires_at: string; created_at: string }> }, { data: Array<{ id: string; case_id: string; token_expires_at: string | null; created_at: string }> }]>(5)
  const peopleRows = [
    ...(people?.[0].data ?? []).map((row) => ({ ...row, expiresAt: row.expires_at })),
    ...(people?.[1].data ?? []).filter((row) => row.token_expires_at).map((row) => ({ ...row, expiresAt: row.token_expires_at as string })),
  ]
  const peopleByCase = new Map<string, typeof peopleRows>()
  for (const row of peopleRows) {
    const rows = peopleByCase.get(row.case_id) ?? []
    rows.push(row)
    peopleByCase.set(row.case_id, rows)
  }
  for (const [caseId, rows] of peopleByCase) {
    rows.sort((a, b) => a.expiresAt.localeCompare(b.expiresAt))
    const row = rows[0]
    const c = cases.get(caseId)
    if (!c) continue
    const expires = new Date(row.expiresAt)
    if (expires.getTime() > now.getTime() + 7 * DAY) continue
    const due = new Date(expires.getTime() - REFERENCE_EXPIRY_WARN_DAYS * DAY)
    const section = sectionFor(due, now) ?? "week"
    const daysLeft = Math.max(0, Math.ceil((expires.getTime() - now.getTime()) / DAY))
    allItems.push(caseItem({
      id: `people-${caseId}`, caseId, type: "people", section,
      title: `Follow up on ${rows.length} ${rows.length === 1 ? "person" : "people"} — ${c.clientName}`, reason: "Reference or household links are nearing expiration.", owner: "Third party",
      age: `${daysLeft} day${daysLeft === 1 ? "" : "s"} left`, ageDays: daysBetween(row.created_at, now), triggerAt: row.created_at,
      dueAt: due.toISOString(), href: `/admin/cases/${caseId}?tab=people`, action: "Open people",
    }, c))
  }

  const payments = ok<{ data: Array<{ id: string; case_id: string | null; client_id: string | null; created_at: string }> }>(6)?.data ?? []
  for (const payment of payments) {
    const ageDays = daysBetween(payment.created_at, now)
    if (ageDays <= PAYMENT_FOLLOWUP_DAYS || !payment.case_id) continue
    const c = cases.get(payment.case_id)
    if (!c) continue
    allItems.push(caseItem({
      id: `payment-${payment.id}`, caseId: payment.case_id, type: "payment", section: "week",
      title: `Follow up on payment — ${c.clientName}`, reason: "A pending service payment is ready for applicant follow-up.", owner: "Applicant",
      age: `Ready ${ageDays} days`, ageDays, triggerAt: payment.created_at, dueAt: new Date(now.getTime() + 7 * DAY).toISOString(),
      href: `/admin/payments?client=${encodeURIComponent(c.clientId)}`, action: "View payment",
    }, c))
  }

  const privacy = ok<{ data: Array<{ id: string; case_id: string | null; client_id: string | null; requested_at: string; kind: string }> }>(7)?.data ?? []
  for (const request of privacy) {
    const c = request.case_id ? cases.get(request.case_id) : null
    allItems.push({
      id: `privacy-${request.id}`, caseId: request.case_id, type: "privacy", section: "week",
      title: `Open privacy request${c ? ` — ${c.clientName}` : ""}`, reason: request.kind.replaceAll("_", " "),
      clientName: c?.clientName ?? "Privacy request", track: c?.track ?? "ADMIN ONLY", owner: "You", unassigned: false,
      assignedStaff: userId, age: ageText(request.requested_at, now), ageDays: daysBetween(request.requested_at, now), triggerAt: request.requested_at,
      dueAt: new Date(now.getTime() + 7 * DAY).toISOString(), href: `/admin/privacy#${request.id}`, action: "Open request",
    })
  }

  const scoped = sortItems(allItems.filter((item) => inScope(item, scope, userId)))
  const unassignedCount = allItems.filter((item) => item.unassigned).length

  const calendar = ok<CalendarData>(8)
  if (calendar?.errors.length) errors.push(...calendar.errors.map((source) => `Schedule: ${source}`))
  const schedule: TodayScheduleItem[] = (calendar?.events ?? [])
    .filter((event): event is typeof event & { caseId: string } => !!event.caseId)
    .map((event) => ({
      id: event.id,
      caseId: event.caseId,
      when: event.startsAt,
      title: event.clientName,
      detail: event.type,
      owner: event.owner === "NYPD" ? "NYPD milestone" : event.owner === "Instructor" ? "Instructor" : "You",
    }))

  const staffCaseIds = new Set(scoped.filter((item) => item.owner === "You" || item.owner === "Team").map((item) => item.caseId).filter(Boolean))
  const referenceCases = new Set(peopleByCase.keys())
  const nypdCases: CaseContext[] = []
  const thirdPartyCases: CaseContext[] = []
  const applicantCases: CaseContext[] = []
  for (const c of cases.values()) {
    if (c.status !== "active" || staffCaseIds.has(c.id)) continue
    if (scope === "mine" && c.assignedStaff !== userId) continue
    if (scope === "unassigned" && c.assignedStaff) continue
    const ownership = deriveCaseOwnership(
      { stage: c.stage },
      { thirdPartyNextStep: referenceCases.has(c.id) ? "Waiting on references or household" : null }
    )
    if (ownership.whoseMove === "NYPD") nypdCases.push(c)
    else if (ownership.whoseMove === "Third party") thirdPartyCases.push(c)
    else applicantCases.push(c)
  }
  const thirdPartyCaseIds = new Set(thirdPartyCases.map((c) => c.id))
  const expiringThisWeek = peopleRows.filter((row) => thirdPartyCaseIds.has(row.case_id) && new Date(row.expiresAt).getTime() <= now.getTime() + 7 * DAY).length
  const applicantOldest = applicantCases.reduce((max, c) => Math.max(max, daysBetween(c.updatedAt, now)), 0)
  const applicantPast14 = applicantCases.filter((c) => daysBetween(c.updatedAt, now) > 14).length
  const waiting: TodayWaiting = {
    nypd: { count: nypdCases.length, detail: "Their clock — no action needed", href: "/admin/cases?waiting=nypd" },
    thirdParty: { count: thirdPartyCases.length, detail: `${expiringThisWeek} links expire this week`, href: "/admin/cases?waiting=third-party" },
    applicant: { count: applicantCases.length, detail: `Oldest wait ${applicantOldest} days · ${applicantPast14} past 14 days`, href: "/admin/cases?waiting=applicant" },
  }

  const oldestMessage = messageThreads.map((thread) => thread.waitingSince).filter((value): value is string => !!value).sort()[0]
  const oldestDocument = documents[0]?.created_at
  const stalledCases = [...cases.values()].filter((c) => c.status === "active" && !isNypdControlled(c.stage) && daysBetween(c.stageEnteredAt, now) > STALLED_DAYS)
  const legalResult = ok<RuleReviewCounts>(9)
  const health: TodayHealthItem[] = [
    { key: "message", label: "Oldest unanswered client message", value: oldestMessage ? ageText(oldestMessage, now) : "None", pastTarget: messageThreads.some((thread) => thread.overdue), available: !errors.includes("Messages") },
    { key: "document", label: "Oldest document waiting for review", value: oldestDocument ? ageText(oldestDocument, now) : "None", pastTarget: !!oldestDocument && daysBetween(oldestDocument, now) >= DOCUMENT_REVIEW_BUSINESS_DAYS, available: !errors.includes("Documents") },
    { key: "stalled", label: "Cases with no movement in 14+ days", value: String(stalledCases.length), pastTarget: stalledCases.length > 0, available: true },
    ...(role === "admin" ? [{ key: "legal" as const, label: "Rules that need our team review", value: legalResult ? String(legalResult.attention) : "Unavailable", pastTarget: (legalResult?.attention ?? 0) > 0, available: !errors.includes("Rule review") }] : []),
  ]

  return { items: scoped, schedule, waiting, health, errors, unassignedCount, inboxNeedsReplyCount: inbox?.counts.needs ?? 0, asOf: now.toISOString() }
}

export const todayDateHelpers = { addBusinessDays, sectionFor, dayKey }
