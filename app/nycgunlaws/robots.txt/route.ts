import { LAWS_SITE } from "@/lib/gun-laws-site"

/**
 * Served at nycgunlaws.com/robots.txt via the host rewrite in proxy.ts. The
 * internal /nycgunlaws prefix is disallowed so the route tree can never be
 * indexed under gunlicensenyc.com — that would be genuine duplicate content and
 * exactly the doorway signal this architecture is designed to avoid.
 *
 * AI crawlers are allowed explicitly. A citation-backed legal reference is the
 * kind of page answer engines should be reading; that is the whole point of it.
 */
const AI_AGENTS = [
  "GPTBot",
  "OAI-SearchBot",
  "ChatGPT-User",
  "ClaudeBot",
  "Claude-User",
  "Claude-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "Google-Extended",
  "Applebot-Extended",
  "Bingbot",
  "CCBot",
]

export function GET() {
  const body = [
    "User-agent: *",
    "Allow: /",
    "Disallow: /nycgunlaws",
    "",
    ...AI_AGENTS.flatMap((ua) => [`User-agent: ${ua}`, "Allow: /", ""]),
    `Sitemap: ${LAWS_SITE.origin}/sitemap.xml`,
    `Host: ${LAWS_SITE.origin}`,
    "",
  ].join("\n")

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  })
}
