import "server-only";

import type { SupabaseClient } from "@supabase/supabase-js";
import type { Database } from "@/lib/supabase/types";
import { isNypdControlled, stageIndex, stageMeta, type CaseStageKey } from "@/config/stages";
import { APPLICATION_TYPE_LABELS, type ApplicationType } from "@/lib/application-types";
import { loadPipeline, type ActivePhaseKey, type LeadGroupKey } from "@/lib/admin/pipeline";
import { deriveCaseOwnership, type CaseMoveOwner } from "@/lib/admin/today";
import { matchesAdminSearch } from "@/lib/admin/search";
import type { BrandKey } from "@/config/brands";

type DB = SupabaseClient<Database>;

export type CasesView = "active" | "mine" | "stalled" | "leads" | "closed" | "all";
export type CasesSort = "urgent" | "activity" | "name";

export interface CasesFilters {
  brand: "all" | BrandKey;
  phase: string;
  owner: string;
  track: string;
  service: string;
  whose: string;
  borough: string;
  status: string;
  stage: string;
}

export interface CasesRow {
  id: string;
  clientId: string;
  clientName: string;
  brand: BrandKey;
  brandOrigin: BrandKey;
  email: string | null;
  phone: string | null;
  borough: string | null;
  trackKey: string;
  trackLabel: string;
  serviceKey: string | null;
  serviceLabel: string;
  stage: CaseStageKey;
  stageLabel: string;
  status: string;
  phase: ActivePhaseKey;
  phaseLabel: string;
  leadGroup: LeadGroupKey | null;
  leadGroupLabel: string | null;
  nextStep: string;
  whoseMove: CaseMoveOwner;
  days: number;
  stalled: boolean;
  nypdControlled: boolean;
  ownerId: string | null;
  ownerName: string | null;
  ownerInitials: string;
  isDemo: boolean;
  isDuplicate: boolean;
  hiddenDuplicate: boolean;
  duplicateLabel: string | null;
  nonClosedCaseCount: number;
  progressStep: number;
  openedAt: string;
  updatedAt: string;
  pendingAmount: string | null;
  compLabel: string | null;
  lastStep: string | null;
}

export interface CasesOverviewData {
  view: CasesView;
  rows: CasesRow[];
  total: number;
  shown: number;
  page: number;
  hasMore: boolean;
  counts: Record<CasesView, number>;
  hidden: { test: number; duplicate: number };
  showHidden: boolean;
  q: string;
  sort: CasesSort;
  filters: CasesFilters;
  staff: Array<{ id: string; name: string }>;
  selectedCaseId: string | null;
  isFiltered: boolean;
}

const DAY = 86_400_000;
const PAGE_SIZE = 25;
const PHASE_LABELS: Record<ActivePhaseKey, string> = {
  getting_started: "Getting started",
  training: "Training",
  paperwork: "Paperwork",
  filing: "Filing",
  nypd: "With NYPD",
  licensed: "Licensed",
};
const LEAD_LABELS: Record<LeadGroupKey, string> = {
  new: "New",
  screened: "Screened",
  package: "Chose a package — not paid",
  quiet: "Gone quiet",
};

function daysSince(value: string, now: Date) {
  return Math.max(0, Math.floor((now.getTime() - new Date(value).getTime()) / DAY));
}

function initials(name: string | null) {
  if (!name) return "—";
  return (
    name
      .trim()
      .split(/\s+/)
      .slice(0, 2)
      .map((part) => part[0]?.toUpperCase() ?? "")
      .join("") || "—"
  );
}

function phaseFor(stage: CaseStageKey): ActivePhaseKey {
  if (stage === "licensed") return "licensed";
  if (["fingerprinting_booked", "under_investigation", "decision"].includes(stage)) return "nypd";
  if (["application_assembled", "filed"].includes(stage)) return "filing";
  if (["document_collection", "notarization"].includes(stage)) return "paperwork";
  if (["training_scheduled", "training_complete"].includes(stage)) return "training";
  return "getting_started";
}

function closedTrack(applicationType: ApplicationType | null, legacyTrack: string) {
  if (applicationType === "premise_residence") return { key: "premise", label: "PREMISE RES." };
  if (applicationType === "premise_business") return { key: "premise", label: "PREMISE BUSINESS" };
  if (applicationType === "special_carry" || applicationType === "special_carry_guard")
    return { key: "special", label: "SPECIAL CARRY" };
  const label = applicationType
    ? APPLICATION_TYPE_LABELS[applicationType]
    : legacyTrack.replaceAll("_", " ");
  return { key: "concealed", label: label.toUpperCase() };
}

function visibleByDefault(row: CasesRow) {
  return !row.isDemo && !row.hiddenDuplicate;
}

function viewMatch(row: CasesRow, view: CasesView, userId: string) {
  if (view === "all") return true;
  if (view === "closed") return row.status === "closed";
  if (row.status === "closed") return false;
  if (view === "leads") return row.status !== "closed" && row.lastStep !== null;
  if (row.lastStep !== null) return false;
  if (view === "mine") return row.ownerId === userId;
  if (view === "stalled") return row.stalled;
  return true;
}

function matchesFilters(row: CasesRow, filters: CasesFilters, currentUserId?: string) {
  if (filters.brand !== "all" && row.brand !== filters.brand) return false;
  if (filters.phase !== "all" && row.phase !== filters.phase) return false;
  if (filters.owner === "unassigned" && row.ownerId) return false;
  if (filters.owner === "me" && row.ownerId !== currentUserId) return false;
  if (!["all", "me", "unassigned"].includes(filters.owner) && row.ownerId !== filters.owner)
    return false;
  if (filters.track !== "all" && row.trackKey !== filters.track) return false;
  if (filters.service === "none" && row.serviceKey !== null) return false;
  if (filters.service !== "all" && filters.service !== "none" && row.serviceKey !== filters.service)
    return false;
  if (filters.whose !== "all" && row.whoseMove.toLowerCase().replace(" ", "_") !== filters.whose)
    return false;
  if (filters.borough !== "all" && row.borough !== filters.borough) return false;
  if (filters.status !== "all" && row.status !== filters.status) return false;
  if (filters.stage !== "all" && row.stage !== filters.stage) return false;
  return true;
}

function sortRows(rows: CasesRow[], sort: CasesSort) {
  return [...rows].sort((a, b) => {
    if (sort === "name") return a.clientName.localeCompare(b.clientName);
    if (sort === "activity") return b.updatedAt.localeCompare(a.updatedAt);
    if (a.stalled !== b.stalled) return a.stalled ? -1 : 1;
    const aStaff = a.whoseMove === "Staff";
    const bStaff = b.whoseMove === "Staff";
    if (aStaff !== bStaff) return aStaff ? -1 : 1;
    return b.days - a.days || a.clientName.localeCompare(b.clientName);
  });
}

export async function loadCasesOverview(
  db: DB,
  input: {
    userId: string;
    view: CasesView;
    showHidden: boolean;
    q: string;
    sort: CasesSort;
    page: number;
    selectedCaseId?: string | null;
    filters: CasesFilters;
    now?: Date;
  },
): Promise<CasesOverviewData> {
  const now = input.now ?? new Date();
  const [pipeline, caseResult] = await Promise.all([
    loadPipeline(db, {
      view: "active",
      showHidden: true,
      filters: {
        brand: "all",
        track: "all",
        service: "all",
        assigned: "all",
        stalled: false,
        currentUserId: input.userId,
      },
      now,
    }),
    db
      .from("cases")
      .select(
        "id, client_id, brand, brand_origin, stage, status, application_type, license_track, service_mode, stage_entered_at, opened_at, updated_at, is_demo, license_issued_on, license_expires_on, clients!inner(id, full_name, email, phone, borough, track, assigned_staff)",
      ),
  ]);
  if (caseResult.error) throw caseResult.error;

  const pipelineById = new Map(pipeline.allCards.map((card) => [card.id, card]));
  const staffName = new Map(pipeline.staff.map((person) => [person.id, person.name]));
  const rawRows = caseResult.data ?? [];
  const nonClosedCounts = new Map<string, number>();
  for (const raw of rawRows) {
    if (raw.status !== "closed")
      nonClosedCounts.set(raw.client_id, (nonClosedCounts.get(raw.client_id) ?? 0) + 1);
  }

  const rows: CasesRow[] = rawRows.flatMap((raw) => {
    const client = raw.clients as unknown as {
      id: string;
      full_name: string;
      email: string | null;
      phone: string | null;
      borough: string | null;
      track: string;
      assigned_staff: string | null;
    };
    const card = pipelineById.get(raw.id);
    if (raw.status !== "closed" && !card) return [];
    const stage = raw.stage as CaseStageKey;
    const phase = card?.phase ?? phaseFor(stage);
    const track = card
      ? { key: card.trackKey, label: card.trackLabel }
      : closedTrack(
          raw.application_type as ApplicationType | null,
          raw.license_track ?? client.track,
        );
    const serviceKey = card?.serviceKey ?? raw.service_mode;
    const serviceLabel =
      card?.serviceLabel ??
      (raw.service_mode === "concierge"
        ? "Concierge"
        : raw.service_mode === "self_guided"
          ? "Self-guided"
          : "No package");
    const ownerName =
      card?.ownerName ??
      (client.assigned_staff ? (staffName.get(client.assigned_staff) ?? null) : null);
    const closedOwnership = deriveCaseOwnership(
      { stage, licenseIssuedOn: raw.license_issued_on, licenseExpiresOn: raw.license_expires_on },
      { applicantNextStep: raw.status === "closed" ? "Case closed" : stageMeta(stage).clientHint },
    );
    const nypd = card?.nypdControlled ?? (isNypdControlled(stage) && stage !== "filed");
    return [
      {
        id: raw.id,
        clientId: raw.client_id,
        clientName: client.full_name || "Applicant",
        brand: raw.brand,
        brandOrigin: raw.brand_origin,
        email: client.email,
        phone: client.phone,
        borough: client.borough,
        trackKey: track.key,
        trackLabel: track.label,
        serviceKey,
        serviceLabel,
        stage,
        stageLabel: card?.stageLabel ?? stageMeta(stage).short,
        status: raw.status,
        phase,
        phaseLabel: PHASE_LABELS[phase],
        leadGroup: card?.classification === "leads" ? card.leadGroup : null,
        leadGroupLabel: card?.classification === "leads" ? LEAD_LABELS[card.leadGroup] : null,
        nextStep:
          raw.status === "closed" ? "Case closed" : (card?.nextStep ?? closedOwnership.nextStep),
        whoseMove:
          raw.status === "closed" ? "Applicant" : (card?.whoseMove ?? closedOwnership.whoseMove),
        days: card?.days ?? daysSince(raw.stage_entered_at || raw.updated_at, now),
        stalled: raw.status === "closed" ? false : (card?.stalled ?? false),
        nypdControlled: nypd,
        ownerId: client.assigned_staff,
        ownerName,
        ownerInitials: card?.ownerInitials ?? initials(ownerName),
        isDemo: raw.is_demo,
        isDuplicate: card?.isDuplicate ?? false,
        hiddenDuplicate: card?.hiddenDuplicate ?? false,
        duplicateLabel: card?.duplicateLabel ?? null,
        nonClosedCaseCount: nonClosedCounts.get(raw.client_id) ?? 0,
        progressStep:
          card?.progressStep ??
          Math.max(1, Math.min(11, stageIndex(stage) - stageIndex("signed_up_paid") + 1)),
        openedAt: raw.opened_at,
        updatedAt: raw.updated_at,
        pendingAmount: card?.pendingAmount ?? null,
        compLabel: card?.compLabel ?? null,
        lastStep: card?.classification === "leads" ? card.lastStep : null,
      },
    ];
  });

  const searched = rows.filter((row) =>
    matchesAdminSearch({ fullName: row.clientName, email: row.email, phone: row.phone }, input.q),
  );
  const defaultVisible = searched.filter(visibleByDefault);
  const countFor = (view: CasesView) =>
    (view === "all" ? searched : defaultVisible.filter((row) => viewMatch(row, view, input.userId)))
      .length;
  const counts = {
    active: countFor("active"),
    mine: countFor("mine"),
    stalled: countFor("stalled"),
    leads: countFor("leads"),
    closed: countFor("closed"),
    all: countFor("all"),
  };

  const inView = searched.filter((row) => viewMatch(row, input.view, input.userId));
  const filteredAll = inView.filter((row) => matchesFilters(row, input.filters, input.userId));
  const hidden = {
    test: filteredAll.filter((row) => row.isDemo).length,
    duplicate: filteredAll.filter((row) => !row.isDemo && row.hiddenDuplicate).length,
  };
  const visible =
    input.view === "all" || input.showHidden ? filteredAll : filteredAll.filter(visibleByDefault);
  const sorted = sortRows(visible, input.sort);
  const shownRows = sorted.slice(0, Math.max(1, input.page) * PAGE_SIZE);
  const selectedCaseId = shownRows.some((row) => row.id === input.selectedCaseId)
    ? (input.selectedCaseId ?? null)
    : (shownRows[0]?.id ?? null);
  const isFiltered = Object.values(input.filters).some((value) => value !== "all");

  return {
    view: input.view,
    rows: shownRows,
    total: sorted.length,
    shown: shownRows.length,
    page: Math.max(1, input.page),
    hasMore: shownRows.length < sorted.length,
    counts,
    hidden,
    showHidden: input.showHidden,
    q: input.q,
    sort: input.sort,
    filters: input.filters,
    staff: pipeline.staff,
    selectedCaseId,
    isFiltered,
  };
}

export const casesOverviewModel = {
  viewMatch,
  matchesFilters,
  sortRows,
  phaseFor,
  visibleByDefault,
};
