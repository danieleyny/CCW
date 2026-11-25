"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import {
  Bold,
  BookOpenText,
  Check,
  CheckCircle2,
  Circle,
  CircleAlert,
  ExternalLink,
  Eye,
  FileCheck2,
  Heading2,
  Heading3,
  Link2,
  List,
  RotateCcw,
  Save,
  Send,
  ShieldCheck,
  Sparkles,
} from "lucide-react"
import {
  generateArticle,
  publishArticle,
  recordArticleFactCheck,
  recordArticleLegalReview,
  saveArticle,
  submitArticleForReview,
  unpublishArticle,
} from "@/app/admin/seo/articles/actions"
import type { BlogPostRow, SeoContentRow } from "@/lib/admin/articles"
import { articleWordCount, publicationReadiness } from "@/lib/blog/validation"
import { cn } from "@/lib/utils"

const STATUS_LABEL: Record<string, string> = {
  draft: "Draft",
  review: "In review",
  approved: "Approved",
  published: "Published",
  archived: "Archived",
}

function sourceText(value: unknown) {
  return Array.isArray(value) ? value.filter((entry): entry is string => typeof entry === "string").join("\n") : ""
}

function timestamp(value: string | null) {
  if (!value) return "Not completed"
  return new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", hour: "numeric", minute: "2-digit", timeZone: "America/New_York" }).format(new Date(value))
}

export function ArticleStudio({ article, seoItem, notice, error, aiEnabled }: { article: BlogPostRow; seoItem: SeoContentRow | null; notice?: string; error?: string; aiEnabled: boolean }) {
  const [title, setTitle] = useState(article.title)
  const [slug, setSlug] = useState(article.slug)
  const [description, setDescription] = useState(article.description)
  const [tag, setTag] = useState(article.tag)
  const [targetQuery, setTargetQuery] = useState(article.target_query ?? "")
  const [content, setContent] = useState(article.content_markdown)
  const [sources, setSources] = useState(sourceText(article.source_urls))
  const [sourceNotes, setSourceNotes] = useState(article.source_notes ?? "")
  const [needsLegalReview, setNeedsLegalReview] = useState(article.needs_legal_review)
  const bodyRef = useRef<HTMLTextAreaElement>(null)
  const published = article.status === "published"
  const words = articleWordCount(content)
  const sourceUrls = useMemo(() => sources.split(/[\n,]/).map((value) => value.trim()).filter((value) => value.startsWith("https://")), [sources])
  const readiness = publicationReadiness({ title, slug, description, content, sourceUrls, factCheckedAt: article.fact_checked_at, needsLegalReview, legalReviewedAt: article.legal_reviewed_at })
  const dirty = title !== article.title || slug !== article.slug || description !== article.description || tag !== article.tag || targetQuery !== (article.target_query ?? "") || content !== article.content_markdown || sources !== sourceText(article.source_urls) || sourceNotes !== (article.source_notes ?? "") || needsLegalReview !== article.needs_legal_review

  useEffect(() => {
    const warn = (event: BeforeUnloadEvent) => {
      if (!dirty) return
      event.preventDefault()
    }
    window.addEventListener("beforeunload", warn)
    return () => window.removeEventListener("beforeunload", warn)
  }, [dirty])

  function insertMarkdown(prefix: string, suffix = "", placeholder = "text") {
    const element = bodyRef.current
    if (!element) return
    const start = element.selectionStart
    const end = element.selectionEnd
    const selection = content.slice(start, end) || placeholder
    const next = `${content.slice(0, start)}${prefix}${selection}${suffix}${content.slice(end)}`
    setContent(next)
    requestAnimationFrame(() => {
      element.focus()
      element.setSelectionRange(start + prefix.length, start + prefix.length + selection.length)
    })
  }

  return (
    <div className="mx-auto max-w-[1500px] pb-20">
      <header className="sticky top-0 z-10 -mx-3 mb-5 border-b border-black/10 bg-[#F6F7F9]/95 px-3 py-3 backdrop-blur sm:-mx-5 sm:px-5 lg:-mx-7 lg:px-7">
        <div className="mx-auto flex max-w-[1500px] flex-wrap items-center justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <Link href="/admin/seo" className="inline-flex min-h-11 items-center rounded-lg border border-[var(--hairline)] bg-white px-3 text-sm font-semibold text-[var(--text-hi)] hover:bg-[var(--surface-2)]">SEO desk</Link>
            <div className="min-w-0"><div className="flex items-center gap-2"><span className={cn("rounded-full px-2.5 py-1 text-[10px] font-semibold", published ? "bg-[#E8F7F5] text-[#087B6D]" : article.status === "approved" ? "bg-[#EAF8F0] text-[#18794E]" : article.status === "review" ? "bg-[#FFF4D8] text-[#8A5B00]" : "bg-[#EEF2F7] text-[#475467]")}>{STATUS_LABEL[article.status] || article.status}</span>{dirty ? <span className="text-[11px] font-semibold text-[#8A5B00]">Unsaved changes</span> : <span className="text-[11px] text-[var(--text-low)]">Saved</span>}</div><p className="mt-1 max-w-[44vw] truncate text-xs text-[var(--text-low)]">/blog/{slug}</p></div>
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={`/admin/seo/articles/${article.id}/preview`} target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--hairline)] bg-white px-4 text-sm font-semibold text-[var(--text-hi)] hover:bg-[var(--surface-2)]"><Eye className="size-4" aria-hidden />Preview</Link>
            {published ? <Link href={`/blog/${article.slug}`} target="_blank" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#14254A] px-4 text-sm font-semibold text-white hover:bg-[#203763]">View live<ExternalLink className="size-4" aria-hidden /></Link> : <button form="article-editor" type="submit" className="inline-flex min-h-11 items-center gap-2 rounded-lg bg-[#14254A] px-4 text-sm font-semibold text-white hover:bg-[#203763]"><Save className="size-4" aria-hidden />Save draft</button>}
          </div>
        </div>
      </header>

      {notice ? <div className="mb-5 flex items-start gap-2 rounded-xl border border-[#74C69D]/35 bg-[#EAF8F0] px-4 py-3 text-sm text-[#18794E]"><CheckCircle2 className="mt-0.5 size-4 shrink-0" aria-hidden />{notice}</div> : null}
      {error ? <div className="mb-5 flex items-start gap-2 rounded-xl border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-700"><CircleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />{error}</div> : null}

      <div className="grid gap-5 xl:grid-cols-[minmax(0,1fr)_370px]">
        <form id="article-editor" action={saveArticle} className="min-w-0 space-y-5">
          <input type="hidden" name="id" value={article.id} />
          <section className="rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-sm sm:p-7">
            <div className="flex flex-col gap-4 border-b border-[var(--hairline)] pb-6 sm:flex-row sm:items-start sm:justify-between"><div><p className="font-mono text-[9px] uppercase tracking-[.16em] text-[var(--signal)]">Article studio</p><h1 className="mt-2 font-[family-name:var(--font-title)] text-3xl font-semibold tracking-[-.025em]">Write for one real question.</h1><p className="mt-2 max-w-2xl text-sm leading-6 text-[var(--text-mid)]">Save freely. Reviews reset only when the article actually changes.</p></div><div className="rounded-xl bg-[var(--surface-2)] px-4 py-3 text-right"><p className="font-[family-name:var(--font-title)] text-2xl font-semibold">{words.toLocaleString()}</p><p className="text-[10px] uppercase tracking-[.12em] text-[var(--text-low)]">words</p></div></div>

            <div className="mt-6 space-y-5">
              <label className="block text-sm font-semibold text-[var(--text-hi)]">Article title<input name="title" required minLength={5} maxLength={180} value={title} onChange={(event) => setTitle(event.target.value)} disabled={published} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 text-lg disabled:bg-[var(--surface-2)]" /></label>
              <div className="grid gap-4 sm:grid-cols-[minmax(0,1fr)_180px]">
                <label className="block text-sm font-semibold text-[var(--text-hi)]">Article URL<input name="slug" required maxLength={120} value={slug} onChange={(event) => setSlug(event.target.value.toLowerCase().replace(/[^a-z0-9-]/g, "-"))} disabled={published} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 font-mono text-sm disabled:bg-[var(--surface-2)]" /></label>
                <label className="block text-sm font-semibold text-[var(--text-hi)]">Category<select name="tag" value={tag} onChange={(event) => setTag(event.target.value)} disabled={published} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 text-sm disabled:bg-[var(--surface-2)]"><option>Guide</option><option>Requirements</option><option>Documents</option><option>Process update</option><option>News analysis</option><option>FAQ</option></select></label>
              </div>
              <label className="block text-sm font-semibold text-[var(--text-hi)]">Search description <span className={cn("float-right text-xs font-normal", description.length >= 50 && description.length <= 160 ? "text-[#18794E]" : "text-[var(--text-low)]")}>{description.length}/180</span><textarea name="description" maxLength={180} rows={3} value={description} onChange={(event) => setDescription(event.target.value)} disabled={published} className="mt-2 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 py-3 text-sm leading-6 disabled:bg-[var(--surface-2)]" placeholder="A concise, factual description for search results." /></label>
              <label className="block text-sm font-semibold text-[var(--text-hi)]">Target search question<input name="targetQuery" maxLength={180} value={targetQuery} onChange={(event) => setTargetQuery(event.target.value)} disabled={published} className="mt-2 min-h-12 w-full rounded-xl border border-[var(--hairline)] bg-white px-4 text-sm disabled:bg-[var(--surface-2)]" /></label>
            </div>
          </section>

          <section className="overflow-hidden rounded-2xl border border-[var(--hairline)] bg-white shadow-sm" aria-labelledby="article-body-title">
            <div className="flex flex-wrap items-center justify-between gap-3 border-b border-[var(--hairline)] px-4 py-3 sm:px-5"><div><p className="font-mono text-[9px] uppercase tracking-[.15em] text-[var(--text-low)]">Markdown editor</p><h2 id="article-body-title" className="text-sm font-semibold">Article body</h2></div>{!published ? <div className="flex flex-wrap gap-1" aria-label="Formatting tools"><button type="button" onClick={() => insertMarkdown("## ", "", "Section heading")} aria-label="Insert heading" className="grid size-10 place-items-center rounded-lg text-[var(--text-mid)] hover:bg-[var(--surface-2)]"><Heading2 className="size-4" /></button><button type="button" onClick={() => insertMarkdown("### ", "", "Subheading")} aria-label="Insert subheading" className="grid size-10 place-items-center rounded-lg text-[var(--text-mid)] hover:bg-[var(--surface-2)]"><Heading3 className="size-4" /></button><button type="button" onClick={() => insertMarkdown("**", "**", "important text")} aria-label="Format bold text" className="grid size-10 place-items-center rounded-lg text-[var(--text-mid)] hover:bg-[var(--surface-2)]"><Bold className="size-4" /></button><button type="button" onClick={() => insertMarkdown("- ", "", "List item")} aria-label="Insert list item" className="grid size-10 place-items-center rounded-lg text-[var(--text-mid)] hover:bg-[var(--surface-2)]"><List className="size-4" /></button><button type="button" onClick={() => insertMarkdown("[", "](https://)", "link text")} aria-label="Insert link" className="grid size-10 place-items-center rounded-lg text-[var(--text-mid)] hover:bg-[var(--surface-2)]"><Link2 className="size-4" /></button></div> : null}</div>
            <textarea ref={bodyRef} name="content" value={content} onChange={(event) => setContent(event.target.value)} disabled={published} spellCheck className="min-h-[720px] w-full resize-y bg-white px-5 py-5 font-mono text-[14px] leading-7 text-[var(--text-hi)] outline-none disabled:bg-[var(--surface-2)] sm:px-7" aria-label="Article body in Markdown" />
            <div className="flex flex-wrap items-center justify-between gap-3 border-t border-[var(--hairline)] bg-[var(--surface-2)] px-4 py-3 text-xs text-[var(--text-low)] sm:px-5"><span>Use headings, short paragraphs and source links. HTML and executable MDX are blocked.</span>{!published ? <button type="submit" formAction={generateArticle} className="inline-flex min-h-10 items-center gap-2 rounded-lg border border-[#D9B25F]/45 bg-[#FFF8E7] px-3 font-semibold text-[#6D4C00] hover:bg-[#FFF1C8]"><Sparkles className="size-4" aria-hidden />{aiEnabled ? "Regenerate with AI" : "Reset guided outline"}</button> : null}</div>
          </section>
        </form>

        <aside className="space-y-5 xl:sticky xl:top-24 xl:self-start">
          <section className="rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-sm" aria-labelledby="publish-checks-title">
            <div className="flex items-center justify-between gap-3"><div><p className="font-mono text-[9px] uppercase tracking-[.15em] text-[var(--text-low)]">Publication gate</p><h2 id="publish-checks-title" className="mt-1 font-[family-name:var(--font-title)] text-xl font-semibold">Ready to publish?</h2></div><span className={cn("grid size-10 place-items-center rounded-xl", readiness.ready ? "bg-[#EAF8F0] text-[#18794E]" : "bg-[#FFF4D8] text-[#8A5B00]")}>{readiness.ready ? <Check className="size-5" /> : <ShieldCheck className="size-5" />}</span></div>
            <ul className="mt-4 space-y-2.5">{readiness.checks.map((check) => <li key={check.key} className="flex items-start gap-2 text-xs leading-5 text-[var(--text-mid)]">{check.passed ? <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-[#18794E]" aria-hidden /> : <Circle className="mt-0.5 size-4 shrink-0 text-[var(--text-low)]" aria-hidden />}<span>{check.label}</span></li>)}</ul>
            {dirty ? <p className="mt-4 rounded-lg bg-[#FFF4D8] px-3 py-2 text-xs leading-5 text-[#7B5200]">Save your latest changes before using the review or publish controls.</p> : null}
          </section>

          <section className="rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-sm" aria-labelledby="workflow-title">
            <div className="flex items-center gap-2"><FileCheck2 className="size-5 text-[var(--signal)]" aria-hidden /><h2 id="workflow-title" className="font-semibold">Review workflow</h2></div>
            <div className="mt-4 space-y-3">
              <div className="rounded-xl bg-[var(--surface-2)] p-3"><p className="text-xs font-semibold text-[var(--text-hi)]">Human fact-check</p><p className="mt-1 text-[11px] text-[var(--text-low)]">{timestamp(article.fact_checked_at)}</p>{!article.fact_checked_at && !published ? <form action={recordArticleFactCheck} className="mt-3"><input type="hidden" name="id" value={article.id} /><button disabled={dirty || article.status === "draft"} className="min-h-10 w-full rounded-lg border border-[var(--hairline)] bg-white px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45">Record fact-check</button></form> : null}</div>
              {needsLegalReview ? <div className="rounded-xl bg-[#FFF8E7] p-3 text-[#5D430B]"><p className="text-xs font-semibold">Legal-boundary review</p><p className="mt-1 text-[11px] opacity-75">{timestamp(article.legal_reviewed_at)}</p>{!article.legal_reviewed_at && !published ? <form action={recordArticleLegalReview} className="mt-3"><input type="hidden" name="id" value={article.id} /><button disabled={dirty || article.status === "draft"} className="min-h-10 w-full rounded-lg border border-[#D9B25F]/40 bg-white px-3 text-xs font-semibold disabled:cursor-not-allowed disabled:opacity-45">Record legal review</button></form> : null}</div> : null}
            </div>
            {!published && article.status === "draft" ? <form action={submitArticleForReview} className="mt-4"><input type="hidden" name="id" value={article.id} /><button disabled={dirty} className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg bg-[#14254A] px-4 text-sm font-semibold text-white disabled:cursor-not-allowed disabled:opacity-45"><Send className="size-4" aria-hidden />Submit for review</button></form> : null}
            {!published && readiness.ready && !dirty ? <form action={publishArticle} className="mt-3"><input type="hidden" name="id" value={article.id} /><button className="inline-flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-[#D9B25F] px-4 text-sm font-semibold text-[#0F1E3A] hover:bg-[#E4C473]"><BookOpenText className="size-4" aria-hidden />Publish article</button></form> : null}
            {published ? <form action={unpublishArticle} className="mt-4"><input type="hidden" name="id" value={article.id} /><button className="inline-flex min-h-11 w-full items-center justify-center gap-2 rounded-lg border border-red-200 bg-red-50 px-4 text-sm font-semibold text-red-700 hover:bg-red-100"><RotateCcw className="size-4" aria-hidden />Unpublish to edit</button></form> : null}
          </section>

          <section className="rounded-2xl border border-[var(--hairline)] bg-white p-5 shadow-sm" aria-labelledby="source-evidence-title">
            <div className="flex items-center gap-2"><BookOpenText className="size-5 text-[var(--signal)]" aria-hidden /><h2 id="source-evidence-title" className="font-semibold">Source evidence</h2></div>
            <label className="mt-4 block text-xs font-semibold text-[var(--text-mid)]">Secure URLs, one per line<textarea form="article-editor" name="sourceUrls" rows={6} value={sources} onChange={(event) => setSources(event.target.value)} disabled={published} className="mt-2 w-full rounded-xl border border-[var(--hairline)] bg-white px-3 py-3 font-mono text-[11px] leading-5 disabled:bg-[var(--surface-2)]" /></label>
            <label className="mt-4 block text-xs font-semibold text-[var(--text-mid)]">Private research notes<textarea form="article-editor" name="sourceNotes" rows={7} value={sourceNotes} onChange={(event) => setSourceNotes(event.target.value)} disabled={published} className="mt-2 w-full rounded-xl border border-[var(--hairline)] bg-white px-3 py-3 text-xs leading-5 disabled:bg-[var(--surface-2)]" placeholder="What each source establishes. These notes are never public." /></label>
            <label className="mt-4 flex items-start gap-3 rounded-xl bg-[#FFF8E7] p-3 text-xs leading-5 text-[#5D430B]"><input form="article-editor" name="needsLegalReview" type="checkbox" checked={needsLegalReview} onChange={(event) => setNeedsLegalReview(event.target.checked)} disabled={published} className="mt-0.5 size-4 accent-[#14254A]" /><span><strong className="block">Require legal-boundary review</strong>Recommended for licensing rules, disclosures and news analysis.</span></label>
          </section>

          {seoItem ? <section className="rounded-2xl border border-[var(--hairline)] bg-[var(--surface-2)] p-4 text-xs leading-5 text-[var(--text-mid)]"><p className="font-semibold text-[var(--text-hi)]">Original editorial brief</p><p className="mt-2">{seoItem.summary || "No brief was added."}</p></section> : null}
        </aside>
      </div>
    </div>
  )
}

