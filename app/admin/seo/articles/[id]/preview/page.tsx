import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft, Eye } from "lucide-react"
import { ArticleBody } from "@/components/blog/article-body"
import { loadArticle } from "@/lib/admin/articles"
import { requireAdmin } from "@/lib/auth"
import { articleWordCount } from "@/lib/blog/validation"

export const metadata = { title: { absolute: "Article preview · Staff" } }

export default async function ArticlePreviewPage({ params }: { params: Promise<{ id: string }> }) {
  await requireAdmin()
  const { id } = await params
  const data = await loadArticle(id)
  if (!data) notFound()
  const { article } = data
  return (
    <div className="mx-auto max-w-[980px] pb-20">
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3">
        <Link href={`/admin/seo/articles/${article.id}`} className="inline-flex min-h-11 items-center gap-2 rounded-lg border border-[var(--hairline)] bg-white px-4 text-sm font-semibold text-[var(--text-hi)] hover:bg-[var(--surface-2)]"><ArrowLeft className="size-4" aria-hidden />Back to editor</Link>
        <span className="inline-flex items-center gap-2 rounded-full bg-[#EEF2F7] px-3 py-1.5 text-xs font-semibold text-[#475467]"><Eye className="size-4" aria-hidden />Private preview · {articleWordCount(article.content_markdown)} words</span>
      </div>
      <article className="overflow-hidden rounded-3xl border border-[var(--hairline)] bg-[#07101F] text-white shadow-xl">
        <header className="border-b border-white/10 bg-[radial-gradient(circle_at_80%_15%,rgba(217,178,95,.17),transparent_35%)] px-6 py-12 sm:px-12 sm:py-16">
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#E4C473]">{article.tag} · Private preview</p>
          <h1 className="mt-4 max-w-3xl font-[family-name:var(--font-title)] text-4xl font-semibold tracking-[-.03em] sm:text-5xl">{article.title}</h1>
          <p className="mt-4 max-w-2xl text-sm leading-6 text-[#B5C0D3]">{article.description || "Add a search description in the editor."}</p>
        </header>
        <div className="bg-[#0A1426] px-6 py-10 sm:px-12 sm:py-14 [&_.text-text-mid]:text-[#C5CDDA] [&_.text-foreground]:text-white [&_.bg-surface-2]:bg-white/[.05] [&_.border-hairline]:border-white/10">
          <ArticleBody source={article.content_markdown} />
        </div>
      </article>
    </div>
  )
}

