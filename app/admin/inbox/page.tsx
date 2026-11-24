import { TrackView } from "@/components/analytics/track-view";
import { AdminInboxWorkspace } from "@/components/admin/admin-inbox-workspace";
import { redirect } from "next/navigation";
import { requireStaff } from "@/lib/auth";
import { loadInbox } from "@/lib/admin/inbox";
import { inboxThreadMatchesTab, type InboxScope, type InboxTab } from "@/lib/admin/inbox-model";
import { createClient } from "@/lib/supabase/server";
import { loadInboxConversationPage } from "./actions";
import { resolveAdminBrandFilter } from "@/lib/admin/brand-filter";

export const metadata = { title: { absolute: "Inbox · Staff" } };

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function inboxTab(value: string | undefined): InboxTab {
  return value === "unread" || value === "waiting" || value === "all" ? value : "needs";
}

function inboxScope(value: string | undefined): InboxScope {
  return value === "team" || value === "unassigned" ? value : "mine";
}

export default async function InboxPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const { userId, profile } = await requireStaff();
  const params = await searchParams;
  if (!first(params.tab) || !first(params.scope)) {
    const next = new URLSearchParams();
    for (const [key, value] of Object.entries(params)) {
      const settled = first(value);
      if (settled) next.set(key, settled);
    }
    if (!next.has("tab")) next.set("tab", "needs");
    if (!next.has("scope")) next.set("scope", "mine");
    redirect(`/admin/inbox?${next.toString()}`);
  }
  const tab = inboxTab(first(params.tab));
  const scope = inboxScope(first(params.scope));
  const mode = first(params.mode) === "focus" ? "focus" : "inbox";
  const showHidden = first(params.hidden) === "1";
  const query = first(params.q)?.trim() ?? "";
  const requestedThread = first(params.thread) ?? null;
  const brand = await resolveAdminBrandFilter(first(params.brand));
  const supabase = await createClient();
  const inbox = await loadInbox(supabase, {
    userId,
    scope,
    showHidden,
    query,
    brand,
  });
  const visible = inbox.threads.filter((thread) =>
    inboxThreadMatchesTab(thread, mode === "focus" ? "needs" : tab),
  );
  const selected =
    visible.find((thread) => thread.caseId === requestedThread) ?? visible[0] ?? null;
  const conversation = selected
    ? await loadInboxConversationPage({ caseId: selected.caseId })
    : null;

  return (
    <>
      <TrackView event="admin_inbox_viewed" params={{ tab, scope }} />
      <AdminInboxWorkspace
        key={`${scope}:${tab}:${mode}:${showHidden}:${query}`}
        threads={inbox.threads}
        counts={inbox.counts}
        hidden={inbox.hidden}
        tab={tab}
        scope={scope}
        mode={mode}
        showHidden={showHidden}
        query={query}
        initialThreadId={selected?.caseId ?? null}
        initialThreadExplicit={!!requestedThread || mode === "focus"}
        initialConversation={conversation}
        staffName={profile.full_name || "Staff"}
        nowIso={new Date().toISOString()}
        brand={brand}
      />
    </>
  );
}
