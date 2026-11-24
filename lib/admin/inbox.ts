import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import { MESSAGE_REPLY_BUSINESS_DAYS } from "@/config/service-targets";
import { stageMeta, type CaseStageKey } from "@/config/stages";
import { addAdminBusinessDays } from "@/lib/admin/business-time";
import { duplicateCaseMetadata } from "@/lib/admin/case-visibility";
import { deriveCaseOwnership } from "@/lib/admin/ownership";
import type {
  InboxCounts,
  InboxData,
  InboxLastSender,
  InboxScope,
  InboxThread,
} from "@/lib/admin/inbox-model";
import type { Database } from "@/lib/supabase/types";
import type { BrandKey } from "@/config/brands";

type DB = SupabaseClient<Database>;

interface MessageRow {
  id: string;
  case_id: string;
  body: string;
  read: boolean;
  created_at: string;
  profiles: unknown;
}
interface CaseRow {
  id: string;
  brand: BrandKey;
  brandOrigin: BrandKey;
  clientId: string;
  clientName: string;
  clientEmail: string | null;
  assignedStaff: string | null;
  stage: CaseStageKey;
  licenseTrack: string;
  serviceMode: "concierge" | "self_guided" | null;
  updatedAt: string;
  isDemo: boolean;
  licenseIssuedOn: string | null;
  licenseExpiresOn: string | null;
}
const PAGE_SIZE = 1000;

function responseError(value: { error: unknown | null }, label: string) {
  if (value.error)
    throw new Error(
      `${label}: ${String((value.error as { message?: string }).message ?? value.error)}`,
    );
}

async function loadAllLaneMessages(db: DB): Promise<MessageRow[]> {
  const rows: MessageRow[] = [];
  for (let from = 0; ; from += PAGE_SIZE) {
    const result = await db
      .from("messages")
      .select("id, case_id, body, read, created_at, profiles:sender_id(full_name, role)")
      .is("engagement_id", null)
      .order("created_at", { ascending: true })
      .range(from, from + PAGE_SIZE - 1);
    responseError(result, "Messages");
    const page = (result.data ?? []) as unknown as MessageRow[];
    rows.push(...page);
    if (page.length < PAGE_SIZE) break;
  }
  return rows;
}

function trackLabel(value: string) {
  const labels: Record<string, string> = {
    premise_residence: "PREMISE RESIDENCE",
    premises: "PREMISE RESIDENCE",
    concealed_carry: "CONCEALED CARRY",
    carry: "CONCEALED CARRY",
    special_carry: "SPECIAL CARRY",
    special_carry_guard: "SPECIAL CARRY",
    carry_guard: "CARRY GUARD",
  };
  return labels[value] ?? value.replaceAll("_", " ").toUpperCase();
}

function serviceLabel(value: CaseRow["serviceMode"]) {
  if (value === "concierge") return "FULL CONCIERGE";
  if (value === "self_guided") return "SELF-GUIDED";
  return "NO PACKAGE";
}

function messageProfile(row: MessageRow) {
  return row.profiles as { full_name?: string | null; role?: string | null } | null;
}

function threadFromMessages(
  c: CaseRow,
  rows: MessageRow[],
  ownerName: string | null,
  now: Date,
): InboxThread | null {
  if (!rows.length) return null;
  const last = rows.at(-1)!;
  const lastProfile = messageProfile(last);
  const lastSender: InboxLastSender = lastProfile?.role === "client" ? "client" : "staff";
  const lastStaffIndex = rows.findLastIndex((row) => messageProfile(row)?.role !== "client");
  const unanswered =
    lastSender === "client"
      ? (rows.slice(lastStaffIndex + 1).find((row) => messageProfile(row)?.role === "client") ??
        null)
      : null;
  const waitingSince = unanswered?.created_at ?? null;
  const dueAt = waitingSince
    ? addAdminBusinessDays(new Date(waitingSince), MESSAGE_REPLY_BUSINESS_DAYS).toISOString()
    : null;
  const needsReply = lastSender === "client";
  const unread = rows.reduce((count, row) => {
    return count + (messageProfile(row)?.role === "client" && !row.read ? 1 : 0);
  }, 0);
  const ownership = deriveCaseOwnership(
    { stage: c.stage, licenseIssuedOn: c.licenseIssuedOn, licenseExpiresOn: c.licenseExpiresOn },
    { staffNextStep: needsReply ? "Reply to client" : null },
  );

  return {
    caseId: c.id,
    brand: c.brand,
    brandOrigin: c.brandOrigin,
    clientName: c.clientName,
    clientFirstName: c.clientName.trim().split(/\s+/)[0] || "client",
    lastBody: last.body,
    lastAt: last.created_at,
    lastSender,
    lastSenderName: lastProfile?.full_name || (lastSender === "client" ? c.clientName : "Staff"),
    unread,
    waitingSince,
    firstUnansweredBody: unanswered?.body ?? null,
    needsReply,
    openedNotAnswered: needsReply && last.read,
    dueAt,
    overdue: !!dueAt && new Date(dueAt).getTime() < now.getTime(),
    assignedStaff: c.assignedStaff,
    ownerName,
    unassigned: !c.assignedStaff,
    isDemo: c.isDemo,
    hiddenDuplicate: false,
    trackLabel: trackLabel(c.licenseTrack),
    stageLabel: stageMeta(c.stage).short,
    serviceLabel: serviceLabel(c.serviceMode),
    nextStep: ownership.nextStep,
  };
}

function inScope(thread: InboxThread, scope: InboxScope, userId: string) {
  if (scope === "team") return true;
  if (scope === "unassigned") return thread.unassigned;
  return thread.assignedStaff === userId || (thread.unassigned && thread.overdue);
}

function sortThreads(threads: InboxThread[]) {
  return threads.sort((a, b) => {
    if (a.needsReply && b.needsReply)
      return (a.waitingSince ?? a.lastAt).localeCompare(b.waitingSince ?? b.lastAt);
    return b.lastAt.localeCompare(a.lastAt);
  });
}

async function searchCaseIds(db: DB, query: string, cases: CaseRow[]) {
  if (!query) return null;
  const pattern = `%${query.replaceAll("%", "\\%").replaceAll("_", "\\_")}%`;
  const [messageResult, clientResult] = await Promise.all([
    db.from("messages").select("case_id").is("engagement_id", null).ilike("body", pattern),
    db.from("clients").select("id").ilike("full_name", pattern),
  ]);
  responseError(messageResult, "Message search");
  responseError(clientResult, "Client search");
  const clientIds = new Set((clientResult.data ?? []).map((row) => row.id));
  return new Set([
    ...(messageResult.data ?? []).map((row) => row.case_id),
    ...cases.filter((row) => clientIds.has(row.clientId)).map((row) => row.id),
  ]);
}

/**
 * Single definition of the staff↔client inbox. Today and sidebar badges call
 * this same loader so read state can never erase an unanswered conversation.
 */
export async function loadInbox(
  db: DB,
  {
    userId,
    scope = "mine",
    showHidden = false,
    query = "",
    brand = "all",
    now = new Date(),
  }: {
    userId: string;
    scope?: InboxScope;
    showHidden?: boolean;
    query?: string;
    brand?: "all" | BrandKey;
    now?: Date;
  },
): Promise<InboxData> {
  const caseResult = await db
    .from("cases")
    .select(
      "id, client_id, brand, brand_origin, stage, license_track, service_mode, updated_at, is_demo, license_issued_on, license_expires_on, clients!inner(full_name, email, assigned_staff, track)",
    );
  responseError(caseResult, "Cases");

  const cases: CaseRow[] = (caseResult.data ?? []).map((row) => {
    const client = row.clients as unknown as {
      full_name: string;
      email: string | null;
      assigned_staff: string | null;
      track: string;
    };
    return {
      id: row.id,
      brand: row.brand,
      brandOrigin: row.brand_origin,
      clientId: row.client_id,
      clientName: client.full_name || "Applicant",
      clientEmail: client.email,
      assignedStaff: client.assigned_staff,
      stage: row.stage as CaseStageKey,
      licenseTrack: row.license_track ?? client.track,
      serviceMode: row.service_mode,
      updatedAt: row.updated_at,
      isDemo: row.is_demo,
      licenseIssuedOn: row.license_issued_on,
      licenseExpiresOn: row.license_expires_on,
    };
  });
  const caseById = new Map(cases.map((row) => [row.id, row]));
  const duplicateMeta = duplicateCaseMetadata(cases);
  const assignedIds = [
    ...new Set(cases.map((row) => row.assignedStaff).filter((id): id is string => !!id)),
  ];
  const [messages, staffResult, matches] = await Promise.all([
    loadAllLaneMessages(db),
    assignedIds.length
      ? db.from("profiles").select("id, full_name").in("id", assignedIds)
      : Promise.resolve({ data: [], error: null }),
    searchCaseIds(db, query.trim(), cases),
  ]);
  responseError(staffResult, "Staff");
  const staffNames = new Map(
    (staffResult.data ?? []).map((row) => [row.id, row.full_name || "Staff"]),
  );
  const byCase = new Map<string, MessageRow[]>();
  for (const message of messages) {
    if (!caseById.has(message.case_id)) continue;
    const rows = byCase.get(message.case_id) ?? [];
    rows.push(message);
    byCase.set(message.case_id, rows);
  }

  const allThreads: InboxThread[] = [];
  for (const [caseId, rows] of byCase) {
    const c = caseById.get(caseId);
    if (!c) continue;
    const thread = threadFromMessages(
      c,
      rows,
      c.assignedStaff ? (staffNames.get(c.assignedStaff) ?? null) : null,
      now,
    );
    if (!thread) continue;
    thread.hiddenDuplicate = duplicateMeta.get(caseId)?.hidden ?? false;
    allThreads.push(thread);
  }

  const brandThreads = allThreads.filter((thread) => brand === "all" || thread.brand === brand);
  const hidden = {
    test: brandThreads.filter((thread) => thread.isDemo).length,
    duplicate: brandThreads.filter((thread) => !thread.isDemo && thread.hiddenDuplicate).length,
  };
  const visible = brandThreads.filter(
    (thread) => showHidden || (!thread.isDemo && !thread.hiddenDuplicate),
  );
  const scoped = visible.filter((thread) => inScope(thread, scope, userId));
  const counts: InboxCounts = {
    needs: scoped.filter((thread) => thread.needsReply).length,
    unread: scoped.filter((thread) => thread.unread > 0).length,
    waiting: scoped.filter((thread) => !thread.needsReply).length,
    all: scoped.length,
    overdue: scoped.filter((thread) => thread.needsReply && thread.overdue).length,
  };
  const searched = matches ? scoped.filter((thread) => matches.has(thread.caseId)) : scoped;
  return { threads: sortThreads(searched), counts, hidden, scope, showHidden, brand };
}
