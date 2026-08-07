import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { buildMetadata } from "@/lib/seo"
import { getPublicPackages, getPublicFees } from "@/lib/public-data"
import { brand, externalCostEstimates } from "@/config/brand"
import { Button } from "@/components/ui/button"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { JsonLd, serviceSchemaWithOffers } from "@/components/marketing/json-ld"
import { RelatedLinks } from "@/components/marketing/page-blocks"
import { HeroAura } from "@/components/marketing/hero-aura"
import { Magnetic } from "@/components/marketing/magnetic"
import { Reveal } from "@/components/marketing/reveal"
import { ProductFeature } from "@/components/marketing/product-feature"
import { ProcessStepper } from "@/components/marketing/process-stepper"
import { CostCard } from "@/components/marketing/cost-card"
import { StickyCta } from "@/components/marketing/sticky-cta"
import { RefilePromise } from "@/components/marketing/refile-promise"
import { PlacemakingBand } from "@/components/marketing/placemaking-band"
import { HeroSkyline } from "@/components/marketing/hero-skyline"
import { HeroFilm } from "@/components/marketing/hero-film/hero-film"
import { TheCount } from "@/components/marketing/showcase/the-count"

/**
 * The home page owns the head term ("NYC gun license"). The root layout's title
 * template appends " · Gun License NYC", so the bare title stays under 60 chars.
 */
export const metadata = buildMetadata({
  title: "NYC Gun License Help — Concealed Carry",
  description:
    "Get a NYC gun license without the guesswork. We track all 24 documents, your 18-hour course, and every deadline as one case — and can file it for you.",
  path: "/",
  hreflang: "",
  ogTitle: "NYC gun license, handled — Gun License NYC",
})

export default async function Home() {
  // Cookieless + cached → this page renders statically (see lib/public-data).
  const [packages, fees] = await Promise.all([getPublicPackages(), getPublicFees()])
  const concierge = packages.find((p) => p.key === "full_concierge") ?? packages.find((p) => p.featured)

  const REALITY: [string, string][] = [
    ["~6 months", "Start to decision letter. No one can rush it — us included."],
    [`${fees.applicationFee} + ${fees.fingerprintFee}`, "Government fees, paid directly to them."],
    ["18 hours", "Of training — and it expires six months after it's dated."],
    ["4 references", "We send your references a link to get their reference completed."],
    ["1 affidavit", "Completed for each individual over 18 living in your household."],
    ["1 interview", "We make sure you have a full package ready for your interview and know what to expect beforehand."],
  ]

  return (
    <>
      {/* Offers come from the live service_packages rows — a price change in
          admin moves the structured data with it. */}
      <JsonLd data={serviceSchemaWithOffers(packages)} />

      {/* ── HERO V4 — Manhattan blueprint · two-clock track panel ────────────
          The city + scrims live under the copy; the H1 is the LCP element and is
          NOT wrapped in anything that defers its paint. The panel owns only the
          track state; everything else here is server-rendered. There is no
          firearm imagery and no process line (HERO_V4_PROMPT §2.1, §7). */}
      <section id="hero" className="hero-shell">
        <HeroAura />
        <HeroSkyline />
        <span aria-hidden className="hero-veil" />
        <span aria-hidden className="hero-veil-l" />

        <div className="hero-wrap">
          <div className="hero-cols">
            <div className="hero-copy">
              <div aria-hidden className="hero-eyerule" />
              <div className="hero-eyebrow">
                <i aria-hidden>[</i>
                <span>NYC · gun license, handled</span>
                <i aria-hidden>]</i>
              </div>
              {/* H1 text UNCHANGED and kept contiguous in one span so it survives
                  a curl grep; only "Handled." breaks to its own line + prestige. */}
              <h1 className="hero-h1">
                <span className="hero-h1-lead">The whole NYC gun license process.</span>{" "}
                <span className="text-prestige">Handled.</span>
              </h1>
              <p className="hero-lead">
                Getting a gun license in New York City is slow, and strict. We make it simple — one team
                tracking every document, deadline, and requirement from your first question to the day
                you&apos;re licensed.
              </p>
              <div className="hero-ctas">
                <Link className="hero-btn" href="/eligibility">
                  Check your eligibility
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
                <Link className="hero-btn2" href="/how-it-works">
                  See how it works
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden>
                    <path d="M5 12h14M13 6l6 6-6 6" />
                  </svg>
                </Link>
              </div>
              <p className="hero-micro">Two minutes · no card · no commitment</p>
            </div>

            {/* the glass panel now holds the 25s hero film + a plain-language floor */}
            <div className="hero-panel">
              <HeroFilm />
              <p className="hero-film-cap">
                Carry, premises or renewal — we run the whole application, from the first form to the
                decision letter.
              </p>
              <Link className="hero-film-foot" href="/how-it-works">
                See how we run it
                <ArrowRight className="size-4" aria-hidden />
              </Link>
            </div>
          </div>
        </div>

        <span aria-hidden className="hero-spacer" />
      </section>

      {/* ── PROOF STRIP (sibling floor for the hero — replaces the old Ticker) ── */}
      <div className="hero-strip">
        <div className="hero-stripin">
          <div className="hero-cell">
            <div className="hero-ck">Where we work</div>
            <div className="hero-cv">
              <b>All five boroughs</b> — and the one NYPD division that decides them.
            </div>
          </div>
          <div className="hero-cell">
            <div className="hero-ck">What we run</div>
            <div className="hero-cv">
              <b>Carry, premises, renewal</b> — retired LEO and non-resident too.
            </div>
          </div>
          <div className="hero-cell">
            <div className="hero-ck">How we work</div>
            <div className="hero-cv">
              <b>Every rule carries its citation</b> — check our work against the source.
            </div>
          </div>
        </div>
      </div>

      {/* ── PRODUCT (Stripe-style split + video) ─────────────────────────── */}
      <ProductFeature />

      {/* ── THE COUNT (centerpiece) ──────────────────────────────────────── */}
      <TheCount />

      {/* ── PLACEMAKING (cinematic full-bleed beat) ──────────────────────── */}
      <PlacemakingBand />

      {/* ── THE PROCESS (click-driven stepper) ───────────────────────────── */}
      <ProcessStepper />

      {/* ── THE REALITY (narrow list, no cards) ──────────────────────────── */}
      <section className="section-void py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 sm:px-6">
          <Reveal>
            <SectionEyebrow>No surprises</SectionEyebrow>
            <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Here&apos;s exactly what it takes — no surprises.
            </h2>
            <p className="mt-4 text-text-mid">
              Knowing all of it up front is how this gets done right the first time.
            </p>
          </Reveal>
          <dl className="mt-10 divide-y divide-hairline">
            {REALITY.map(([fact, clar]) => (
              <Reveal key={fact}>
                <div className="flex flex-col gap-1 py-4 sm:flex-row sm:items-baseline sm:justify-between sm:gap-6">
                  <dt className="font-display text-xl font-semibold text-brass-bright sm:w-56 sm:shrink-0">
                    {fact}
                  </dt>
                  <dd className="text-text-mid sm:text-right">{clar}</dd>
                </div>
              </Reveal>
            ))}
          </dl>
        </div>
      </section>

      {/* ── CANDOR (concealment → disclosure) ────────────────────────────── */}
      <section className="section-panel relative overflow-hidden py-20 sm:py-28">
        {/* Backdrop: faint document lines + an embossed seal — texture, not clutter. */}
        <div aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden">
          <div className="absolute inset-0 flex flex-col justify-center gap-3 opacity-[0.04]">
            {["58%", "76%", "50%", "82%", "44%", "68%", "60%"].map((w, i) => (
              <div key={i} className="mx-auto h-2.5 rounded-full bg-text-hi" style={{ width: w }} />
            ))}
          </div>
          <svg
            className="absolute -right-12 -top-12 size-56 text-brass opacity-[0.06]"
            viewBox="0 0 100 100"
            fill="none"
            stroke="currentColor"
          >
            <circle cx="50" cy="50" r="47" strokeWidth="1" />
            <circle cx="50" cy="50" r="38" strokeWidth="0.6" />
            {Array.from({ length: 16 }).map((_, i) => {
              const a = (i / 16) * Math.PI * 2
              return (
                <line
                  key={i}
                  x1={50 + Math.cos(a) * 38}
                  y1={50 + Math.sin(a) * 38}
                  x2={50 + Math.cos(a) * 47}
                  y2={50 + Math.sin(a) * 47}
                  strokeWidth="0.6"
                />
              )
            })}
            <circle cx="50" cy="50" r="16" strokeWidth="0.8" />
          </svg>
        </div>

        <div className="relative z-10 mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <SectionEyebrow>Nothing slips through</SectionEyebrow>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Every detail, handled — so nothing surprises you later.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-text-mid">
              From the first form to the final review, we track every requirement, deadline, and document,
              and tell you exactly what&apos;s needed and when. No missed steps, no scramble — just a
              complete, correct application you can stand behind.
            </p>
          </Reveal>
        </div>
      </section>

      {/* ── COST (one number we collect + honest all-in range) ───────────── */}
      <section className="section-void py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="text-center">
              <SectionEyebrow>What it costs</SectionEyebrow>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                One fee to us. Everything else, at cost.
              </h2>
              <p className="mx-auto mt-4 max-w-xl text-text-mid">
                No games with pricing — one fee to us, and everything else paid straight to the
                government or your instructor.
              </p>
            </div>
          </Reveal>
          <Reveal delay={120} className="mt-10">
            {concierge && (
              <CostCard
                concierge={{ name: concierge.name, priceCents: concierge.priceCents }}
                fees={fees}
                estimates={externalCostEstimates}
              />
            )}
          </Reveal>
        </div>
      </section>

      {/* ── TRUST BAND (Refile Promise + the standing disclaimer) ────────── */}
      <section className="section-void pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <Reveal>
            <RefilePromise withDisclaimer={false} />
          </Reveal>
          <p className="mt-6 border-t border-hairline pt-4 text-xs leading-relaxed text-text-low">
            {brand.disclaimer}
          </p>
        </div>
      </section>

      {/* ── EXPLORE (in-content links into the pillar/borough cluster) ─────── */}
      <RelatedLinks
        links={[
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "What it costs, all-in", href: "/cost" },
          { label: "How long it takes", href: "/timeline" },
          { label: "How the whole process works", href: "/how-it-works" },
          { label: "Your borough's page", href: "/gun-license" },
          { label: "Common questions, answered", href: "/faq" },
        ]}
      />

      {/* ── CLOSING ──────────────────────────────────────────────────────── */}
      <section id="closing" className="section-void relative overflow-hidden border-t border-hairline">
        <HeroAura />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-28 text-center sm:px-6">
          <Reveal>
            <h2 className="mx-auto max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              See if you qualify.
            </h2>
            <p className="mx-auto mt-4 max-w-md text-text-mid">
              It takes two minutes, and there&apos;s no commitment.
            </p>
            <Magnetic className="mt-8 inline-block">
              <Button asChild size="lg" className="min-h-12">
                <Link href="/eligibility">
                  Check your eligibility <ArrowRight className="size-4" />
                </Link>
              </Button>
            </Magnetic>
          </Reveal>
        </div>
      </section>

      <StickyCta watchOutId="hero" hideNearId="closing" />
    </>
  )
}
