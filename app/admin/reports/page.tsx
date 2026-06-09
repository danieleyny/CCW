import { createClient } from "@/lib/supabase/server"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { money } from "@/lib/format"
import { CASE_STAGES, stageMeta, type CaseStageKey } from "@/config/stages"

export const metadata = { title: "Reports" }

export default async function Reports() {
  const supabase = await createClient()
  const [{ data: cases }, { data: stages }, { data: payments }] = await Promise.all([
    supabase.from("cases").select("stage"),
    supabase.from("case_stages").select("stage, entered_at, completed_at"),
    supabase.from("payments").select("amount_cents, status, paid_at, created_at"),
  ])

  // Funnel by stage order.
  const orders = (cases ?? []).map((c) => stageMeta(c.stage as CaseStageKey).order)
  const leads = orders.length
  const paid = orders.filter((o) => o >= 3).length
  const filed = orders.filter((o) => o >= 9).length
  const licensed = orders.filter((o) => o >= 13).length
  const funnel = [
    { label: "Leads", n: leads },
    { label: "Signed & paid", n: paid },
    { label: "Filed", n: filed },
    { label: "Licensed", n: licensed },
  ]
  const conversion = leads ? Math.round((paid / leads) * 100) : 0

  // Avg time-in-stage (days), from completed stage records.
  const durs = new Map<string, number[]>()
  for (const s of stages ?? []) {
    if (!s.entered_at || !s.completed_at) continue
    const days = (new Date(s.completed_at).getTime() - new Date(s.entered_at).getTime()) / 86400000
    if (days < 0) continue
    ;(durs.get(s.stage) ?? durs.set(s.stage, []).get(s.stage)!).push(days)
  }
  const timeInStage = CASE_STAGES.map((s) => {
    const arr = durs.get(s.key) ?? []
    const avg = arr.length ? arr.reduce((a, b) => a + b, 0) / arr.length : null
    return { stage: s, avg }
  }).filter((t) => t.avg !== null)
  const maxAvg = Math.max(1, ...timeInStage.map((t) => t.avg ?? 0))

  // Revenue.
  const collected = (payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount_cents, 0)

  return (
    <div>
      <PageHeader title="Reports" description="Funnel, conversion, bottlenecks, and revenue." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-4">
        <Stat label="Total leads" value={String(leads)} />
        <Stat label="Conversion to paid" value={`${conversion}%`} accent />
        <Stat label="Licensed" value={String(licensed)} />
        <Stat label="Revenue" value={money(collected)} />
      </div>

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Funnel */}
        <Card>
          <CardContent className="p-6">
            <div className="engraved mb-4">Acquisition funnel</div>
            <div className="space-y-3">
              {funnel.map((f) => (
                <div key={f.label}>
                  <div className="mb-1 flex items-center justify-between text-sm">
                    <span className="text-text-mid">{f.label}</span>
                    <span className="font-mono tabular-nums">{f.n}</span>
                  </div>
                  <div className="h-2.5 overflow-hidden rounded-full bg-surface-3">
                    <div
                      className="h-full rounded-full bg-brass"
                      style={{ width: `${leads ? (f.n / leads) * 100 : 0}%` }}
                    />
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* Time in stage */}
        <Card>
          <CardContent className="p-6">
            <div className="engraved mb-4">Avg time in stage (days)</div>
            {timeInStage.length === 0 ? (
              <p className="text-sm text-text-mid">Not enough completed stages yet.</p>
            ) : (
              <div className="space-y-2.5">
                {timeInStage.map((t) => (
                  <div key={t.stage.key} className="flex items-center gap-3">
                    <span className="w-28 shrink-0 truncate text-xs text-text-mid">
                      {t.stage.short}
                    </span>
                    <div className="h-2 flex-1 overflow-hidden rounded-full bg-surface-3">
                      <div
                        className="h-full rounded-full bg-signal"
                        style={{ width: `${((t.avg ?? 0) / maxAvg) * 100}%` }}
                      />
                    </div>
                    <span className="w-10 text-right font-mono text-xs tabular-nums text-text-mid">
                      {Math.round(t.avg ?? 0)}
                    </span>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "brass-edge" : ""}>
      <CardContent className="p-5">
        <div className="engraved">{label}</div>
        <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}
