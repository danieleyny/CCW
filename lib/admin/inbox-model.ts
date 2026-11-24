export type InboxScope = "mine" | "team" | "unassigned";
export type InboxTab = "needs" | "unread" | "waiting" | "all";
export type InboxLastSender = "client" | "staff";

export interface InboxThread {
  caseId: string;
  brand: BrandKey;
  brandOrigin: BrandKey;
  clientName: string;
  clientFirstName: string;
  lastBody: string;
  lastAt: string;
  lastSender: InboxLastSender;
  lastSenderName: string;
  unread: number;
  waitingSince: string | null;
  firstUnansweredBody: string | null;
  needsReply: boolean;
  openedNotAnswered: boolean;
  dueAt: string | null;
  overdue: boolean;
  assignedStaff: string | null;
  ownerName: string | null;
  unassigned: boolean;
  isDemo: boolean;
  hiddenDuplicate: boolean;
  trackLabel: string;
  stageLabel: string;
  serviceLabel: string;
  nextStep: string;
}

export interface InboxCounts {
  needs: number;
  unread: number;
  waiting: number;
  all: number;
  overdue: number;
}

export interface InboxData {
  brand: "all" | BrandKey;
  threads: InboxThread[];
  counts: InboxCounts;
  hidden: { test: number; duplicate: number };
  scope: InboxScope;
  showHidden: boolean;
}

export function inboxThreadMatchesTab(thread: InboxThread, tab: InboxTab) {
  if (tab === "needs") return thread.needsReply;
  if (tab === "unread") return thread.unread > 0;
  if (tab === "waiting") return !thread.needsReply;
  return true;
}
import type { BrandKey } from "@/config/brands";
