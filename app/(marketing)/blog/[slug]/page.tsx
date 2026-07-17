import Link from "next/link"
import { notFound } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { MDXRemote } from "next-mdx-remote/rsc"
import type { Metadata } from "next"
import { getAllPosts, getPost } from "@/lib/blog"
import { formatDate } from "@/lib/format"
import { Badge } from "@/components/ui/badge"
import { Button } from "@/components/ui/button"
import { TechGrid } from "@/components/shared/tech-grid"
import { JsonLd, ID, breadcrumbSchema } from "@/components/marketing/json-ld"
import { buildMetadata, canonical, ogImage } from "@/lib/seo"

export function generateStaticParams() {
  return getAllPosts().map((p) => ({ slug: p.slug }))
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) return {}
  return buildMetadata({
    title: post.meta.title,
    description: post.meta.description,
    path: `/blog/${slug}`,
    type: "article",
    ogTitle: post.meta.title,
  })
}

// Styled MDX element map (no typography plugin — explicit tokens).
const mdxComponents = {
  h2: (p: React.ComponentProps<"h2">) => (
    <h2 className="mt-10 font-display text-2xl font-semibold tracking-tight" {...p} />
  ),
  h3: (p: React.ComponentProps<"h3">) => (
    <h3 className="mt-8 font-display text-lg font-semibold" {...p} />
  ),
  p: (p: React.ComponentProps<"p">) => (
    <p className="mt-4 leading-relaxed text-text-mid" {...p} />
  ),
  ul: (p: React.ComponentProps<"ul">) => (
    <ul className="mt-4 space-y-2 text-text-mid [&>li]:relative [&>li]:pl-5" {...p} />
  ),
  ol: (p: React.ComponentProps<"ol">) => (
    <ol className="mt-4 list-decimal space-y-2 pl-5 text-text-mid" {...p} />
  ),
  li: (p: React.ComponentProps<"li">) => (
    <li
      className="before:absolute before:left-0 before:top-2.5 before:size-1.5 before:rounded-full before:bg-signal marker:text-text-low"
      {...p}
    />
  ),
  a: ({ href = "", ...rest }: React.ComponentProps<"a">) => (
    <Link href={href} className="text-signal underline-offset-4 hover:underline" {...rest} />
  ),
  strong: (p: React.ComponentProps<"strong">) => (
    <strong className="font-semibold text-foreground" {...p} />
  ),
}

export default async function Article({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const post = getPost(slug)
  if (!post) notFound()

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
    dateModified: post.meta.date,
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
    <article>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [articleSchema, crumbs] }} />
      <section className="relative overflow-hidden border-b border-hairline">
        <TechGrid glow="brass" />
        <div className="relative mx-auto max-w-3xl px-4 py-16 sm:px-6">
          <Button asChild variant="link" className="mb-6 px-0">
            <Link href="/blog">
              <ArrowLeft className="size-4" /> All guides
            </Link>
          </Button>
          <div className="flex items-center gap-3">
            <Badge variant="outline">{post.meta.tag}</Badge>
            <span className="font-mono text-xs text-text-low">
              {formatDate(post.meta.date)} · {post.meta.readingMinutes} min read
            </span>
          </div>
          <h1 className="mt-4 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            {post.meta.title}
          </h1>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 py-14 sm:px-6">
        <MDXRemote source={post.content} components={mdxComponents} />

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
