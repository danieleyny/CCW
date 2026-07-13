import Link from "next/link"
import { ArrowRight, ClipboardList, CalendarDays, CreditCard } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import {
  stageMeta,
  stageIndex,
  nextStage,
  type CaseStageKey,
} from "@/config/stages"
import { money, formatDate } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { ReticleProgress } from "@/components/ui/reticle-progress"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

export const metadata = { title: "Your application" }

export default async function PortalHome() {
  const myCase = await getMyCase()

  if (!myCase) {
    return (
      <Card>
        <CardContent className="p-8 text-center">
          <h2 className="text-lg font-semibold">Welcome.</h2>
          <p className="mt-2 text-sm text-text-mid">
            Your case isn&apos;t set up yet. Your CARRY concierge will reach out shortly to get you
            started.
          </p>
        </CardContent>
      </Card>
    )
  }

  const supabase = await createClient()
  const stage = myCase.stage as CaseStageKey
  const here = stageIndex(stage)
  const next = nextStage(stage)

  const [{ data: reqs }, { data: training }, { data: payments }] = await Promise.all([
    supabase.from("case_requirements").select("status").eq("case_id", myCase.id),
    supabase
      .from("training_sessions")
      .select("class_date")
      .eq("case_id", myCase.id)
      .order("class_date", { ascending: true }),
    supabase.from("payments").select("amount_cents, status").eq("case_id", myCase.id),
  ])

  // V3-P2.1 — to-dos come from the requirements engine (the one checklist).
  const outstanding = (reqs ?? []).filter((r) => r.status === "pending").length
  const nextTraining = (training ?? []).find((t) => t.class_date)
  const paidCents = (payments ?? [])
    .filter((p) => p.status === "paid")
    .reduce((s, p) => s + p.amount_cents, 0)

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Your Application</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">
          {myCase.client.full_name.split(" ")[0]}
        </h1>
        <p className="mt-1 text-sm text-text-mid">
          Tracking your NYC concealed carry application, end to end.
        </p>
      </div>

      {/* Guided intake entry */}
      <Link
        href="/portal/intake"
        className="flex items-center justify-between rounded-md border border-signal/30 bg-signal-dim px-4 py-3.5 text-signal transition-colors hover:border-signal/50"
      >
        <span className="text-sm font-medium">
          Application intake — build your personalized document set
        </span>
        <ArrowRight className="size-4" />
      </Link>

      {/* Marketplace entry */}
      <Link
        href="/portal/marketplace"
        className="flex items-center justify-between rounded-md border border-brass/30 bg-brass/8 px-4 py-3.5 text-brass-bright transition-colors hover:border-brass/50"
      >
        <span className="text-sm font-medium">Find a verified local instructor</span>
        <ArrowRight className="size-4" />
      </Link>

      {/* Prepared documents entry */}
      <Link
        href="/portal/forms"
        className="flex items-center justify-between rounded-md border border-hairline bg-surface-2/40 px-4 py-3.5 text-text-mid transition-colors hover:text-foreground"
      >
        <span className="text-sm font-medium">Documents we prepared for you — download &amp; sign</span>
        <ArrowRight className="size-4" />
      </Link>

      {/* Reticle progress — centerpiece */}
      <Card className="brass-edge">
        <CardContent className="p-6">
          <div className="mb-5 flex items-center justify-between">
            <div>
              <div className="engraved">Current Stage</div>
              <div className="mt-1 font-display text-xl font-semibold">{stageMeta(stage).label}</div>
            </div>
            <StatusBadge status={myCase.status} />
          </div>
          <ReticleProgress currentStage={stage} />
          <p className="mt-5 rounded-md border border-brass/25 bg-brass/8 p-3 text-sm text-brass-bright">
            <span className="font-mono text-[10px] uppercase tracking-wider text-brass">Next //</span>{" "}
            {next ? stageMeta(next).clientHint : stageMeta(stage).clientHint}
          </p>
        </CardContent>
      </Card>

      {/* HUD quick cards */}
      <div className="grid grid-cols-3 gap-3">
        <HudCard
          href="/portal/checklist"
          icon={ClipboardList}
          value={String(outstanding)}
          label="To-dos"
        />
        <HudCard
          icon={CalendarDays}
          value={nextTraining?.class_date ? formatDate(nextTraining.class_date) : "—"}
          label="Training"
          small
        />
        <HudCard href="/portal/payments" icon={CreditCard} value={money(paidCents)} label="Paid" small />
      </div>

      {outstanding > 0 && (
        <Link
          href="/portal/checklist"
          className="flex items-center justify-between rounded-md border border-brass/40 bg-brass px-4 py-3.5 text-brand-foreground transition-colors hover:bg-brass-bright"
        >
          <span className="text-sm font-semibold">
            {outstanding} item{outstanding === 1 ? "" : "s"} need your attention
          </span>
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  )
}

function HudCard({
  href,
  icon: Icon,
  value,
  label,
  small,
}: {
  href?: string
  icon: React.ComponentType<{ className?: string }>
  value: string
  label: string
  small?: boolean
}) {
  const inner = (
    <Card className="h-full transition-colors hover:border-hairline-strong">
      <CardContent className="p-4">
        <Icon className="size-4 text-signal" />
        <div
          className={`mt-2 font-display font-semibold tabular-nums ${small ? "text-sm" : "text-2xl"}`}
        >
          {value}
        </div>
        <div className="engraved mt-1">{label}</div>
      </CardContent>
    </Card>
  )
  return href ? <Link href={href}>{inner}</Link> : inner
}
