import Link from "next/link"
import { getAllPosts } from "@/lib/blog"
import { formatDate } from "@/lib/format"
import { buildMetadata } from "@/lib/seo"
import { PageHero } from "@/components/marketing/page-hero"
import { Badge } from "@/components/ui/badge"
import { JsonLd, ID, breadcrumbSchema } from "@/components/marketing/json-ld"
import { canonical } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "NYC Gun License Guides",
  description:
    "In-depth guides to the NYC gun license process — requirements, documents, timelines, and the mistakes that send applications back to the start.",
  path: "/blog",
})

export default async function Blog() {
  const posts = await getAllPosts()
  const [featured, ...rest] = posts
  const collectionSchema = {
    "@context": "https://schema.org",
    "@type": "CollectionPage",
    "@id": `${canonical("/blog")}#collection`,
    name: "NYC Gun License Guides",
    description: "Original, sourced guides to the NYC gun-license process.",
    url: canonical("/blog"),
    isPartOf: { "@id": ID.website },
    publisher: { "@id": ID.organization },
    mainEntity: {
      "@type": "ItemList",
      itemListElement: posts.map((post, index) => ({
        "@type": "ListItem",
        position: index + 1,
        url: canonical(`/blog/${post.slug}`),
        name: post.title,
      })),
    },
  }
  const crumbs = breadcrumbSchema([
    { name: "Home", path: "/" },
    { name: "Guides", path: "/blog" },
  ])

  return (
    <>
      <JsonLd data={{ "@context": "https://schema.org", "@graph": [collectionSchema, crumbs] }} />
      <PageHero
        eyebrow="Guides"
        title="NYC gun licensing, explained"
        subtitle="Plain-English guides to a confusing process — precise, current, and genuinely useful."
      />
      <div className="mx-auto grid max-w-5xl gap-3 px-4 pt-8 sm:grid-cols-[1fr_auto] sm:items-center sm:px-6">
        <p className="max-w-2xl text-sm leading-relaxed text-text-mid">
          Original explanations built from primary sources. Every guide is reviewed before publication;
          legal questions about a person&apos;s specific situation are routed to a New York-licensed attorney.
        </p>
        <a href="/feed.xml" className="font-mono text-xs text-text-low underline-offset-4 hover:text-signal hover:underline">
          Follow the RSS feed
        </a>
      </div>

      <section className="mx-auto max-w-5xl px-4 py-12 sm:px-6">
        {featured && (
          <Link
            href={`/blog/${featured.slug}`}
            className="group block rounded-xl border border-brass/25 bg-card p-6 brass-edge sm:p-8"
          >
            <div className="flex flex-wrap items-center gap-3">
              <Badge variant="outline">Featured guide</Badge>
              <span className="font-mono text-xs text-text-low">
                {formatDate(featured.updated ?? featured.date)} · {featured.readingMinutes} min
              </span>
            </div>
            <h2 className="mt-4 max-w-3xl font-display text-2xl font-semibold tracking-tight group-hover:text-brass-bright sm:text-3xl">
              {featured.title}
            </h2>
            <p className="mt-3 max-w-3xl text-sm leading-relaxed text-text-mid sm:text-base">{featured.description}</p>
            <span className="mt-5 inline-flex font-mono text-xs uppercase tracking-wider text-signal">Read the guide</span>
          </Link>
        )}

        <div className="mt-4 grid gap-4 sm:grid-cols-2">
          {rest.map((p) => (
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
              <span className="mt-4 inline-flex font-mono text-xs uppercase tracking-wider text-signal">Read the guide</span>
            </Link>
          ))}
        </div>

        <aside className="mt-10 rounded-lg border border-hairline bg-surface-2 p-5 text-sm text-text-mid">
          <p className="font-medium text-foreground">Our publishing standard</p>
          <p className="mt-1 leading-relaxed">
            We do not copy news reports or publish unreviewed AI output. News-based articles must add original NYC
            licensing context, link the original reporting and primary authority, and pass a human accuracy and legal-boundary review.
          </p>
        </aside>
      </section>
    </>
  )
}
