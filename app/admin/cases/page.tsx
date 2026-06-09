import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { CaseFilters } from "@/components/admin/case-filters"
import { StageBadge } from "@/components/shared/stage-badge"
import { StatusBadge } from "@/components/shared/status-badge"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"
import { formatDate } from "@/lib/format"
import type { CaseStageKey } from "@/config/stages"

export const metadata = { title: "Cases" }

export default async function CasesPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | undefined>>
}) {
  const sp = await searchParams
  const supabase = await createClient()

  let query = supabase
    .from("cases")
    .select(
      "id, stage, status, is_renewal, opened_at, nypd_app_ref, clients!inner(full_name, borough, track)"
    )
    .order("updated_at", { ascending: false })

  if (sp.stage) query = query.eq("stage", sp.stage as never)
  if (sp.status) query = query.eq("status", sp.status as never)
  if (sp.borough) query = query.eq("clients.borough", sp.borough)
  if (sp.q) query = query.ilike("clients.full_name", `%${sp.q}%`)

  const { data } = await query

  return (
    <div>
      <PageHeader
        title="Cases"
        description="All applications. Filter by stage, status, borough, or search by name."
      />
      <CaseFilters />

      <div className="rounded-lg border bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Borough</TableHead>
              <TableHead>Track</TableHead>
              <TableHead>Stage</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>NYPD ref</TableHead>
              <TableHead>Opened</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {(data ?? []).length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-24 text-center text-muted-foreground">
                  No cases match these filters.
                </TableCell>
              </TableRow>
            )}
            {(data ?? []).map((c) => {
              const client = c.clients as unknown as {
                full_name: string
                borough: string | null
                track: string
              }
              return (
                <TableRow key={c.id} className="cursor-pointer">
                  <TableCell className="font-medium">
                    <Link href={`/admin/cases/${c.id}`} className="block hover:underline">
                      {client.full_name}
                      {c.is_renewal && (
                        <span className="ml-2 text-xs text-brass">(renewal)</span>
                      )}
                    </Link>
                  </TableCell>
                  <TableCell className="text-muted-foreground">{client.borough ?? "—"}</TableCell>
                  <TableCell className="capitalize text-muted-foreground">
                    {client.track.replace(/_/g, " ")}
                  </TableCell>
                  <TableCell>
                    <StageBadge stage={c.stage as CaseStageKey} />
                  </TableCell>
                  <TableCell>
                    <StatusBadge status={c.status} />
                  </TableCell>
                  <TableCell className="text-xs text-muted-foreground">
                    {c.nypd_app_ref ?? "—"}
                  </TableCell>
                  <TableCell className="text-muted-foreground">{formatDate(c.opened_at)}</TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}
