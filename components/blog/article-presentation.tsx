import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { ArticleBody } from "@/components/blog/article-body"
import { TechGrid } from "@/components/shared/tech-grid"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { formatDate } from "@/lib/format"

export interface ArticlePresentationProps {
  title: string
  tag: string
  date: string
  updated?: string
  readingMinutes: number
  content: string
  automationAssisted: boolean
  author?: string
  showGuidesLink?: boolean
  reviewed?: boolean
}

/** The exact reader-facing article layout shared by public posts and preview. */
export function ArticlePresentation({
  title,
  tag,
  date,
  updated,
  readingMinutes,
  content,
  automationAssisted,
  author = "Gun License NYC editorial team",
  showGuidesLink = true,
  reviewed = true,
}: ArticlePresentationProps) {
  return (
    <article>
      <section className="relative overflow-hidden border-b border-hairline">
        <TechGrid glow="brass" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6">
          {showGuidesLink ? (
            <Button asChild variant="link" className="mb-6 px-0">
              <Link href="/blog">
                <ArrowLeft className="size-4" /> All guides
              </Link>
            </Button>
          ) : null}
          <div className="flex items-center gap-3">
            <Badge variant="outline">{tag}</Badge>
            <span className="font-mono text-xs text-text-low">
              {updated ? `Updated ${formatDate(updated)}` : formatDate(date)} · {readingMinutes} min read
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {title}
          </h1>
          <p className="mt-4 text-sm text-text-mid">
            By {author} · {reviewed ? "Reviewed against cited primary sources before publication" : "Private pre-publication preview; human review is still required"}
          </p>
          {automationAssisted ? (
            <p className="mt-2 text-xs text-text-low">
              Automation assisted with research organization; a person reviewed the facts, sources and final wording.
            </p>
          ) : null}
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <ArticleBody source={content} />

        <div className="mt-12 rounded-lg border bg-card p-6 brass-edge">
          <h2 className="font-display text-lg font-semibold">Ready to begin?</h2>
          <p className="mt-1 text-sm text-text-mid">
            Check your eligibility in two minutes — no payment, no commitment.
          </p>
          <Button asChild className="mt-4">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </div>
    </article>
  )
}
