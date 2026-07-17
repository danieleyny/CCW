import Link from "next/link"
import { ExternalLink } from "lucide-react"
import type { Fact } from "@/content/facts"
import { JsonLd, faqSchema } from "@/components/marketing/json-ld"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

/**
 * Shared building blocks for the high-intent SEO pages. Extracted rather than
 * copy-pasted a thirteenth time: /faq and /resources each hand-rolled their own
 * <details> markup, and there was no prose or CTA component at all.
 */

/**
 * The DIRECT-ANSWER block: 2-4 sentences at the very top that answer the query
 * outright, in plain language, quotable verbatim. This is the thing an AI lifts,
 * so it sits above everything and says the whole answer without hedging.
 */
export function DirectAnswer({ children }: { children: React.ReactNode }) {
  return (
    <div className="brass-edge rounded-xl border border-hairline bg-card p-6">
      <p className="text-lg leading-relaxed text-text-hi">{children}</p>
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
    <li className="rounded-lg border border-hairline bg-card p-4">
      <p className="text-text-hi">{fact.claim}</p>
      <p className="mt-2 text-xs text-text-low">
        Set by {fact.authority} ·{" "}
        <Link
          href={fact.href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-1 text-signal hover:underline"
        >
          source <ExternalLink className="size-3" />
        </Link>{" "}
        · we last checked {fact.verifiedOn}
      </p>
    </li>
  )
}

export function FactList({ facts }: { facts: Fact[] }) {
  return (
    <ul className="mt-6 space-y-3">
      {facts.map((f) => (
        <SourcedFact key={f.claim} fact={f} />
      ))}
    </ul>
  )
}

/**
 * A page-scoped FAQ that renders the Q&As AND emits FAQPage schema from the same
 * array — one source, so the visible answer and the structured answer can't drift.
 */
export function FaqBlock({
  faqs,
  title = "Common questions",
}: {
  faqs: { q: string; a: string }[]
  title?: string
}) {
  return (
    <section className="mx-auto max-w-3xl px-4 py-12 sm:px-6">
      <JsonLd data={faqSchema(faqs)} />
      <SectionEyebrow>{title}</SectionEyebrow>
      <div className="mt-5 space-y-3">
        {faqs.map((f) => (
          <details key={f.q} className="group rounded-xl border border-hairline bg-card">
            <summary className="flex min-h-12 cursor-pointer list-none items-center justify-between gap-4 px-5 py-3 [&::-webkit-details-marker]:hidden">
              <span className="font-display font-semibold">{f.q}</span>
              <span className="font-mono text-signal transition-transform group-open:rotate-45">+</span>
            </summary>
            <p className="px-5 pb-4 text-text-mid">{f.a}</p>
          </details>
        ))}
      </div>
    </section>
  )
}

/** Hub-and-spoke internal links, so no new page is an orphan. */
export function RelatedLinks({ links }: { links: { label: string; href: string }[] }) {
  return (
    <section className="border-t border-hairline">
      <div className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <SectionEyebrow>Keep reading</SectionEyebrow>
        <ul className="mt-4 grid gap-2 sm:grid-cols-2">
          {links.map((l) => (
            <li key={l.href}>
              <Link
                href={l.href}
                className="block rounded-lg border border-hairline bg-card px-4 py-3 text-sm font-medium text-text-hi transition-colors hover:border-hairline-strong"
              >
                {l.label} <span className="text-signal">&rarr;</span>
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </section>
  )
}
