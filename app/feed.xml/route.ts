import { getAllPosts } from "@/lib/blog"
import { brand } from "@/config/brand"
import { CANONICAL_ORIGIN } from "@/lib/seo"

/**
 * /feed.xml — RSS 2.0 of the blog, against the CANONICAL origin (never the deploy
 * host). force-static: it rebuilds with the site, and the blog is file-based, so
 * there's nothing per-request. Linked from root metadata (alternates.types) and
 * the blog index.
 */
export const dynamic = "force-static"

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;")

export async function GET() {
  const posts = getAllPosts()
  const self = `${CANONICAL_ORIGIN}/feed.xml`
  const items = posts
    .map((p) => {
      const url = `${CANONICAL_ORIGIN}/blog/${p.slug}`
      const pub = new Date(`${p.updated ?? p.date}T12:00:00Z`).toUTCString()
      return `    <item>
      <title>${esc(p.title)}</title>
      <link>${url}</link>
      <guid isPermaLink="true">${url}</guid>
      <pubDate>${pub}</pubDate>
      <description>${esc(p.description)}</description>
    </item>`
    })
    .join("\n")

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom">
  <channel>
    <title>${esc(brand.name)} — Guides</title>
    <link>${CANONICAL_ORIGIN}/blog</link>
    <atom:link href="${self}" rel="self" type="application/rss+xml" />
    <description>In-depth guides to the NYC gun-license process.</description>
    <language>en-us</language>
${items}
  </channel>
</rss>
`

  return new Response(xml, {
    headers: {
      "content-type": "application/rss+xml; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  })
}
