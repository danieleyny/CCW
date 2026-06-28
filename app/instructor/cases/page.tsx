import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { stageMeta, type CaseStageKey } from "@/config/stages"
import { Card, CardContent } from "@/components/ui/card"

export const metadata = { title: "My cases" }

export default async function InstructorCasesPage() {
  const supabase = await createClient()
  const { data: engagements } = await supabase
    .from("engagements")
    .select("id, type, status, case_id, created_at")
    .eq("status", "active")
    .order("created_at", { ascending: false })

  const caseIds = (engagements ?? []).map((e) => e.case_id)
  const stageByCase = new Map<string, string>()
  if (caseIds.length) {
    const { data: cases } = await supabase.from("cases").select("id, stage").in("id", caseIds)
    for (const c of cases ?? []) stageByCase.set(c.id, c.stage)
  }

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">My cases</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Cases you&apos;ve accepted. You see training-relevant progress only —
          never the client&apos;s identity or disclosures.
        </p>
      </div>

      {(engagements ?? []).length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No active cases yet. Accept one from your feed.
        </p>
      ) : (
        <ul className="space-y-2">
          {(engagements ?? []).map((e) => {
            const stage = stageByCase.get(e.case_id)
            return (
              <li key={e.id}>
                <Link href={`/instructor/cases/${e.case_id}`}>
                  <Card className="transition-colors hover:border-hairline-strong">
                    <CardContent className="flex items-center justify-between gap-3 p-4">
                      <div>
                        <div className="text-sm font-medium">
                          {e.type === "full_assist" ? "Full application help" : "Training"}
                        </div>
                        <div className="mt-0.5 text-xs text-text-mid">
                          {stage ? stageMeta(stage as CaseStageKey).label : "—"}
                        </div>
                      </div>
                      <ArrowRight className="size-4 text-text-low" />
                    </CardContent>
                  </Card>
                </Link>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
