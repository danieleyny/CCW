import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { getAllPosts } from "@/lib/blog"
import { formatDate } from "@/lib/format"
import { buildMetadata } from "@/lib/seo"
import { PageHero } from "@/components/marketing/page-hero"
import { Badge } from "@/components/ui/badge"

export const metadata = buildMetadata({
  title: "NYC Gun License Guides",
  description:
    "In-depth guides to the NYC gun license process — requirements, documents, timelines, and the mistakes that send applications back to the start.",
  path: "/blog",
})

export default function Blog() {
  const posts = getAllPosts()
  return (
    <>
      <PageHero
        eyebrow="Guides"
        title="NYC gun licensing, explained"
        subtitle="Plain-English guides to a confusing process — precise, current, and genuinely useful."
      />
      <section className="mx-auto max-w-4xl px-4 py-16 sm:px-6">
        <div className="space-y-3">
          {posts.map((p) => (
            <Link
              key={p.slug}
              href={`/blog/${p.slug}`}
              className="group block rounded-lg border border-hairline bg-card p-6 transition-colors hover:border-brass/30"
            >
              <div className="flex items-center gap-3">
                <Badge variant="outline">{p.tag}</Badge>
                <span className="font-mono text-xs text-text-low">
                  {formatDate(p.date)} · {p.readingMinutes} min
                </span>
              </div>
              <h2 className="mt-3 font-display text-xl font-semibold tracking-tight group-hover:text-brass-bright">
                {p.title}
              </h2>
              <p className="mt-2 text-sm text-text-mid">{p.description}</p>
              <span className="mt-4 inline-flex items-center gap-1.5 font-mono text-xs uppercase tracking-wider text-signal">
                Read <ArrowRight className="size-3.5" />
              </span>
            </Link>
          ))}
        </div>
      </section>
    </>
  )
}
