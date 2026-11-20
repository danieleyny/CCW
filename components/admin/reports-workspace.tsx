import Link from "next/link"
import {
  ArrowDown,
  ArrowRight,
  ArrowUp,
  CheckCircle2,
  Download,
  LockKeyhole,
  Map,
  RotateCcw,
  TriangleAlert,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import type {
  BottlenecksReportData,
  FunnelRow,
  MetricValue,
  OverviewReportData,
  ReportFilters,
  ReportTab,
  ServiceLevelsReportData,
  ServiceMetric,
  StageMetric,
} from "@/lib/admin/reports"
import { formatDuration } from "@/lib/admin/reports-model"
import { cn } from "@/lib/utils"

type ReportsData = OverviewReportData | BottlenecksReportData | ServiceLevelsReportData

const TABS: Array<{ key: ReportTab; label: string }> = [
  { key: "overview", label: "Overview" },
  { key: "bottlenecks", label: "Bottlenecks" },
  { key: "service", label: "Service levels" },
]

const RANGES = [
  { key: "month", label: "This month", mobile: "Month" },
  { key: "90", label: "Last 90 days", mobile: "90 days" },
  { key: "year", label: "This year", mobile: "Year" },
  { key: "all", label: "All time", mobile: "All" },
] as const

function queryHref(tab: ReportTab, filters: ReportFilters, updates: Record<string, string | null> = {}) {
  const params = new URLSearchParams()
  if (tab !== "overview") params.set("tab", tab)
  if (filters.range !== "90") params.set("range", filters.range)
  if (filters.service !== "all") params.set("service", filters.service)
  if (filters.track !== "all") params.set("track", filters.track)
  if (!filters.compare) params.set("compare", "0")
  if (filters.showHidden) params.set("showHidden", "1")
  for (const [key, value] of Object.entries(updates)) {
    if (value === null) params.delete(key)
    else params.set(key, value)
  }
  const query = params.toString()
  return `/admin/reports${query ? `?${query}` : ""}`
}

function money(cents: number) {
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD", maximumFractionDigits: 0 }).format(cents / 100)
}

function csvHref(data: ReportsData) {
  const rows = [
    ["Report", data.tab],
    ["Range", data.rangeLabel],
    ["Service", data.filters.service],
    ["Track", data.filters.track],
    ...data.exportRows,
  ]
  const csv = rows.map((row) => row.map((cell) => `"${String(cell).replaceAll('"', '""')}"`).join(",")).join("\n")
  return `data:text/csv;charset=utf-8,${encodeURIComponent(csv)}`
}

function FilterBar({ data }: { data: ReportsData }) {
  const compareDisabled = data.filters.range === "all"
  return (
    <div className="sticky top-0 z-10 mb-5 rounded-2xl border border-[var(--hairline)] bg-[color-mix(in_srgb,var(--surface-1)_94%,transparent)] p-3 shadow-sm backdrop-blur-xl md:p-4">
      <div className="flex flex-col gap-3 xl:flex-row xl:items-center xl:justify-between">
        <div className="flex min-w-0 flex-col gap-3 lg:flex-row lg:items-center">
          <div className="grid grid-cols-4 rounded-xl bg-[var(--surface-2)] p-1" aria-label="Report range">
            {RANGES.map((range) => (
              <Link
                key={range.key}
                href={queryHref(data.tab, data.filters, { range: range.key === "90" ? null : range.key })}
                aria-current={data.filters.range === range.key ? "page" : undefined}
                className={cn(
                  "rounded-lg px-2.5 py-2 text-center text-[11px] font-semibold text-[var(--text-mid)] transition-colors sm:px-3",
                  data.filters.range === range.key && "bg-[var(--surface-1)] text-[var(--text-hi)] shadow-sm",
                  range.key === "all" && "hidden md:block",
                )}
              >
                <span className="md:hidden">{range.mobile}</span><span className="hidden md:inline">{range.label}</span>
              </Link>
            ))}
          </div>
          <form className="hidden items-center gap-2 md:flex" action="/admin/reports">
            {data.tab !== "overview" ? <input type="hidden" name="tab" value={data.tab} /> : null}
            {data.filters.range !== "90" ? <input type="hidden" name="range" value={data.filters.range} /> : null}
            {!data.filters.compare ? <input type="hidden" name="compare" value="0" /> : null}
            {data.filters.showHidden ? <input type="hidden" name="showHidden" value="1" /> : null}
            <label className="sr-only" htmlFor="reports-service">Service</label>
            <select id="reports-service" name="service" defaultValue={data.filters.service} className="h-9 rounded-lg border border-[var(--hairline)] bg-[var(--surface-1)] px-3 text-xs text-[var(--text-hi)]">
              <option value="all">All services</option><option value="concierge">Full Concierge</option><option value="self_guided">Self-guided</option>
            </select>
            <label className="sr-only" htmlFor="reports-track">Track</label>
            <select id="reports-track" name="track" defaultValue={data.filters.track} className="h-9 rounded-lg border border-[var(--hairline)] bg-[var(--surface-1)] px-3 text-xs text-[var(--text-hi)]">
              <option value="all">All tracks</option><option value="resident">Resident</option><option value="business">Business</option><option value="non_resident">Non-resident</option>
            </select>
            <Button type="submit" variant="outline" size="sm">Apply</Button>
          </form>
          <Link
            href={compareDisabled ? queryHref(data.tab, data.filters) : queryHref(data.tab, data.filters, { compare: data.filters.compare ? "0" : null })}
            role="switch"
            aria-checked={compareDisabled ? false : data.filters.compare}
            aria-disabled={compareDisabled}
            title={compareDisabled ? "Nothing to compare with" : "Compare to the previous equal-length period"}
            className={cn("hidden items-center gap-2 text-xs font-medium text-[var(--text-mid)] lg:flex", compareDisabled && "pointer-events-none opacity-45")}
          >
            <span className={cn("relative h-5 w-9 rounded-full bg-[var(--surface-3)]", data.filters.compare && !compareDisabled && "bg-[var(--signal)]")}>
              <span className={cn("absolute left-0.5 top-0.5 size-4 rounded-full bg-[var(--surface-1)] shadow transition-transform", data.filters.compare && !compareDisabled && "translate-x-4")} />
            </span>
            Compare to previous period
          </Link>
        </div>
        <div className="hidden items-center justify-end gap-3 md:flex">
          <span className="flex items-center gap-1.5 text-[11px] text-[var(--text-low)]"><LockKeyhole className="size-3.5" />Test clients excluded · times in ET</span>
          {data.filters.isAdmin ? (
            <Link href={queryHref(data.tab, data.filters, { showHidden: data.filters.showHidden ? null : "1" })} className="text-xs font-semibold text-[var(--signal)] underline underline-offset-2">
              {data.filters.showHidden ? "Hide" : "Show"}
            </Link>
          ) : null}
          <Button asChild variant="outline" size="sm"><a href={csvHref(data)} download={`reports-${data.tab}-${data.filters.range}.csv`}><Download className="size-4" />Export</a></Button>
        </div>
      </div>
      {data.includingHidden ? <div className="mt-3 inline-flex rounded-full border border-[var(--warn)]/30 bg-[var(--warn)]/8 px-3 py-1 font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-[var(--warn)]">Including test data</div> : null}
    </div>
  )
}

function MetricCard({ metric, index }: { metric: MetricValue; index: number }) {
  const delta = metric.prior === null ? null : metric.value - metric.prior
  const display = metric.kind === "money" ? money(metric.value) : metric.kind === "percent" ? `${metric.value}%` : metric.value.toLocaleString()
  const deltaText = delta === null ? null : delta === 0 ? "same" : metric.kind === "money" ? `${delta > 0 ? "+" : "−"}${money(Math.abs(delta))}` : metric.kind === "percent" ? `${delta > 0 ? "+" : "−"}${Math.abs(delta)} pts` : `${delta > 0 ? "+" : "−"}${Math.abs(delta)} vs prior`
  return (
    <article className={cn("rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-4 shadow-sm sm:p-5", index === 4 && "hidden md:block")}>
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-low)]">{metric.label}</p>
      <p className="mt-2 font-[family-name:var(--font-title)] text-3xl font-semibold tracking-[-.03em] text-[var(--text-hi)]">{display}</p>
      {deltaText ? <p className={cn("mt-2 flex items-center gap-1 text-xs font-semibold", delta === 0 ? "text-[var(--text-low)]" : delta! > 0 ? "text-[var(--ok)]" : "text-[var(--danger)]")}>
        {delta === 0 ? null : delta! > 0 ? <ArrowUp className="size-3" /> : <ArrowDown className="size-3" />}{deltaText}
      </p> : <p className="mt-2 text-xs text-[var(--text-low)]">Comparison off</p>}
      {metric.note ? <p className={cn("mt-1 text-[11px] text-[var(--text-low)]", metric.label === "Collected" && "text-[var(--comp)]")}>{metric.note}</p> : null}
    </article>
  )
}

function NotEnough({ tab, filters }: { tab: ReportTab; filters: ReportFilters }) {
  return <div className="rounded-2xl border border-dashed border-[var(--hairline-strong)] bg-[var(--surface-2)] px-5 py-10 text-center"><p className="font-[family-name:var(--font-title)] text-xl font-semibold text-[var(--text-hi)]">Not enough cases in this range to show a trend.</p><p className="mt-2 text-sm text-[var(--text-mid)]">Try Last 90 days or This year.</p><Button asChild variant="outline" className="mt-4"><Link href={queryHref(tab, filters, { range: "year" })}>Show this year</Link></Button></div>
}

function Funnel({ rows, rangeLabel }: { rows: FunnelRow[]; rangeLabel: string }) {
  const leads = rows[0]?.count ?? 0
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-5 shadow-sm" aria-labelledby="reports-funnel-title">
      <div className="mb-5"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-low)]">Cohort funnel</p><h2 id="reports-funnel-title" className="mt-1 font-[family-name:var(--font-title)] text-2xl font-semibold text-[var(--text-hi)]">People who started in {rangeLabel}</h2></div>
      <div className="space-y-3" role="img" aria-label={rows.map((row) => `${row.label}: ${row.count}, ${row.percent}%`).join(". ")}>
        {rows.map((row, index) => (
          <div key={row.label}>
            {index > 0 ? <p className="mb-2 pl-3 font-mono text-[9px] uppercase tracking-[.1em] text-[var(--text-low)]">↓ {rows[index - 1].count ? Math.round((row.count / rows[index - 1].count) * 100) : 0}% moved on</p> : null}
            <div className="flex items-center gap-3"><span className="w-16 shrink-0 text-xs font-semibold text-[var(--text-mid)]">{row.label}</span><div className="relative h-9 flex-1 overflow-visible rounded-lg bg-[var(--surface-2)]"><div className="flex h-full min-w-[3px] items-center rounded-lg bg-[var(--signal)] px-2 text-[10px] font-bold text-white" style={{ width: `${leads ? Math.max(2, row.percent) : 0}%` }}>{row.percent >= 25 ? `${row.percent}%` : ""}</div>{row.percent < 25 ? <span className="absolute left-[calc(var(--bar-width)+6px)] top-1/2 -translate-y-1/2 text-[10px] font-semibold text-[var(--text-mid)]" style={{ "--bar-width": `${Math.max(2, row.percent)}%` } as React.CSSProperties}>{row.percent}%</span> : null}</div><span className="w-7 text-right font-mono text-xs font-semibold tabular-nums">{row.count}</span></div>
          </div>
        ))}
      </div>
    </section>
  )
}

function StageChart({ stages }: { stages: StageMetric[] }) {
  const max = Math.max(1, ...stages.flatMap((stage) => [stage.q75 ?? 0, stage.target ?? 0, stage.median ?? 0]))
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-5 shadow-sm" aria-labelledby="stage-time-title">
      <div className="mb-5 flex items-start justify-between gap-4"><div><p className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-low)]">Completed stage visits</p><h2 id="stage-time-title" className="mt-1 font-[family-name:var(--font-title)] text-2xl font-semibold text-[var(--text-hi)]">Time in each stage</h2></div><Link href="/admin/pipeline" className="hidden items-center gap-1 text-xs font-semibold text-[var(--signal)] underline underline-offset-2 sm:flex">Open in Pipeline<ArrowRight className="size-3.5" /></Link></div>
      <div className="space-y-4">
        {stages.map((stage) => {
          const tooFew = stage.n < 5
          const over = !stage.nypd && !tooFew && stage.median !== null && stage.target !== null && stage.median > stage.target
          const left = ((stage.q25 ?? 0) / max) * 100
          const right = ((stage.q75 ?? stage.q25 ?? 0) / max) * 100
          const median = ((stage.median ?? 0) / max) * 100
          const target = ((stage.target ?? 0) / max) * 100
          return <div key={stage.key} role="img" aria-label={`${stage.short}: median ${stage.median === null ? "not available" : `${Math.round(stage.median * 10) / 10} days`}, ${stage.target === null ? "no team target" : `target ${stage.target} days`}, ${stage.n} cases.`}>
            <div className="grid grid-cols-[88px_minmax(0,1fr)_58px_38px] items-center gap-2 sm:grid-cols-[150px_minmax(0,1fr)_72px_46px]">
              <span className={cn("truncate text-xs font-medium", stage.nypd ? "text-[var(--text-low)]" : "text-[var(--text-mid)]")}>{stage.short}</span>
              <div className="relative h-5 rounded-full bg-[var(--surface-2)]">
                {stage.median !== null ? <><span className={cn("absolute top-1/2 h-2 -translate-y-1/2 rounded-full", stage.nypd ? "bg-[var(--surface-3)]" : "bg-[var(--signal-dim)]")} style={{ left: `${left}%`, width: `${Math.max(1, right - left)}%` }} /><span className="absolute top-0 h-5 w-0.5 bg-[var(--signal)]" style={{ left: `${median}%` }} /></> : null}
                {stage.target !== null && !stage.nypd ? <span className="absolute top-0 h-5 border-l border-dashed border-[var(--danger)]" style={{ left: `${target}%` }} /> : null}
              </div>
              <span title={tooFew ? "Too few cases to judge" : over ? "Over target" : undefined} className={cn("text-right font-mono text-[11px] font-semibold tabular-nums", tooFew || stage.nypd ? "text-[var(--text-low)]" : over ? "text-[var(--danger)]" : "text-[var(--text-hi)]")}>{stage.median === null ? "—" : `${Math.round(stage.median * 10) / 10}d`}</span>
              <span className="text-right font-mono text-[9px] text-[var(--text-low)]">n={stage.n}</span>
            </div>
          </div>
        })}
      </div>
      <div className="mt-5 flex flex-wrap gap-x-5 gap-y-2 border-t border-[var(--hairline)] pt-4 text-[10px] text-[var(--text-low)]"><span>│ Median</span><span>▬ Middle half of cases</span><span className="text-[var(--danger)]">┊ Target (red if over)</span><span>Grey = NYPD time / too few cases</span></div>
    </section>
  )
}

function PartialErrors({ errors }: { errors: string[] }) {
  if (!errors.length) return null
  return <div className="mb-5 space-y-2">{errors.map((section) => <div key={section} className="flex items-center justify-between rounded-xl border border-[var(--danger)]/25 bg-[var(--danger)]/5 px-4 py-3 text-sm"><span className="flex items-center gap-2 text-[var(--danger)]"><TriangleAlert className="size-4" />Couldn&apos;t load {section}.</span><Link href="/admin/reports" className="flex items-center gap-1 font-semibold text-[var(--signal)] underline"><RotateCcw className="size-3.5" />Retry</Link></div>)}</div>
}

function Overview({ data }: { data: OverviewReportData }) {
  return <>
    <div className="grid grid-cols-2 gap-3 md:grid-cols-3 xl:grid-cols-5">{data.metrics.map((metric, index) => <MetricCard key={metric.label} metric={metric} index={index} />)}</div>
    <div className="mt-5 grid gap-5 xl:grid-cols-[1.15fr_.85fr]">
      {data.tooLittleData ? <NotEnough tab="overview" filters={data.filters} /> : <Funnel rows={data.funnel} rangeLabel={data.rangeLabel} />}
      <div className="hidden space-y-5 md:block">
        <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-5 shadow-sm"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-low)]">Service mix</p><h2 className="mt-1 font-[family-name:var(--font-title)] text-2xl font-semibold">Concierge vs. self-guided</h2><div className="mt-4 grid grid-cols-2 gap-3">{data.services.map((service) => <article key={service.key} className="rounded-xl bg-[var(--surface-2)] p-4"><p className="text-sm font-semibold">{service.label}</p><p className="mt-2 font-[family-name:var(--font-title)] text-3xl font-semibold">{service.clients}</p><p className="mt-1 text-[11px] text-[var(--text-mid)]">{money(service.bookedCents)} booked · <span className="text-[var(--comp)]">{service.comps} comped</span></p></article>)}</div></section>
        <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-5 shadow-sm"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-low)]">Acquisition</p><h2 className="mt-1 font-[family-name:var(--font-title)] text-2xl font-semibold">Where leads come from</h2>{data.leadSources.length === 1 && data.leadSources[0].label === "Unknown" ? <p className="mt-5 rounded-xl bg-[var(--surface-2)] p-4 text-sm text-[var(--text-mid)]">Not tracked yet: sign-ups don&apos;t record a source.</p> : <div className="mt-4 space-y-3">{data.leadSources.map((source) => { const max = Math.max(1, ...data.leadSources.map((row) => row.count)); return <div key={source.label}><div className="mb-1 flex justify-between text-xs"><span>{source.label}</span><span className="font-mono">{source.count}</span></div><div className="h-2 rounded-full bg-[var(--surface-2)]"><div className="h-full rounded-full bg-[var(--brass)]" style={{ width: `${(source.count / max) * 100}%` }} /></div></div>})}</div>}</section>
      </div>
    </div>
    <div className="mt-5 hidden md:block">{data.tooLittleData ? <NotEnough tab="overview" filters={data.filters} /> : <StageChart stages={data.stages} />}</div>
  </>
}

function Bottlenecks({ data }: { data: BottlenecksReportData }) {
  return <div className="hidden md:grid md:gap-5 xl:grid-cols-[1.4fr_1fr]">
    {data.tooLittleData ? <NotEnough tab="bottlenecks" filters={data.filters} /> : <StageChart stages={data.stages} />}
    <div className="space-y-5">
      <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-5 shadow-sm"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-low)]">Biggest slowdown</p>{data.slowdown ? <><h2 className="mt-2 font-[family-name:var(--font-title)] text-[26px] font-semibold leading-tight">{data.slowdown.label}</h2><p className="mt-3 text-sm leading-6 text-[var(--text-mid)]">Median {Math.round(data.slowdown.median! * 10) / 10} days against a {data.slowdown.target}-day target. {data.slowdown.applicant} of {data.slowdown.n} cases waited on the applicant; {data.slowdown.staff} waited on staff.{data.slowdown.unknown ? ` ${data.slowdown.unknown} unknown.` : ""}</p></> : <div className="mt-4 flex items-start gap-3 rounded-xl bg-[var(--ok)]/7 p-4 text-sm text-[var(--ok)]"><CheckCircle2 className="mt-0.5 size-5 shrink-0" /><span>No stage is over its target in this period.</span></div>}</section>
      {data.tooLittleData ? <NotEnough tab="bottlenecks" filters={data.filters} /> : <Funnel rows={data.funnel} rangeLabel={data.rangeLabel} />}
    </div>
  </div>
}

function ServiceCard({ metric }: { metric: ServiceMetric }) {
  const tone = metric.withinPercent === null ? "var(--text-low)" : metric.withinPercent >= 80 ? "var(--ok)" : metric.withinPercent >= 50 ? "var(--warn)" : "var(--danger)"
  return <article className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-5 shadow-sm"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-low)]">Service level</p><h2 className="mt-1 font-[family-name:var(--font-title)] text-2xl font-semibold">{metric.label}</h2>{metric.trackingPending ? <div className="mt-5 rounded-xl bg-[var(--surface-2)] p-4 text-sm text-[var(--text-mid)]">Tracking started {metric.trackingStarted ? new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(new Date(metric.trackingStarted)) : "now"}. Numbers appear once 5 reviews are logged.</div> : <><div className="mt-5 flex items-end justify-between gap-3"><div><p className="font-[family-name:var(--font-title)] text-3xl font-semibold">{formatDuration(metric.median)}</p><p className="mt-1 text-[11px] text-[var(--text-low)]">median · target {metric.target} business day{metric.target === 1 ? "" : "s"} · n={metric.n}</p></div><strong className="text-sm" style={{ color: tone }}>{metric.withinPercent ?? 0}% within target</strong></div><div className="mt-4 h-2.5 overflow-hidden rounded-full bg-[var(--surface-2)]"><div className="h-full rounded-full" style={{ width: `${metric.withinPercent ?? 0}%`, backgroundColor: tone }} /></div></>}<p className="mt-4 text-xs text-[var(--text-mid)]">{metric.open} still waiting</p></article>
}

function ServiceLevels({ data }: { data: ServiceLevelsReportData }) {
  return <div className="hidden md:block"><div className="grid gap-4 lg:grid-cols-3">{data.metrics.map((metric) => <ServiceCard key={metric.key} metric={metric} />)}</div>{data.filters.isAdmin ? <section className="mt-5 overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] shadow-sm"><div className="p-5"><p className="font-mono text-[10px] font-semibold uppercase tracking-[.12em] text-[var(--text-low)]">Admin view</p><h2 className="mt-1 font-[family-name:var(--font-title)] text-2xl font-semibold">Service levels by staff member</h2></div><div className="overflow-x-auto"><table className="w-full min-w-[680px] border-collapse text-left text-sm"><thead className="bg-[var(--surface-2)] font-mono text-[9px] uppercase tracking-[.1em] text-[var(--text-low)]"><tr><th className="px-5 py-3">Staff member</th><th className="px-5 py-3">Replies</th><th className="px-5 py-3">Median reply</th><th className="px-5 py-3">Docs reviewed</th><th className="px-5 py-3">Median review</th></tr></thead><tbody>{data.staff.length ? data.staff.map((row) => <tr key={row.id} className="border-t border-[var(--hairline)]"><td className="px-5 py-4 font-semibold">{row.name}</td><td className="px-5 py-4 font-mono">{row.replies}</td><td className={cn("px-5 py-4 font-mono", row.replyMedian !== null && row.replyMedian > 1 && "text-[var(--danger)]")}>{formatDuration(row.replyMedian)}</td><td className="px-5 py-4 font-mono">{row.documents}</td><td className={cn("px-5 py-4 font-mono", row.documentMedian !== null && row.documentMedian > 2 && "text-[var(--danger)]")}>{formatDuration(row.documentMedian)}</td></tr>) : <tr><td colSpan={5} className="px-5 py-10 text-center text-[var(--text-low)]">No completed service events in this period.</td></tr>}</tbody></table></div><footer className="border-t border-[var(--hairline)] px-5 py-4 text-xs text-[var(--text-low)]"><LockKeyhole className="mr-1 inline size-3.5" />Shown to admins only. Used to balance workload, not to rank people publicly.</footer></section> : null}</div>
}

export function ReportsWorkspace({ data }: { data: ReportsData }) {
  return <div className="mx-auto max-w-[1520px] pb-16 md:pb-0">
    <header className="mb-4"><h1 className="font-[family-name:var(--font-title)] text-[34px] font-semibold leading-none tracking-[-.03em] text-[var(--text-hi)]">Reports</h1><p className="mt-2 text-sm text-[var(--text-mid)]">How the business is doing: leads, conversion, money and how long cases take.</p><nav className="mt-5 hidden border-b border-[var(--hairline)] md:flex" role="tablist" aria-label="Report views">{TABS.map((tab) => <Link key={tab.key} href={queryHref(tab.key, data.filters)} role="tab" aria-selected={data.tab === tab.key} className={cn("border-b-2 border-transparent px-4 py-3 text-sm font-semibold text-[var(--text-mid)]", data.tab === tab.key && "border-[var(--signal)] text-[var(--signal)]")}>{tab.label}</Link>)}</nav></header>
    <FilterBar data={data} />
    <PartialErrors errors={data.errors} />
    {data.tab === "overview" ? <Overview data={data} /> : data.tab === "bottlenecks" ? <Bottlenecks data={data} /> : <ServiceLevels data={data} />}
    <div className="mt-5 md:hidden">{data.tab !== "overview" ? <p className="rounded-xl bg-[var(--surface-2)] p-4 text-center text-sm text-[var(--text-mid)]">Overview is the mobile report. Open this page on a larger screen for {data.tab === "service" ? "service levels" : "bottlenecks"}.</p> : null}<p className="mt-4 text-center text-xs text-[var(--text-low)]">See full reports on a larger screen</p></div>
    <Link href="/admin/reports/coverage" className="mt-5 flex items-center justify-between gap-4 rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-4 shadow-sm transition-colors hover:bg-[var(--surface-2)]"><span className="flex min-w-0 items-center gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-[var(--signal-dim)] text-[var(--signal)]"><Map className="size-5" /></span><span><strong className="block text-sm">Application coverage report</strong><span className="mt-0.5 hidden text-xs text-[var(--text-mid)] sm:block">Every official application field mapped to where we capture it, with gaps flagged.</span></span></span><span className="flex shrink-0 items-center gap-1 text-xs font-semibold text-[var(--signal)]">Open<ArrowRight className="size-4" /></span></Link>
  </div>
}
