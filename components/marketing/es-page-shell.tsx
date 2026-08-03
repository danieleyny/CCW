import Link from "next/link"
import { notFound } from "next/navigation"
import { brand } from "@/config/brand"
import { I18N_ES_ENABLED } from "@/config/i18n"
import type { Fact } from "@/content/facts"
import { type EsPage, disclaimerEs, factsInEnglishNoteEs, uiEs } from "@/content/es"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"
import { DirectAnswer } from "@/components/marketing/page-blocks"

/**
 * Shared shell for the five Spanish /es money pages. Every /es route is a thin
 * wrapper around this, so the layout, the bilingual disclaimer, the
 * facts-in-English note, and the flag-gate live in ONE place.
 *
 * FLAG GATE: if I18N_ES_ENABLED is false, every /es page 404s — the surface
 * ships dark. Kept here (not only in metadata) so a direct hit can't slip in.
 */
export function EsPageShell({
  page,
  facts = [],
  breadcrumbLabel,
}: {
  page: EsPage
  /** Sourced legal facts, rendered in reviewed ENGLISH (never machine-translated). */
  facts?: Fact[]
  /** Spanish label for the current page in the breadcrumb trail. */
  breadcrumbLabel: string
}) {
  if (!I18N_ES_ENABLED) notFound()

  const esPath = `/es${page.enPath}`
  const isHome = page.enPath === ""

  return (
    <>
      <Breadcrumbs
        items={
          isHome
            ? [{ name: uiEs.home, path: "/es" }]
            : [
                { name: uiEs.home, path: "/es" },
                { name: breadcrumbLabel, path: esPath },
              ]
        }
      />
      <PageHero eyebrow={page.eyebrow} title={page.title} subtitle={page.subtitle} />

      <section className="mx-auto max-w-3xl px-4 pb-4 pt-8 sm:px-6">
        <DirectAnswer>{page.directAnswer}</DirectAnswer>
      </section>

      {facts.length > 0 && (
        <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">{uiEs.whoSetsThese}</h2>
          <p className="mt-2 text-sm text-text-low">{factsInEnglishNoteEs}</p>
          <FactList facts={facts} />
        </section>
      )}

      <FaqBlock faqs={page.faqs.map((f) => ({ q: f.q, a: f.a }))} title={uiEs.commonQuestions} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <Button asChild size="lg">
            <Link href="/eligibility">{uiEs.ctaEligibility}</Link>
          </Button>
        </div>
      </section>

      {/* Bilingual disclaimer — English is the controlling text (verbatim from
          config/brand.ts), Spanish is a courtesy translation beneath it. */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-10 sm:px-6">
          <p className="text-xs leading-relaxed text-text-low">{disclaimerEs}</p>
          <p className="text-xs leading-relaxed text-text-low">
            <span className="text-text-mid">English (controlling): </span>
            {brand.disclaimer}
          </p>
        </div>
      </section>

      <RelatedLinks links={page.related} />
    </>
  )
}
