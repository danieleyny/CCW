import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import { formatDateTime } from "@/lib/format"

export const metadata = { title: "Calendar" }

export default async function CalendarPage() {
  const supabase = await createClient()
  const { data } = await supabase
    .from("appointments")
    .select("id, type, scheduled_at, location, case_id, clients(full_name)")
    .order("scheduled_at", { ascending: true })

  // Server component: reading the request-time clock to split past/upcoming is
  // correct here (the purity rule targets client renders).
  // eslint-disable-next-line react-hooks/purity
  const now = Date.now()
  const upcoming = (data ?? []).filter((a) => new Date(a.scheduled_at).getTime() >= now)
  const past = (data ?? []).filter((a) => new Date(a.scheduled_at).getTime() < now)

  return (
    <div>
      <PageHeader
        title="Calendar"
        description="Consults, training, fingerprinting, and NYPD interviews. (Full calendar view comes in a later phase.)"
      />
      <div className="grid gap-6 lg:grid-cols-2">
        <Agenda title="Upcoming" rows={upcoming} empty="Nothing scheduled." />
        <Agenda title="Past" rows={past.reverse()} empty="No past appointments." muted />
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
  rows: Array<Record<string, unknown>>
  empty: string
  muted?: boolean
}) {
  return (
    <div>
      <h3 className="engraved mb-3">{title}</h3>
      <Card>
        <CardContent className="space-y-2 p-4">
          {rows.length === 0 && <p className="text-sm text-muted-foreground">{empty}</p>}
          {rows.map((a) => {
            const client = a.clients as { full_name: string } | null
            return (
              <Link
                key={a.id as string}
                href={`/admin/cases/${a.case_id}`}
                className={`flex items-center justify-between rounded-md border p-3 text-sm transition-colors hover:bg-accent ${
                  muted ? "opacity-70" : ""
                }`}
              >
                <div>
                  <div className="font-medium">{client?.full_name ?? "—"}</div>
                  <div className="text-xs text-muted-foreground">
                    {(a.location as string) ?? "—"}
                  </div>
                </div>
                <div className="text-right">
                  <Badge variant="outline" className="capitalize">
                    {(a.type as string).replace(/_/g, " ")}
                  </Badge>
                  <div className="mt-1 text-xs text-muted-foreground">
                    {formatDateTime(a.scheduled_at as string)}
                  </div>
                </div>
              </Link>
            )
          })}
        </CardContent>
      </Card>
    </div>
  )
}
