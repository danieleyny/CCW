import Link from "next/link"
import { FileWarning, ArrowRight } from "lucide-react"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { formatDate } from "@/lib/format"

export const metadata = { title: "Documents to review" }

/**
 * B4 — the "Docs to review" stat now links here (it used to point at /admin
 * itself). A staff-gated queue of every pending document, grouped by case, each
 * linking into that case's Documents tab.
 */
export default async function AdminDocumentsPage() {
  await requireStaff()
  const supabase = await createClient()

  const { data: docs } = await supabase
    .from("documents")
    .select("id, type, created_at, case_id, clients(full_name)")
    .eq("status", "pending")
    .order("created_at", { ascending: true })

  // Group by case so a staffer works one applicant at a time.
  const byCase = new Map<string, { name: string; docs: { id: string; type: string; created_at: string }[] }>()
  for (const d of docs ?? []) {
    const name = (d.clients as unknown as { full_name: string } | null)?.full_name ?? "—"
    const g = byCase.get(d.case_id) ?? { name, docs: [] }
    g.docs.push({ id: d.id, type: d.type, created_at: d.created_at })
    byCase.set(d.case_id, g)
  }
  const groups = [...byCase.entries()]

  return (
    <div>
      <PageHeader title="Documents to review" description="Every uploaded document still awaiting a decision." />

      {groups.length === 0 ? (
        <Card className="mt-6">
          <CardContent className="flex items-center gap-2 p-8 text-sm text-muted-foreground">
            <FileWarning className="size-4" /> Nothing pending — every uploaded document has been reviewed.
          </CardContent>
        </Card>
      ) : (
        <ul className="mt-6 space-y-3">
          {groups.map(([caseId, g]) => (
            <li key={caseId}>
              <Card>
                <CardContent className="p-4">
                  <div className="mb-2 flex items-center justify-between gap-3">
                    <h2 className="text-sm font-semibold">{g.name}</h2>
                    <Link
                      href={`/admin/cases/${caseId}?tab=documents`}
                      className="inline-flex items-center gap-1 text-xs text-signal hover:underline"
                    >
                      Review <ArrowRight className="size-3" />
                    </Link>
                  </div>
                  <ul className="space-y-1 text-sm">
                    {g.docs.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-3 text-text-mid">
                        <span className="capitalize">{d.type.replace(/_/g, " ")}</span>
                        <span className="text-xs text-text-low">uploaded {formatDate(d.created_at)}</span>
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
