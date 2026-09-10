import Link from "next/link"
import type { ReactNode } from "react"
import { Fragment } from "react"
import { JsonLd, breadcrumbSchema, faqSchema } from "@/components/marketing/json-ld"

/**
 * The reusable interior ARTICLE TEMPLATE for the marketing redesign (v2).
 * Ported from redesign/homepage-visual-spec.html (the "Interior page · Guide"
 * stage, lines ~1795–1861). One prop-driven layout for the whole content
 * estate — guides, requirements, cost, timeline, disqualifiers — so no page
 * hand-rolls this markup again.
 *
 * Structure: a `.guide-page` with a dark `.guide-hero` (breadcrumb + eyebrow +
 * h1 + lede + meta chips), then `.article-layout` = a sticky `.toc-card` of
 * in-page jump links + an `.article-body` (prose, callouts, source note, an
 * optional native-<details> FAQ, and a related-links grid).
 *
 * Everything works with JavaScript disabled: the TOC is real `<a href="#id">`
 * anchors and the FAQ is native `<details>`. Motion lives in marketing-v2.css
 * and is CSS-only. The component also emits BreadcrumbList and (when FAQs are
 * present) FAQPage JSON-LD from the SAME arrays it renders, so the visible trail
 * and the structured data cannot drift.
 */

export type Crumb = { name: string; path: string }

export type ArticleSection = {
  /** In-page anchor id (the TOC links to `#${id}`). */
  id: string
  /** The section's `<h3>` heading. */
  heading: string
  /** Shorter label for the sticky TOC; falls back to `heading`. */
  navLabel?: string
  /**
   * Section content. Author it as a fragment of prose so its top-level `<p>`
   * elements land as DIRECT children of `.article-body` and inherit the prose
   * type scale (`.mkt2 .article-body > p`).
   */
  body: ReactNode
}

export type ArticleFaq = { q: string; a: string }

export type ArticleRelated = {
  href: string
  label: string
  /** Small mono kicker above the title, e.g. "Next guide · 02". */
  kicker?: string
}

export type ArticleCta = {
  href: string
  label: string
  /** Optional line of copy shown above the button. */
  note?: ReactNode
}

// The spec styles the hero headline through `.mkt2 .guide-hero h2`. Real pages
// need a single semantic <h1>, so we replicate that one declaration inline
// rather than change the shared stylesheet.
const heroTitleStyle: React.CSSProperties = {
  margin: 0,
  maxWidth: 840,
  fontFamily: "var(--display)",
  fontSize: "clamp(46px, 6vw, 78px)",
  fontWeight: 500,
  lineHeight: 0.94,
  letterSpacing: "-0.06em",
}

export function ArticleTemplate({
  eyebrow,
  title,
  lede,
  breadcrumb,
  meta,
  articleLede,
  sections,
  sourceNote,
  faqs,
  faqTitle = "Common questions.",
  related,
  relatedTitle = "Continue with context.",
  cta,
  children,
}: {
  eyebrow: string
  title: string
  lede: ReactNode
  breadcrumb: Crumb[]
  meta?: string[]
  articleLede?: ReactNode
  sections: ArticleSection[]
  sourceNote?: ReactNode
  faqs?: ArticleFaq[]
  faqTitle?: string
  related?: ArticleRelated[]
  relatedTitle?: string
  cta?: ArticleCta
  /** Extra nodes appended to the end of the article body, before related. */
  children?: ReactNode
}) {
  return (
    <article className="guide-page">
      <header className="guide-hero">
        <JsonLd data={breadcrumbSchema(breadcrumb)} />
        <nav className="breadcrumb" aria-label="Breadcrumb">
          {breadcrumb.map((c, i) => {
            const last = i === breadcrumb.length - 1
            return (
              <Fragment key={c.path}>
                {last ? (
                  <span aria-current="page">{c.name}</span>
                ) : (
                  <Link href={c.path}>{c.name}</Link>
                )}
                {!last && <span aria-hidden="true">/</span>}
              </Fragment>
            )
          })}
        </nav>
        <div className="guide-hero-copy">
          <p className="eyebrow">{eyebrow}</p>
          <h1 style={heroTitleStyle}>{title}</h1>
          <p className="guide-hero-lede">{lede}</p>
          {meta && meta.length > 0 && (
            <div className="guide-meta">
              {meta.map((m) => (
                <span key={m}>{m}</span>
              ))}
            </div>
          )}
        </div>
      </header>

      <div className="article-layout">
        <aside className="toc-card" aria-label="On this page">
          <strong>On this page</strong>
          {sections.map((s) => (
            <a key={s.id} href={`#${s.id}`}>
              {s.navLabel ?? s.heading}
            </a>
          ))}
          {faqs && faqs.length > 0 && <a href="#article-faq">Questions</a>}
        </aside>

        <div className="article-body">
          {articleLede && <p className="article-lede">{articleLede}</p>}

          {sections.map((s) => (
            <Fragment key={s.id}>
              <h3 id={s.id}>{s.heading}</h3>
              {s.body}
            </Fragment>
          ))}

          {sourceNote && <p className="source-note">{sourceNote}</p>}

          {children}

          {faqs && faqs.length > 0 && (
            <section className="faq-block" id="article-faq" aria-labelledby="article-faq-title">
              <JsonLd data={faqSchema(faqs)} />
              <h3 id="article-faq-title">{faqTitle}</h3>
              {faqs.map((f) => (
                <details className="faq-item" key={f.q}>
                  <summary>{f.q}</summary>
                  <p>{f.a}</p>
                </details>
              ))}
            </section>
          )}

          {cta && (
            <div className="article-cta" style={{ marginTop: 64 }}>
              {cta.note && (
                <p style={{ margin: "0 0 18px", color: "var(--ink-soft)", fontSize: 17 }}>
                  {cta.note}
                </p>
              )}
              <Link className="button" href={cta.href}>
                {cta.label} <span className="button-arrow" aria-hidden="true">→</span>
              </Link>
            </div>
          )}

          {related && related.length > 0 && (
            <section className="related-block" aria-labelledby="article-related-title">
              <h3 id="article-related-title">{relatedTitle}</h3>
              <div className="related-grid">
                {related.map((r, i) => (
                  <Link className="related-card" href={r.href} key={r.href}>
                    <span>{r.kicker ?? `Related · ${String(i + 1).padStart(2, "0")}`}</span>
                    <strong>{r.label}</strong>
                  </Link>
                ))}
              </div>
            </section>
          )}
        </div>
      </div>
    </article>
  )
}
