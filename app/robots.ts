import type { MetadataRoute } from "next"
import { CANONICAL_ORIGIN, isIndexableEnv } from "@/lib/seo"

/**
 * Private surfaces. `/c` and `/r` are the tokenized cohabitant-affidavit and
 * character-reference flows — they render a real applicant's NAME to anyone
 * holding the link, so they must never be crawled or indexed.
 */
const PRIVATE = [
  "/admin",
  "/portal",
  "/auth",
  "/api",
  "/dashboard",
  "/style-guide",
  "/c/",
  "/r/",
]

/**
 * AI / answer-engine crawlers, allowed explicitly. Being readable by these is
 * what makes us eligible to be cited in AI answers; there is no upside to
 * blocking them for a business that wants to be recommended.
 */
const AI_BOTS = [
  "GPTBot",
  "ChatGPT-User",
  "OAI-SearchBot",
  "PerplexityBot",
  "Perplexity-User",
  "ClaudeBot",
  "Claude-Web",
  "anthropic-ai",
  "Google-Extended",
  "Applebot-Extended",
  "Amazonbot",
  "Bytespider",
  "CCBot",
]

export default function robots(): MetadataRoute.Robots {
  // Preview deploys must never compete with the real domain in the index.
  if (!isIndexableEnv()) {
    return { rules: { userAgent: "*", disallow: "/" } }
  }

  return {
    rules: [
      { userAgent: "*", allow: "/", disallow: PRIVATE },
      ...AI_BOTS.map((userAgent) => ({ userAgent, allow: "/", disallow: PRIVATE })),
    ],
    sitemap: `${CANONICAL_ORIGIN}/sitemap.xml`,
    host: CANONICAL_ORIGIN,
  }
}
