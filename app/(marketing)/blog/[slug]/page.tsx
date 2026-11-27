import { notFound } from "next/navigation"
import type { Metadata } from "next"
import Link from "next/link"
import { getAllPosts, getPost } from "@/lib/blog"
import { selectRelatedPosts } from "@/lib/blog/related"
import { ArticlePresentation } from "@/components/blog/article-presentation"
import { JsonLd, ID, breadcrumbSchema } from "@/components/marketing/json-ld"
import { buildMetadata, canonical, ogImage } from "@/lib/seo"

export async function generateStaticParams() {
  return (await getAllPosts()).map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = await getPost(slug)
  if (!post) return {}
  return buildMetadata({
    title: post.meta.title,
    description: post.meta.description,
    path: `/blog/${slug}`,
    type: "article",
    ogTitle: post.meta.title,
  })
}

export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const [post, posts] = await Promise.all([getPost(slug), getAllPosts()])
  if (!post) notFound()
  const related = selectRelatedPosts(post.meta, posts)

  // Author/publisher reference the Organization by @id rather than re-declaring
  // it — and the publisher now resolves to a logo, which Google requires for
  // Article rich results (the previous inline Organization had none).
  const articleSchema = {
    "@context": "https://schema.org",
    "@type": "Article",
    "@id": `${canonical(`/blog/${slug}`)}#article`,
    headline: post.meta.title,
    description: post.meta.description,
    datePublished: post.meta.date,
    dateModified: post.meta.updated ?? post.meta.date,
    image: ogImage(post.meta.title),
    mainEntityOfPage: canonical(`/blog/${slug}`),
    author: { "@id": ID.organization },
    publisher: { "@id": ID.organization },
    isPartOf: { "@id": ID.website },
  }

  const crumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Guides", path: "/blog" },
    { name: post.meta.title, path: `/blog/${slug}` },
  ])

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [articleSchema, crumbs] }} />
      <ArticlePresentation
        title={post.meta.title}
        tag={post.meta.tag}
        date={post.meta.date}
        updated={post.meta.updated}
        readingMinutes={post.meta.readingMinutes}
        content={post.content}
        automationAssisted={post.meta.automationAssisted}
        author={post.meta.author}
      />
      {related.length ? (
        <section className="mx-auto max-w-3xl px-4 pb-16 sm:px-6" aria-labelledby="related-guides-title">
          <div className="border-t border-hairline pt-10">
            <p className="font-mono text-xs uppercase tracking-wider text-signal">Keep reading</p>
            <h2 id="related-guides-title" className="mt-2 font-display text-2xl font-semibold tracking-tight">
              Related NYC licensing guides
            </h2>
            <div className="mt-5 grid gap-3 sm:grid-cols-3">
              {related.map((guide) => (
                <Link
                  key={guide.slug}
                  href={`/blog/${guide.slug}`}
                  className="rounded-lg border border-hairline bg-card p-4 transition-colors hover:border-brass/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal"
                >
                  <span className="font-mono text-[11px] uppercase tracking-wider text-text-low">{guide.tag}</span>
                  <span className="mt-2 block font-display text-base font-semibold leading-snug">{guide.title}</span>
                </Link>
              ))}
            </div>
          </div>
        </section>
      ) : null}
    </>
  )
}
