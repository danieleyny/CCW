import Link from "next/link"
import { notFound } from "next/navigation"
import { MDXRemote } from "next-mdx-remote/rsc"
import type { Metadata } from "next"
import { getAllPosts, getPost } from "@/lib/blog"
import { formatDate } from "@/lib/format"
import { JsonLd, ID, breadcrumbSchema } from "@/components/marketing/json-ld"
import { InteriorHeroVisual } from "@/components/marketing/v2/interior-hero-visual"
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
    <article className="editorial-page">
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [articleSchema, crumbs] }} />
      <header className="guide-hero guide-hero--editorial">
        <nav className="breadcrumb" aria-label="Breadcrumb">
          <Link href="/">Home</Link><span>›</span><Link href="/blog">Guides</Link><span>›</span><span>Article</span>
        </nav>
        <div className="guide-hero-layout">
          <div className="guide-hero-copy">
            <p className="eyebrow">{post.meta.tag} · Primary-source guide</p>
            <h1>{post.meta.title}</h1>
            <div className="guide-meta">
              <span>{formatDate(post.meta.date)}</span>
              <span>{post.meta.readingMinutes} min read</span>
              <span>Plain English</span>
            </div>
          </div>
          <InteriorHeroVisual variant="editorial" />
        </div>
      </header>

      <div className="editorial-layout">
        <aside className="editorial-rail">
          <Link href="/blog">← All guides</Link>
          <span>READING NOTE</span>
          <p>Rules can change. Source dates and agency links appear wherever a legal claim is made.</p>
        </aside>
        <div className="editorial-body">
          <MDXRemote source={post.content} components={mdxComponents} />

          <aside className="editorial-cta">
            <p className="eyebrow">Turn reading into a next step</p>
            <h2>Ready to see where you stand?</h2>
            <p>Check your service fit in two minutes—no payment and no commitment.</p>
            <Link href="/eligibility" className="button">Check your eligibility <span aria-hidden="true">→</span></Link>
          </aside>
        </div>
      </div>
    </article>
  )
}
