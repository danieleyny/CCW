import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getAllPosts, getPost } from "@/lib/blog"
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
  const post = await getPost(slug)
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
    </>
  )
}
