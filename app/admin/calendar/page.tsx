import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/format"

export const metadata = { title: "Calendar" }

interface AgendaRow {
  id: string
  when: string
  caseId: string
  title: string
  sub: string
  kind: "Consult" | "Training"
  type: string
  status?: string | null
}

/**
 * B4 — the agenda now MERGES appointments (consults, fingerprinting, NYPD
 * interviews) with marketplace training bookings into one time-ordered list,
 * each entry linking to its case. Previously it showed only `appointments`, so
 * training sessions were invisible here.
 */
export default async function CalendarPage() {
  const supabase = await createClient()
  const [apptRes, bookingRes] = await Promise.all([
    supabase
      .from("appointments")
      .select("id, type, scheduled_at, location, case_id, clients(full_name)")
      .order("scheduled_at", { ascending: true }),
    supabase
      .from("bookings")
      .select("id, type, status, starts_at, case_id, instructors(name), cases(clients(full_name))")
      .neq("status", "cancelled")
      .order("starts_at", { ascending: true }),
  ])

  const rows: AgendaRow[] = [
    ...(apptRes.data ?? [])
      .filter((a): a is typeof a & { case_id: string } => !!a.case_id)
      .map((a) => ({
      id: `a-${a.id}`,
      when: a.scheduled_at,
      caseId: a.case_id,
      title: (a.clients as unknown as { full_name: string } | null)?.full_name ?? "—",
      sub: a.location ?? "—",
      kind: "Consult" as const,
      type: a.type,
    })),
    ...(bookingRes.data ?? []).map((b) => ({
      id: `b-${b.id}`,
      when: b.starts_at,
      caseId: b.case_id,
      title:
        ((b.cases as unknown as { clients: { full_name: string } | null } | null)?.clients?.full_name) ??
        "—",
      sub: (b.instructors as unknown as { name: string } | null)?.name ?? "Instructor",
      kind: "Training" as const,
      type: b.type,
      status: b.status,
    })),
  ]

  // Server component: reading the request-time clock to split past/upcoming is
  // correct here (the purity rule targets client renders).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const upcoming = rows
    .filter((r) => new Date(r.when).getTime() >= now)
    .sort((a, b) => new Date(a.when).getTime() - new Date(b.when).getTime())
  const past = rows
    .filter((r) => new Date(r.when).getTime() < now)
    .sort((a, b) => new Date(b.when).getTime() - new Date(a.when).getTime())

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Consults, fingerprinting, NYPD interviews, and training sessions — every scheduled event across cases."
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Agenda title="Upcoming" rows={upcoming} empty="Nothing scheduled." />
        <Agenda title="Past" rows={past} empty="No past events." muted />
      </div>
    </div>
  )
}

function Agenda({
  title,
  rows,
  empty,
  muted,
}: {
  title: string
  rows: AgendaRow[]
  empty: string
  muted?: boolean
}) {
  return (
    <div>
      <h3 className="engraved mb-3">{title}</h3>
      <Card>
        <CardContent className="space-y-2 p-4">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
          {rows.map((r) => (
            <Link
              key={r.id}
              href={`/admin/cases/${r.caseId}`}
              className={`flex items-center justify-between rounded-md border p-3 text-sm transition-colors hover:bg-accent ${
                muted ? "opacity-70" : ""
              }`}
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 font-medium">
                  {r.title}
                  <span
                    className={`rounded px-1.5 py-0.5 text-[10px] ${
                      r.kind === "Training" ? "bg-brass/15 text-brass-bright" : "bg-signal-dim text-signal"
                    }`}
                  >
                    {r.kind}
                  </span>
                </div>
                <div className="truncate text-xs text-muted-foreground">{r.sub}</div>
              </div>
              <div className="shrink-0 text-right">
                <Badge variant="outline" className="capitalize">
                  {r.type.replace(/_/g, " ")}
                </Badge>
                <div className="mt-1 text-xs text-muted-foreground">{formatDateTime(r.when)}</div>
              </div>
            </Link>
          ))}
        </CardContent>
      </Card>
    </div>
  )
}
