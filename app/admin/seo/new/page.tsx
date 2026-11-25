import Link from "next/link"
import { ArrowLeft, BookOpenText, CheckCircle2, CircleAlert, FileText, ShieldCheck, Sparkles } from "lucide-react"
import { createArticle } from "@/app/admin/seo/articles/actions"
import { loadArticleSetup } from "@/lib/admin/articles"
import { BLOG_AI_ENABLED } from "@/lib/blog/generator"
import { requireAdmin } from "@/lib/auth"

export const metadata = { title: { absolute: "New article · Staff" } }

type SearchParams = Promise<Record<string, string | string[] | undefined>>

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value
}

function sourceText(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").join("\n") : ""
}

export default async function NewArticlePage({ searchParams }: { searchParams: SearchParams }) {
  await requireAdmin()
  const params = await searchParams
  const item = await loadArticleSetup(first(params.item))
  const error = first(params.error)

  return (
    <div className="mx-auto max-w-[1160px] pb-16">
      <Link href="/admin/seo" className="inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-[var(--text-mid)] hover:text-[var(--text-hi)]">
        <ArrowLeft className="size-4" aria-hidden /> Back to SEO desk
      </Link>

      <header className="mt-3 grid gap-5 rounded-3xl bg-[#14254A] p-6 text-white shadow-sm md:grid-cols-[minmax(0,1fr)_300px] md:p-8">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[.18em] text-[#E4C473]">Article studio</p>
          <h1 className="mt-3 font-[family-name:var(--font-title)] text-4xl font-semibold tracking-[-.03em] sm:text-5xl">Start with a clear brief.</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#D0D8E7]">The studio creates a private, editable draft. Nothing becomes public until a person completes the source, fact-check and legal-boundary gates.</p>
        </div>
        <div className="rounded-2xl border border-white/10 bg-white/[.07] p-4">
          <div className="flex items-center gap-3"><span className="grid size-10 place-items-center rounded-xl bg-[#E4C473]/15 text-[#F5D98E]"><Sparkles className="size-5" aria-hidden /></span><div><p className="text-xs text-[#AAB6CD]">Draft mode</p><p className="text-sm font-semibold">{BLOG_AI_ENABLED ? "AI-assisted writing" : "Guided outline"}</p></div></div>
          <p className="mt-3 text-xs leading-5 text-[#AAB6CD]">{BLOG_AI_ENABLED ? "Uses only the brief and notes you provide; unsupported claims are marked for verification." : "Creates a safe structure with verification prompts. The full editor works without an AI key."}</p>
        </div>
      </header>

      {error ? <div className="mt-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{error}</div> : null}

      <form action={createArticle} className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_320px]">
        <input type="hidden" name="seoItemId" value={item?.id ?? ""} />
        <section className="space-y-5 rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-sm sm:p-7" aria-labelledby="article-brief-title">
          <div className="flex items-center gap-3 border-b border-[var(--hairline)] pb-5"><span className="grid size-10 place-items-center rounded-xl bg-[var(--signal-dim)] text-[var(--signal)]"><FileText className="size-5" aria-hidden /></span><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[var(--text-low)]">Step one</p><h2 id="article-brief-title" className="font-[family-name:var(--font-title)] text-2xl font-semibold">Describe the article</h2></div></div>

          <label className="block text-sm font-semibold text-[var(--text-hi)]">Working title
            <input name="title" required minLength={5} maxLength={180} defaultValue={item?.title ?? ""} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 text-base" placeholder="How to show proof of residence for an NYC handgun license" />
          </label>
          <label className="block text-sm font-semibold text-[var(--text-hi)]">Search description <span className="font-normal text-[var(--text-low)]">(you can refine it later)</span>
            <textarea name="description" maxLength={180} rows={2} className="mt-2 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 py-3 text-sm" placeholder="A factual 50–160 character summary shown in search results." />
          </label>
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="block text-sm font-semibold text-[var(--text-hi)]">Article type
              <select name="kind" defaultValue={item?.kind ?? "applicant_question"} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 text-sm"><option value="applicant_question">Applicant question</option><option value="official_update">Official update</option><option value="guide">Evergreen guide</option><option value="article_refresh">Article refresh</option><option value="news_analysis">News analysis</option></select>
            </label>
            <label className="block text-sm font-semibold text-[var(--text-hi)]">Public category
              <select name="tag" defaultValue="Guide" className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 text-sm"><option>Guide</option><option>Requirements</option><option>Documents</option><option>Process update</option><option>News analysis</option><option>FAQ</option></select>
            </label>
          </div>
          <label className="block text-sm font-semibold text-[var(--text-hi)]">Question people search
            <input name="targetQuery" maxLength={180} defaultValue={item?.target_query ?? ""} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 text-sm" placeholder="nyc gun license proof of residence" />
          </label>
          <label className="block text-sm font-semibold text-[var(--text-hi)]">Editorial brief
            <textarea name="summary" maxLength={4000} rows={6} defaultValue={item?.summary ?? ""} className="mt-2 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 py-3 text-sm leading-6" placeholder="What should the reader understand? What practical, original NYC value should this article add?" />
          </label>
          <label className="block text-sm font-semibold text-[var(--text-hi)]">Source notes <span className="font-normal text-[var(--text-low)]">(facts the draft may use)</span>
            <textarea name="sourceNotes" maxLength={20000} rows={7} className="mt-2 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 py-3 text-sm leading-6" placeholder="Paste your verified notes here. Include the rule, date, agency and which source supports it. Do not paste a copyrighted article." />
          </label>
        </section>

        <aside className="space-y-5">
          <section className="rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-sm" aria-labelledby="sources-title">
            <div className="flex items-center gap-3"><BookOpenText className="size-5 text-[var(--signal)]" aria-hidden /><h2 id="sources-title" className="font-semibold">Sources</h2></div>
            <p className="mt-2 text-xs leading-5 text-[var(--text-low)]">One secure URL per line. Use a primary government source for rules; a news link may provide context but is not legal authority.</p>
            <textarea name="sourceUrls" rows={7} defaultValue={sourceText(item?.source_urls)} className="mt-3 w-full rounded-xl border border-[var(--hairline)] bg-white px-3 py-3 font-mono text-xs leading-5" placeholder={"https://licensing.nypdonline.org/...\nhttps://www.nyc.gov/..."} />
          </section>

          <label className="flex items-start gap-3 rounded-2xl border border-[#D9B25F]/35 bg-[#FFF8E7] p-4 text-sm leading-6 text-[#5D430B]"><input name="needsLegalReview" type="checkbox" defaultChecked={item?.needs_legal_review ?? true} className="mt-1 size-4 accent-[#14254A]" /><span><strong className="flex items-center gap-2"><ShieldCheck className="size-4" aria-hidden />Require legal-boundary review</strong><span className="mt-1 block text-xs leading-5">Keep this on for licensing rules, legal claims, disclosures and news analysis.</span></span></label>

          <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-1)] p-5 shadow-sm">
            <p className="font-semibold text-[var(--text-hi)]">What happens next</p>
            <ol className="mt-3 space-y-3 text-xs leading-5 text-[var(--text-mid)]"><li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#18794E]" aria-hidden />A private draft is created.</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#18794E]" aria-hidden />You edit and preview it.</li><li className="flex gap-2"><CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#18794E]" aria-hidden />Fact and legal checks unlock publishing.</li></ol>
            <button type="submit" className="mt-5 min-h-12 w-full rounded-xl bg-[#D9B25F] px-4 text-sm font-semibold text-[#0F1E3A] shadow-sm hover:bg-[#E4C473]">Create private draft</button>
          </section>
        </aside>
      </form>
    </div>
  )
}

