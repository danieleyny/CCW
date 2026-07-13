import Link from "next/link"
import { MessageSquare, Mail } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export const metadata = { title: "Inbox" }

/**
 * V3-P2.5 — the unified cross-case inbox. Previously messages were reachable
 * only by opening each case one at a time; now every conversation is one list,
 * unread-first. Opening a case clears its unread state.
 */
export default async function InboxPage() {
  await requireStaff()
  const supabase = await createClient()

  // Latest message + unread count per case, assembled in one pass.
  const { data: msgs } = await supabase
    .from("messages")
    .select("id, case_id, body, read, created_at, profiles:sender_id(full_name, role)")
    .order("created_at", { ascending: false })
    .limit(500)

  interface Thread {
    caseId: string
    lastBody: string
    lastAt: string
    lastSender: string
    unread: number
  }
  const threads = new Map<string, Thread>()
  for (const m of msgs ?? []) {
    const p = m.profiles as unknown as { full_name: string; role: string } | null
    const t = threads.get(m.case_id)
    const isClientUnread = !m.read && p?.role === "client"
    if (!t) {
      threads.set(m.case_id, {
        caseId: m.case_id,
        lastBody: m.body,
        lastAt: m.created_at,
        lastSender: p?.full_name ?? "—",
        unread: isClientUnread ? 1 : 0,
      })
    } else if (isClientUnread) {
      t.unread++
    }
  }

  const caseIds = [...threads.keys()]
  const names = new Map<string, string>()
  if (caseIds.length) {
    const { data: cases } = await supabase.from("cases").select("id, clients(full_name)").in("id", caseIds)
    for (const c of cases ?? []) {
      names.set(c.id, (c.clients as unknown as { full_name: string } | null)?.full_name ?? "—")
    }
  }

  const list = [...threads.values()].sort((a, b) => {
    if ((a.unread > 0) !== (b.unread > 0)) return a.unread > 0 ? -1 : 1
    return b.lastAt.localeCompare(a.lastAt)
  })
  const totalUnread = list.reduce((s, t) => s + t.unread, 0)

  return (
    <div>
      <PageHeader
        title={`Inbox${totalUnread ? ` (${totalUnread})` : ""}`}
        description="Every client conversation in one place — unread first. Opening a case marks it read."
      />
      {list.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No conversations yet.
        </p>
      ) : (
        <ul className="divide-y rounded-lg border bg-card">
          {list.map((t) => (
            <li key={t.caseId}>
              <Link
                href={`/admin/cases/${t.caseId}`}
                className="flex items-start gap-3 p-3 transition-colors hover:bg-accent"
              >
                {t.unread > 0 ? (
                  <span className="mt-1 inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-signal text-[10px] font-bold text-background">
                    {t.unread}
                  </span>
                ) : (
                  <MessageSquare className="mt-1 size-4 shrink-0 text-text-low" />
                )}
                <div className="min-w-0 flex-1">
                  <div className="flex items-center justify-between gap-2">
                    <span className={cn("text-sm", t.unread > 0 ? "font-semibold" : "font-medium")}>
                      {names.get(t.caseId) ?? "—"}
                    </span>
                    <span className="shrink-0 text-xs text-text-low">{formatDateTime(t.lastAt)}</span>
                  </div>
                  <p className={cn("truncate text-xs", t.unread > 0 ? "text-foreground" : "text-text-low")}>
                    <Mail className="mr-1 inline size-3" />
                    {t.lastSender}: {t.lastBody}
                  </p>
                </div>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
