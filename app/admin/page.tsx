import Link from "next/link"
import { FileWarning, Users, Flag, ClipboardList } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import { TaskList, type TaskRow } from "@/components/admin/task-list"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { formatDate } from "@/lib/format"

export const metadata = { title: "Today" }

export default async function TodayPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const { userId } = await requireStaff()
  const sp = await searchParams
  // V3-P2.3 — "My queue": the cross-case task list, filterable to me.
  const mine = sp.queue !== "all"
  const supabase = await createClient()

  const [
    activeCases,
    leads,
    blocked,
    pendingDocs,
    tasksRes,
    docsRes,
  ] = await Promise.all([
    supabase.from("cases").select("id", { count: "exact", head: true }).eq("status", "active"),
    supabase.from("cases").select("id", { count: "exact", head: true }).eq("stage", "lead"),
    supabase.from("cases").select("id", { count: "exact", head: true }).eq("status", "blocked"),
    supabase.from("documents").select("id", { count: "exact", head: true }).eq("status", "pending"),
    (() => {
      let q = supabase
        .from("tasks")
        .select("id, title, description, due_date, priority, status, case_id, cases(client_id, clients(full_name))")
        .eq("status", "open")
        .order("priority", { ascending: true })
        .order("due_date", { ascending: true, nullsFirst: false })
      if (mine) q = q.eq("assignee", userId)
      return q
    })(),
    supabase
      .from("documents")
      .select("id, type, created_at, case_id, clients(full_name)")
      .eq("status", "pending")
      .order("created_at", { ascending: true })
      .limit(8),
  ])

  const tasks: TaskRow[] = (tasksRes.data ?? []).map((t) => {
    const c = t.cases as unknown as { clients?: { full_name: string } } | null
    return {
      id: t.id,
      title: t.title,
      description: t.description,
      due_date: t.due_date,
      priority: t.priority,
      status: t.status,
      caseId: t.case_id,
      clientName: c?.clients?.full_name ?? null,
    }
  })

  const stats = [
    { label: "Active cases", value: activeCases.count ?? 0, icon: ClipboardList, href: "/admin/cases" },
    { label: "New leads", value: leads.count ?? 0, icon: Users, href: "/admin/cases?stage=lead" },
    { label: "Blocked", value: blocked.count ?? 0, icon: Flag, href: "/admin/cases?status=blocked" },
    { label: "Docs to review", value: pendingDocs.count ?? 0, icon: FileWarning, href: "/admin" },
  ]

  return (
    <div>
      <PageHeader
        title="Today"
        description="Everything that needs you right now — sorted by urgency."
      />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href}>
            <Card className="transition-colors hover:border-hairline-strong">
              <CardContent className="flex items-center justify-between p-5">
                <div>
                  <div className="font-display text-3xl font-semibold tabular-nums">{s.value}</div>
                  <div className="engraved mt-1.5">{s.label}</div>
                </div>
                <s.icon className="size-7 text-signal/60" />
              </CardContent>
            </Card>
          </Link>
        ))}
      </div>

      <div className="grid gap-6 lg:grid-cols-3">
        <div className="lg:col-span-2">
          <div className="mb-3 flex items-center justify-between">
            <h3 className="engraved">{mine ? "My queue" : "All open tasks"}</h3>
            <Link
              href={mine ? "/admin?queue=all" : "/admin"}
              className="text-xs text-signal underline"
            >
              {mine ? "Show everyone's" : "Show mine"}
            </Link>
          </div>
          <TaskList tasks={tasks} />
        </div>

        <div>
          <h3 className="engraved mb-3">
            Documents awaiting review
          </h3>
          <Card>
            <CardHeader className="pb-2">
              <CardTitle className="text-sm font-medium">
                {docsRes.data?.length ?? 0} pending
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-2">
              {(docsRes.data ?? []).length === 0 && (
                <p className="text-sm text-muted-foreground">No documents pending review.</p>
              )}
              {(docsRes.data ?? []).map((d) => {
                const client = d.clients as unknown as { full_name: string } | null
                return (
                  <Link
                    key={d.id}
                    href={`/admin/cases/${d.case_id}`}
                    className="flex items-center justify-between rounded-md border p-2 text-sm transition-colors hover:bg-accent"
                  >
                    <span className="capitalize">{d.type.replace(/_/g, " ")}</span>
                    <span className="text-xs text-muted-foreground">
                      {client?.full_name} · {formatDate(d.created_at)}
                    </span>
                  </Link>
                )
              })}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  )
}
