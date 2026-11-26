import Link from "next/link"
import { Bot, CheckCircle2, CircleAlert, ExternalLink, ShieldCheck } from "lucide-react"
import { runEditorialAutomationNow, toggleEditorialSource } from "@/app/admin/seo/automation-actions"
import { AutomationRunButton } from "@/components/admin/automation-run-button"
import { loadSeoDesk } from "@/lib/admin/seo"
import { requireAdmin } from "@/lib/auth"
import { cn } from "@/lib/utils"

export const metadata = { title: { absolute: "Editorial automation · Staff" } }

type SearchParams = Record<string, string | string[] | undefined>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function timestamp(value: string | null | undefined) {
  if (!value) return "Never"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value))
}

const STATUS_TONE: Record<string, string> = {
  completed: "bg-[#EAF8F0] text-[#18794E]",
  running: "bg-[#E8F2FF] text-[#175CD3]",
  skipped: "bg-[#FFF4D8] text-[#8A5B00]",
  failed: "bg-red-50 text-red-700",
}

export default async function EditorialAutomationPage({ searchParams }: { searchParams: Promise<SearchParams> }) {
  await requireAdmin()
  const [data, params] = await Promise.all([loadSeoDesk(), searchParams])
  const notice = first(params.notice)
  const error = first(params.error)

  return (
    <div className="mx-auto max-w-[1320px] pb-16">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <Link href="/admin/seo" className="text-xs font-semibold text-[var(--signal)] underline underline-offset-4">← SEO desk</Link>
          <p className="mt-4 font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--signal)]">Growth · Automation</p>
          <h1 className="mt-2 font-[family-name:var(--font-title)] text-[34px] font-semibold leading-none tracking-[-.03em] text-[var(--text-hi)] sm:text-[40px]">Editorial autopilot</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-[var(--text-mid)]">The system does the source research, topic selection, writing, SEO description and internal linking. You supervise the evidence, make any edits and decide what becomes public.</p>
        </div>
        <form action={runEditorialAutomationNow} className="w-full lg:w-[280px]"><AutomationRunButton /></form>
      </header>

      {notice ? <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#74C69D]/35 bg-[#EAF8F0] px-4 py-3 text-sm text-[#18794E]"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />{notice}</div> : null}
      {error || data.error ? <div className="mb-4 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{error || data.error}</div> : null}

      <section className="grid gap-3 md:grid-cols-4" aria-label="Automation safeguards">
        {[
          ["Schedule", "Monday + Thursday"],
          ["Output", "Private draft only"],
          ["Backlog stop", "6 pending drafts"],
          ["Publishing", "Human approval only"],
        ].map(([label, value]) => <div key={label} className="rounded-2xl border border-[var(--hairline)] bg-white p-4 shadow-sm"><p className="font-mono text-[9px] uppercase tracking-[.14em] text-[var(--text-low)]">{label}</p><p className="mt-2 text-sm font-semibold text-[var(--text-hi)]">{value}</p></div>)}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_420px]">
        <section className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-white shadow-sm" aria-labelledby="sources-title">
          <div className="border-b border-[var(--hairline)] p-5"><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[var(--text-low)]">Evidence boundary</p><h2 id="sources-title" className="mt-1 font-[family-name:var(--font-title)] text-2xl font-semibold">Approved source library</h2><p className="mt-2 text-xs leading-5 text-[var(--text-mid)]">Automation can read only these curated government pages. Pausing a source removes it from future research runs.</p></div>
          <div>
            {data.sources.map((source) => (
              <article key={source.id} className="border-b border-[var(--hairline)] p-5 last:border-0">
                <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2"><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", source.active ? "bg-[#EAF8F0] text-[#18794E]" : "bg-[#EEF2F7] text-[#667085]")}>{source.active ? "Active" : "Paused"}</span><span className="font-mono text-[9px] uppercase tracking-[.12em] text-[var(--text-low)]">{source.source_type.replaceAll("_", " ")}</span></div>
                    <h3 className="mt-2 text-sm font-semibold text-[var(--text-hi)]">{source.name}</h3>
                    <p className="mt-1 text-xs text-[var(--text-low)]">{source.organization}</p>
                    <div className="mt-3 flex flex-wrap items-center gap-3"><a href={source.url} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--signal)] underline underline-offset-4">Open official page<ExternalLink className="size-3.5" aria-hidden /></a><span className="text-[11px] text-[var(--text-low)]">Last read: {timestamp(source.last_success_at)}</span></div>
                    {source.last_error ? <p className="mt-2 text-[11px] leading-5 text-red-700">Latest check: {source.last_error}</p> : null}
                  </div>
                  <form action={toggleEditorialSource}>
                    <input type="hidden" name="id" value={source.id} />
                    <input type="hidden" name="active" value={source.active ? "false" : "true"} />
                    <button className="min-h-10 rounded-lg border border-[var(--hairline)] bg-white px-3 text-xs font-semibold text-[var(--text-hi)] hover:bg-[var(--surface-2)]">{source.active ? "Pause source" : "Enable source"}</button>
                  </form>
                </div>
              </article>
            ))}
          </div>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[var(--hairline)] bg-[#14254A] p-5 text-white shadow-sm" aria-labelledby="workflow-title">
            <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-white/10 text-[#E4C473]"><Bot className="size-5" aria-hidden /></span><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[#AAB6CD]">What happens automatically</p><h2 id="workflow-title" className="font-[family-name:var(--font-title)] text-xl font-semibold">Source to review queue</h2></div></div>
            <ol className="mt-4 space-y-3 text-xs leading-5 text-[#D0D8E7]"><li><strong className="text-white">1. Research:</strong> reads the approved live source pages.</li><li><strong className="text-white">2. Choose:</strong> avoids topics already in the library or queue.</li><li><strong className="text-white">3. Draft:</strong> creates original copy, metadata, citations and internal links.</li><li><strong className="text-white">4. Stop:</strong> leaves the article private for fact and legal review.</li></ol>
          </section>

          <section className="rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-sm" aria-labelledby="runs-title">
            <div className="flex items-center gap-2"><ShieldCheck className="size-5 text-[var(--signal)]" aria-hidden /><h2 id="runs-title" className="font-semibold">Recent automation runs</h2></div>
            <div className="mt-4 space-y-3">
              {data.runs.length ? data.runs.map((run) => <div key={run.id} className="rounded-xl bg-[var(--surface-2)] p-3"><div className="flex items-center justify-between gap-3"><span className={cn("rounded-full px-2 py-1 text-[10px] font-semibold", STATUS_TONE[run.status] || "bg-[#EEF2F7] text-[#667085]")}>{run.status}</span><span className="text-[10px] text-[var(--text-low)]">{timestamp(run.started_at)}</span></div><p className="mt-2 text-xs text-[var(--text-mid)]">{run.draft_count ? `${run.draft_count} draft created from ${run.source_count} sources.` : run.skip_reason || run.error_message || `${run.trigger} run`}</p>{run.article_id ? <Link href={`/admin/seo/articles/${run.article_id}`} className="mt-2 inline-flex min-h-9 items-center text-xs font-semibold text-[var(--signal)] underline underline-offset-4">Open draft</Link> : null}</div>) : <p className="text-xs text-[var(--text-low)]">No runs yet. Use the button above to create the first draft.</p>}
            </div>
          </section>
        </aside>
      </div>
    </div>
  )
}
