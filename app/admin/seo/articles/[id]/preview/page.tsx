import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, CircleAlert, Eye } from "lucide-react"
import { ArticlePresentation } from "@/components/blog/article-presentation"
import { loadArticle } from "@/lib/admin/articles"
import { requireAdmin } from "@/lib/auth"
import { articleWordCount, publicationReadiness } from "@/lib/blog/validation"

export const metadata = { title: { absolute: "Article preview · Staff" } }

export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const data = await loadArticle(id)
  if (!data) notFound()
  const { article } = data
  const words = articleWordCount(article.content_markdown)
  const sourceUrls = Array.isArray(article.source_urls)
    ? article.source_urls.filter((entry): entry is string => typeof entry === "string" && entry.startsWith("https://"))
    : []
  const readiness = publicationReadiness({
    title: article.title,
    slug: article.slug,
    description: article.description,
    content: article.content_markdown,
    sourceUrls,
    factCheckedAt: article.fact_checked_at,
    needsLegalReview: article.needs_legal_review,
    legalReviewedAt: article.legal_reviewed_at,
  })
  const draftProblems = readiness.checks.filter((check) => !check.passed && !["fact_check", "legal_review"].includes(check.key))
  return (
    <div className="-mx-3 -my-5 bg-background pb-20 sm:-mx-5 lg:-mx-7">
      <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3 px-4 py-5 sm:px-6">
        <Link href={`/admin/seo/articles/${article.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--hairline)] bg-white px-4 text-sm font-semibold text-[var(--text-hi)] hover:bg-[var(--surface-2)]"><ArrowLeft className="size-4" aria-hidden />Back to editor</Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#EEF2F7] px-3 py-1.5 text-xs font-semibold text-[#475467]"><Eye className="size-4" aria-hidden />Private preview · {words} words</span>
      </div>
      {draftProblems.length ? (
        <div className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
          <div className="rounded-2xl border border-amber-200 bg-amber-50 p-6 text-amber-950">
            <div className="flex items-start gap-3">
              <CircleAlert className="mt-0.5 size-5 shrink-0" aria-hidden />
              <div>
                <h1 className="font-display text-2xl font-semibold">This draft is not ready for a final preview.</h1>
                <p className="mt-2 text-sm leading-6">Preview mirrors the live article, so unfinished outlines and placeholders are kept out of it. Return to the editor and regenerate the article.</p>
                <ul className="mt-4 list-disc space-y-1 pl-5 text-sm">
                  {draftProblems.map((problem) => <li key={problem.key}>{problem.label}</li>)}
                </ul>
              </div>
            </div>
          </div>
        </div>
      ) : (
        <ArticlePresentation
          title={article.title}
          tag={article.tag}
          date={article.created_at.slice(0, 10)}
          updated={article.updated_at.slice(0, 10)}
          readingMinutes={Math.max(1, Math.ceil(words / 200))}
          content={article.content_markdown}
          automationAssisted={article.automation_assisted}
          reviewed={Boolean(article.fact_checked_at) && (!article.needs_legal_review || Boolean(article.legal_reviewed_at))}
        />
      )}
    </div>
  )
}

