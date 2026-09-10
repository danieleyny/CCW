import Link from "next/link"
import type { ReactNode } from "react"
import type { Fact } from "@/content/facts"
import { JsonLd, faqSchema } from "@/components/marketing/json-ld"

/**
 * Shared building blocks for the high-intent SEO pages, restyled to the
 * marketing v2 vocabulary (see app/(marketing)/marketing-v2.css). The exported
 * prop APIs are unchanged — only the internal markup/classes moved to the new
 * `.article-callout` / `.faq-block` / `.related-block` system — so every page
 * that imports these inherits the redesign without edits.
 */

/** Centered reading measure for the self-contained blocks below. */
function Measure({ children, pad }: { children: ReactNode; pad?: string }) {
  return (
    <div
      style={{
        width: "min(100% - 48px, 820px)",
        marginInline: "auto",
        padding: pad ?? "0",
      }}
    >
      {children}
    </div>
  )
}

/**
 * The DIRECT-ANSWER block: 2-4 sentences at the very top that answer the query
 * outright, in plain language, quotable verbatim. This is the thing an AI lifts,
 * so it sits above everything and says the whole answer without hedging.
 *
 * Renders the v2 `.article-callout` (spectral edge, ivory field). Wrap it in a
 * measured container on the page (the guide pages already do).
 */
export function DirectAnswer({ children }: { children: React.ReactNode }) {
  return (
    <div className="article-callout">
      <p style={{ margin: 0, color: "var(--ink)", fontSize: 18, lineHeight: 1.55 }}>{children}</p>
    </div>
  )
}

/**
 * A legal fact with its source attached. Every rule on these pages renders through
 * this, so a claim can never appear without naming the agency that sets it, linking
 * the primary source, and showing when we last checked — see content/facts.ts.
 */
export function SourcedFact({ fact }: { fact: Fact }) {
  return (
    <li
      style={{
        listStyle: "none",
        border: "1px solid var(--rule)",
        background: "var(--ivory)",
        padding: "16px 18px",
      }}
    >
      <p style={{ margin: 0, color: "var(--ink)", fontSize: 15, lineHeight: 1.55 }}>{fact.claim}</p>
      <p
        style={{
          margin: "8px 0 0",
          color: "var(--ink-muted)",
          fontFamily: "var(--mono)",
          fontSize: 11,
          lineHeight: 1.6,
        }}
      >
        Set by {fact.authority} ·{" "}
        <Link
          href={fact.href}
          target="_blank"
          rel="noopener noreferrer"
          style={{ color: "var(--electric-deep)", textDecoration: "none" }}
        >
          source ↗
        </Link>{" "}
        · we last checked {fact.verifiedOn}
      </p>
    </li>
  )
}

export function FactList({ facts }: { facts: Fact[] }) {
  return (
    <ul style={{ listStyle: "none", margin: "24px 0 0", padding: 0, display: "grid", gap: 10 }}>
      {facts.map((f) => (
        <SourcedFact key={f.claim} fact={f} />
      ))}
    </ul>
  )
}

/**
 * A page-scoped FAQ that renders the Q&As AND emits FAQPage schema from the same
 * array — one source, so the visible answer and the structured answer can't
 * drift. Native `<details>` so it works with JavaScript disabled.
 */
export function FaqBlock({
  faqs,
  title = "Common questions.",
}: {
  faqs: { q: string; a: string }[]
  title?: string
}) {
  return (
    <section style={{ padding: "40px 0 8px" }}>
      <Measure>
        <JsonLd data={faqSchema(faqs)} />
        <div className="faq-block" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
          <h3>{title}</h3>
          {faqs.map((f) => (
            <details className="faq-item" key={f.q}>
              <summary>{f.q}</summary>
              <p>{f.a}</p>
            </details>
          ))}
        </div>
      </Measure>
    </section>
  )
}

/** Hub-and-spoke internal links, so no new page is an orphan. */
export function RelatedLinks({ links }: { links: { label: string; href: string }[] }) {
  return (
    <section style={{ padding: "40px 0 64px" }}>
      <Measure>
        <div className="related-block" style={{ marginTop: 0 }}>
          <h3>Keep reading.</h3>
          <div className="related-grid">
            {links.map((l, i) => (
              <Link className="related-card" href={l.href} key={l.href}>
                <span>Related · {String(i + 1).padStart(2, "0")}</span>
                <strong>{l.label}</strong>
              </Link>
            ))}
          </div>
        </div>
      </Measure>
    </section>
  )
}
