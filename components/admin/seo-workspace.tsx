import Link from "next/link"
import {
  Bot,
  BookOpenText,
  CheckCircle2,
  CircleAlert,
  Clock3,
  ExternalLink,
  FileCheck2,
  FilePenLine,
  Plus,
  SearchCheck,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import { createSeoItem, recordSeoLegalReview, updateSeoItemStatus } from "@/app/admin/seo/actions"
import { runEditorialAutomationNow } from "@/app/admin/seo/automation-actions"
import { AutomationRunButton } from "@/components/admin/automation-run-button"
import {
  SEO_KIND_LABELS,
  SEO_PRIORITY_LABELS,
  SEO_STATUS_LABELS,
  SEO_STATUSES,
  type SeoDeskData,
  type BlogArticleSummary,
  type SeoItem,
  type SeoStatus,
} from "@/lib/admin/seo"
import { cn } from "@/lib/utils"

type View = "active" | SeoStatus

const ACTIVE_STATUSES: SeoStatus[] = ["idea", "drafting", "review", "approved", "scheduled"]

const STATUS_TONE: Record<SeoStatus, string> = {
  idea: "bg-[#EEF2F7] text-[#475467]",
  drafting: "bg-[#E8F2FF] text-[#175CD3]",
  review: "bg-[#FFF4D8] text-[#8A5B00]",
  approved: "bg-[#EAF8F0] text-[#18794E]",
  scheduled: "bg-[#F2ECFF] text-[#6941C6]",
  published: "bg-[#E8F7F5] text-[#087B6D]",
  archived: "bg-[#F2F4F7] text-[#667085]",
}

function safeSources(item: SeoItem) {
  return Array.isArray(item.source_urls)
    ? item.source_urls.filter((value): value is string => typeof value === "string" && value.startsWith("https://"))
    : []
}

function formatDate(value: string | null | undefined) {
  if (!value) return "No date set"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(`${value.length === 10 ? `${value}T12:00:00Z` : value}`))
}

function formatTimestamp(value: string | null | undefined) {
  if (!value) return "Not run yet"
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    hour: "numeric",
    minute: "2-digit",
    timeZone: "America/New_York",
  }).format(new Date(value))
}

function metricCards(data: SeoDeskData) {
  const active = ACTIVE_STATUSES.reduce((sum, status) => sum + data.counts[status], 0)
  return [
    { label: "Active queue", value: active, note: "ideas through scheduled", icon: FilePenLine },
    { label: "Needs review", value: data.counts.review, note: "waiting on a person", icon: SearchCheck },
    { label: "Published guides", value: data.publishedPosts.length, note: "currently public", icon: BookOpenText },
    { label: "Refresh check", value: data.stalePosts.length, note: "not reviewed in 150 days", icon: Clock3 },
  ]
}

function StatusFilters({ view, counts }: { view: View; counts: SeoDeskData["counts"] }) {
  const tabs: Array<{ key: View; label: string; count: number }> = [
    { key: "active", label: "Active", count: ACTIVE_STATUSES.reduce((sum, status) => sum + counts[status], 0) },
    { key: "idea", label: "Ideas", count: counts.idea },
    { key: "drafting", label: "Drafting", count: counts.drafting },
    { key: "review", label: "Review", count: counts.review },
    { key: "approved", label: "Approved", count: counts.approved },
    { key: "published", label: "Published", count: counts.published },
    { key: "archived", label: "Archived", count: counts.archived },
  ]
  return (
    <nav aria-label="Editorial queue filters" className="flex gap-1 overflow-x-auto border-b border-[var(--hairline)] px-4 sm:px-5">
      {tabs.map((tab) => (
        <Link
          key={tab.key}
          href={tab.key === "active" ? "/admin/seo" : `/admin/seo?view=${tab.key}`}
          aria-current={view === tab.key ? "page" : undefined}
          className={cn(
            "flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent px-2.5 text-xs font-semibold text-[var(--text-mid)]",
            view === tab.key && "border-[var(--signal)] text-[var(--signal)]"
          )}
        >
          {tab.label}
          <span className="rounded-full bg-[var(--surface-2)] px-1.5 py-0.5 font-mono text-[10px] text-[var(--text-low)]">{tab.count}</span>
        </Link>
      ))}
    </nav>
  )
}

function QueueItem({ item, article }: { item: SeoItem; article?: BlogArticleSummary }) {
  const sources = safeSources(item)
  const reviewed = !item.needs_legal_review || Boolean(item.legal_reviewed_at)
  return (
    <article className="border-b border-[var(--hairline)] p-4 last:border-b-0 sm:p-5">
      <div className="flex flex-col gap-4 xl:flex-row xl:items-start xl:justify-between">
        <div className="min-w-0 flex-1">
          <div className="flex flex-wrap items-center gap-2">
            <span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", STATUS_TONE[item.status as SeoStatus])}>
              {SEO_STATUS_LABELS[item.status as SeoStatus]}
            </span>
            <span className="font-mono text-[10px] uppercase tracking-[.12em] text-[var(--text-low)]">
              {SEO_PRIORITY_LABELS[item.priority]} · {SEO_KIND_LABELS[item.kind as keyof typeof SEO_KIND_LABELS]}
            </span>
            {item.needs_legal_review ? (
              <span className={cn("inline-flex items-center gap-1 rounded-full px-2 py-1 text-[10px] font-semibold", reviewed ? "bg-[#EAF8F0] text-[#18794E]" : "bg-[#FFF4D8] text-[#8A5B00]")}>
                {reviewed ? <CheckCircle2 className="size-3" aria-hidden /> : <ShieldCheck className="size-3" aria-hidden />}
                {reviewed ? "Legal boundary reviewed" : "Legal review required"}
              </span>
            ) : null}
          </div>
          <h3 className="mt-3 font-[family-name:var(--font-title)] text-xl font-semibold leading-tight text-[var(--text-hi)] sm:text-2xl">{item.title}</h3>
          {item.summary ? <p className="mt-2 max-w-3xl text-sm leading-6 text-[var(--text-mid)]">{item.summary}</p> : null}
          <dl className="mt-4 grid gap-2 text-xs text-[var(--text-mid)] sm:grid-cols-2">
            <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2.5"><dt className="font-mono text-[9px] uppercase tracking-[.12em] text-[var(--text-low)]">Target question</dt><dd className="mt-1 font-medium text-[var(--text-hi)]">{item.target_query || "Not set"}</dd></div>
            <div className="rounded-xl bg-[var(--surface-2)] px-3 py-2.5"><dt className="font-mono text-[9px] uppercase tracking-[.12em] text-[var(--text-low)]">Working deadline</dt><dd className="mt-1 font-medium text-[var(--text-hi)]">{formatDate(item.due_on)}</dd></div>
          </dl>
          {sources.length ? <div className="mt-3 flex flex-wrap gap-3">{sources.map((source) => <a key={source} href={source} target="_blank" rel="noreferrer" className="inline-flex min-h-10 items-center gap-1.5 text-xs font-semibold text-[var(--signal)] underline underline-offset-4">Open source<ExternalLink className="size-3.5" aria-hidden /></a>)}</div> : null}
        </div>

        <div className="w-full rounded-xl border border-[var(--hairline)] bg-[var(--surface-2)] p-3 xl:w-[310px] xl:shrink-0">
          <Link href={article ? `/admin/seo/articles/${article.id}` : `/admin/seo/new?item=${item.id}`} className="mb-3 inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#D9B25F] px-4 text-sm font-semibold text-[#0F1E3A] hover:bg-[#E4C473]">
            {article ? <FilePenLine className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
            {article ? `Open ${article.status === "published" ? "published article" : "article draft"}` : "Create article draft"}
          </Link>
          <form action={updateSeoItemStatus} className="space-y-3">
            <input type="hidden" name="id" value={item.id} />
            <label className="block text-[11px] font-semibold text-[var(--text-mid)]" htmlFor={`status-${item.id}`}>Workflow status</label>
            <select id={`status-${item.id}`} name="status" defaultValue={item.status} className="min-h-11 w-full rounded-lg border border-[var(--hairline)] bg-white px-3 text-sm text-[var(--text-hi)]">
              {SEO_STATUSES.map((status) => <option key={status} value={status}>{SEO_STATUS_LABELS[status]}</option>)}
            </select>
            <label className="block text-[11px] font-semibold text-[var(--text-mid)]" htmlFor={`url-${item.id}`}>Live URL <span className="font-normal text-[var(--text-low)]">(required for published)</span></label>
            <input id={`url-${item.id}`} name="publishedUrl" type="url" inputMode="url" defaultValue={item.published_url ?? ""} placeholder="https://gunlicensenyc.com/blog/..." className="min-h-11 w-full rounded-lg border border-[var(--hairline)] bg-white px-3 text-sm" />
            <button type="submit" className="min-h-11 w-full rounded-lg bg-[#14254A] px-4 text-sm font-semibold text-white hover:bg-[#203763]">Save status</button>
          </form>
          {item.needs_legal_review && !item.legal_reviewed_at ? (
            <form action={recordSeoLegalReview} className="mt-2">
              <input type="hidden" name="id" value={item.id} />
              <button type="submit" className="min-h-11 w-full rounded-lg border border-[#B98A28]/40 bg-[#FFF8E7] px-3 text-xs font-semibold text-[#7B5200] hover:bg-[#FFF1C8]">Record legal-boundary review</button>
            </form>
          ) : null}
        </div>
      </div>
    </article>
  )
}

function AddOpportunity() {
  return (
    <details className="group rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] shadow-sm" open>
      <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-4 py-3 marker:hidden sm:px-5">
        <span className="flex items-center gap-3"><span className="grid size-9 place-items-center rounded-xl bg-[var(--signal-dim)] text-[var(--signal)]"><Plus className="size-4" aria-hidden /></span><span><strong className="block text-sm">Add an opportunity</strong><span className="text-xs text-[var(--text-low)]">Question, update or refresh</span></span></span>
        <span className="text-xs font-semibold text-[var(--signal)] group-open:hidden">Open</span>
      </summary>
      <form action={createSeoItem} className="space-y-4 border-t border-[var(--hairline)] p-4 sm:p-5">
        <label className="block text-xs font-semibold text-[var(--text-mid)]">Working title<input name="title" required minLength={5} maxLength={180} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--hairline)] bg-white px-3 text-sm" placeholder="Answer one specific NYC applicant question" /></label>
        <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
          <label className="block text-xs font-semibold text-[var(--text-mid)]">Type<select name="kind" defaultValue="applicant_question" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--hairline)] bg-white px-3 text-sm"><option value="applicant_question">Applicant question</option><option value="official_update">Official update</option><option value="guide">Evergreen guide</option><option value="article_refresh">Article refresh</option><option value="news_analysis">News analysis</option></select></label>
          <label className="block text-xs font-semibold text-[var(--text-mid)]">Priority<select name="priority" defaultValue="2" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--hairline)] bg-white px-3 text-sm"><option value="1">High priority</option><option value="2">Next up</option><option value="3">Backlog</option><option value="4">Someday</option></select></label>
        </div>
        <label className="block text-xs font-semibold text-[var(--text-mid)]">Question people search<input name="targetQuery" maxLength={180} className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--hairline)] bg-white px-3 text-sm" placeholder="nyc gun license proof of residence" /></label>
        <label className="block text-xs font-semibold text-[var(--text-mid)]">Primary source<input name="sourceUrl" type="url" inputMode="url" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--hairline)] bg-white px-3 text-sm" placeholder="https://www.nyc.gov/..." /></label>
        <label className="block text-xs font-semibold text-[var(--text-mid)]">Editorial brief<textarea name="summary" maxLength={1200} rows={4} className="mt-1.5 w-full rounded-lg border border-[var(--hairline)] bg-white px-3 py-2.5 text-sm" placeholder="What should the reader understand, and what original value will we add?" /></label>
        <label className="block text-xs font-semibold text-[var(--text-mid)]">Working deadline<input name="dueOn" type="date" className="mt-1.5 min-h-11 w-full rounded-lg border border-[var(--hairline)] bg-white px-3 text-sm" /></label>
        <label className="flex min-h-11 items-start gap-3 rounded-xl bg-[#FFF8E7] p-3 text-xs leading-5 text-[#6D4C00]"><input name="needsLegalReview" type="checkbox" defaultChecked className="mt-1 size-4 accent-[#14254A]" /><span><strong className="block">Legal-boundary review required</strong>Keep checked for licensing rules, legal claims and news analysis.</span></label>
        <button type="submit" className="min-h-11 w-full rounded-lg bg-[#D9B25F] px-4 text-sm font-semibold text-[#0F1E3A] hover:bg-[#E4C473]">Add to editorial queue</button>
      </form>
    </details>
  )
}

function AutomationCard({ data }: { data: SeoDeskData }) {
  const lastRun = data.runs[0]
  const activeSources = data.sources.filter((source) => source.active)
  const sourceProblems = activeSources.filter((source) => source.last_error && !source.last_success_at)
  const statusLabel = lastRun?.status === "completed"
    ? "Draft created"
    : lastRun?.status === "failed"
      ? "Needs attention"
      : lastRun?.status === "skipped"
        ? "Paused safely"
        : lastRun?.status === "running"
          ? "Running now"
          : "Ready"
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[#14254A] p-5 text-white shadow-sm" aria-labelledby="automation-title">
      <div className="flex items-start gap-3">
        <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/10 text-[#E4C473]"><Bot className="size-5" aria-hidden /></span>
        <div className="min-w-0"><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[#AAB6CD]">Supervised automation</p><h2 id="automation-title" className="font-[family-name:var(--font-title)] text-xl font-semibold">Research-to-draft engine</h2></div>
      </div>
      <p className="mt-3 text-xs leading-5 text-[#D0D8E7]">Twice a week the system reads approved government sources, chooses a useful non-duplicate topic, writes the article, fills its SEO fields and sends it here for your approval.</p>
      <dl className="mt-4 grid grid-cols-2 gap-2 text-xs">
        <div className="rounded-xl bg-white/[.07] p-3"><dt className="text-[#AAB6CD]">Current status</dt><dd className="mt-1 font-semibold text-[#F5D98E]">{statusLabel}</dd></div>
        <div className="rounded-xl bg-white/[.07] p-3"><dt className="text-[#AAB6CD]">Approved sources</dt><dd className="mt-1 font-semibold text-white">{activeSources.length}</dd></div>
        <div className="rounded-xl bg-white/[.07] p-3"><dt className="text-[#AAB6CD]">Waiting on you</dt><dd className="mt-1 font-semibold text-white">{`${data.pendingDrafts} ${data.pendingDrafts === 1 ? "draft" : "drafts"}`}</dd></div>
        <div className="rounded-xl bg-white/[.07] p-3"><dt className="text-[#AAB6CD]">Last run</dt><dd className="mt-1 font-semibold text-white">{formatTimestamp(lastRun?.started_at)}</dd></div>
      </dl>
      {lastRun?.skip_reason || lastRun?.error_message ? <p className="mt-3 rounded-lg bg-white/[.08] px-3 py-2 text-[11px] leading-5 text-[#F5D98E]">{lastRun.skip_reason || lastRun.error_message}</p> : null}
      {sourceProblems.length ? <p className="mt-3 text-[11px] leading-5 text-[#FFCFCC]">{sourceProblems.length} source{sourceProblems.length === 1 ? "" : "s"} could not be read yet. The other approved sources remain available.</p> : null}
      <form action={runEditorialAutomationNow} className="mt-4"><AutomationRunButton /></form>
      <Link href="/admin/seo/automation" className="mt-3 inline-flex min-h-10 w-full items-center justify-center text-xs font-semibold text-[#F5D98E] underline underline-offset-4">View sources and run history</Link>
      <p className="mt-3 text-[11px] leading-5 text-[#AAB6CD]">Nothing publishes automatically. The engine pauses at six pending drafts so quality never turns into volume for volume&apos;s sake.</p>
    </section>
  )
}

function LibraryCard({ data }: { data: SeoDeskData }) {
  return (
    <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-5 shadow-sm" aria-labelledby="library-title">
      <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[var(--text-low)]">Public library</p><h2 id="library-title" className="mt-1 font-[family-name:var(--font-title)] text-xl font-semibold">Recently published</h2></div><FileCheck2 className="size-5 text-[var(--signal)]" aria-hidden /></div>
      <div className="mt-4 space-y-3">
        {data.publishedPosts.slice(0, 5).map((post) => <div key={post.slug} className="border-b border-[var(--hairline)] pb-3 last:border-0 last:pb-0"><Link href={`/blog/${post.slug}`} target="_blank" className="text-sm font-semibold leading-5 text-[var(--text-hi)] underline-offset-4 hover:underline">{post.title}</Link><p className="mt-1 text-[11px] text-[var(--text-low)]">Reviewed {formatDate(post.updated ?? post.date)}</p></div>)}
      </div>
      <Link href="/blog" target="_blank" className="mt-4 inline-flex min-h-10 items-center text-xs font-semibold text-[var(--signal)] underline underline-offset-4">View public blog</Link>
    </section>
  )
}

export function SeoWorkspace({ data, view, notice, error }: { data: SeoDeskData; view: View; notice?: string; error?: string }) {
  const visibleItems = data.items.filter((item) => view === "active" ? ACTIVE_STATUSES.includes(item.status as SeoStatus) : item.status === view)
  const metrics = metricCards(data)
  return (
    <div className="mx-auto max-w-[1520px] pb-16 md:pb-0">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div><p className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-[var(--signal)]">Growth · Editorial</p><h1 className="mt-2 font-[family-name:var(--font-title)] text-[34px] font-semibold leading-none tracking-[-.03em] text-[var(--text-hi)] sm:text-[40px]">SEO desk</h1><p className="mt-3 max-w-2xl text-sm leading-6 text-[var(--text-mid)]">Turn real applicant questions and verified updates into original, useful articles. Automation organizes the work; a person approves every public claim.</p></div>
        <div className="flex flex-wrap gap-2"><Link href="/admin/seo/new" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#D9B25F] px-4 text-sm font-semibold text-[#0F1E3A] hover:bg-[#E4C473]"><Plus className="size-4" aria-hidden />New article</Link><Link href="/admin/reports" className="inline-flex min-h-11 items-center rounded-lg border border-[var(--hairline)] bg-white px-4 text-sm font-semibold text-[var(--text-hi)] hover:bg-[var(--surface-2)]">Business reports</Link><Link href="/blog" target="_blank" className="inline-flex min-h-11 items-center rounded-lg bg-[#14254A] px-4 text-sm font-semibold text-white hover:bg-[#203763]">Open public blog</Link></div>
      </header>

      {notice ? <div className="mb-4 flex items-start gap-2 rounded-xl border border-[#74C69D]/35 bg-[#EAF8F0] px-4 py-3 text-sm text-[#18794E]"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />{notice}</div> : null}
      {error || data.error ? <div className="mb-4 flex items-start gap-2 rounded-xl border border-[var(--danger)]/25 bg-[var(--danger)]/5 px-4 py-3 text-sm text-[var(--danger)]"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{error || data.error}</div> : null}

      <section aria-label="Editorial overview" className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        {metrics.map(({ label, value, note, icon: Icon }) => <article key={label} className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-4 shadow-sm sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.14em] text-[var(--text-low)]">{label}</p><p className="mt-2 font-[family-name:var(--font-title)] text-3xl font-semibold text-[var(--text-hi)]">{value}</p></div><span className="grid size-9 place-items-center rounded-xl bg-[var(--signal-dim)] text-[var(--signal)]"><Icon className="size-4" aria-hidden /></span></div><p className="mt-2 text-[11px] text-[var(--text-low)]">{note}</p></article>)}
      </section>

      <div className="mt-5 grid gap-5 xl:grid-cols-[minmax(0,1fr)_360px]">
        <section className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] shadow-sm" aria-labelledby="queue-title">
          <div className="flex items-start justify-between gap-4 p-4 pb-3 sm:p-5 sm:pb-3"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[var(--text-low)]">Human-controlled workflow</p><h2 id="queue-title" className="mt-1 font-[family-name:var(--font-title)] text-2xl font-semibold">Editorial queue</h2></div><Sparkles className="size-5 text-[var(--brass)]" aria-hidden /></div>
          <StatusFilters view={view} counts={data.counts} />
          {visibleItems.length ? visibleItems.map((item) => <QueueItem key={item.id} item={item} article={data.articles.find((article) => article.seo_content_item_id === item.id)} />) : <div className="px-5 py-14 text-center"><BookOpenText className="mx-auto size-7 text-[var(--text-low)]" aria-hidden /><p className="mt-3 text-sm font-semibold text-[var(--text-hi)]">Nothing in this view</p><p className="mt-1 text-xs text-[var(--text-low)]">Add an opportunity or choose another filter.</p></div>}
        </section>

        <aside className="space-y-5">
          <AddOpportunity />
          <AutomationCard data={data} />
          <LibraryCard data={data} />
          <section className="rounded-2xl border border-[#D9B25F]/35 bg-[#FFF8E7] p-5 text-[#5D430B]" aria-labelledby="guardrail-title"><div className="flex items-center gap-2"><ShieldCheck className="size-5" aria-hidden /><h2 id="guardrail-title" className="font-semibold">Publication guardrail</h2></div><ul className="mt-3 space-y-2 text-xs leading-5"><li>Use primary government sources for licensing rules.</li><li>Never copy or lightly rewrite a news article.</li><li>No legal advice, invented citations or outcome promises.</li><li>The applicant always controls and submits the NYPD application.</li></ul></section>
        </aside>
      </div>
    </div>
  )
}
