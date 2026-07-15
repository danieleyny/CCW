import Link from "next/link"
import { ArrowRight, Play } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getActivePackages } from "@/lib/packages"
import { getFees } from "@/lib/fees"
import { brand, externalCostEstimates } from "@/config/brand"
import { Button } from "@/components/ui/button"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { JsonLd, serviceSchema } from "@/components/marketing/json-ld"
import { HeroAura } from "@/components/marketing/hero-aura"
import { Magnetic } from "@/components/marketing/magnetic"
import { Reveal } from "@/components/marketing/reveal"
import { Ticker } from "@/components/marketing/ticker"
import { VideoModal } from "@/components/marketing/video-modal"
import { ProductFeature } from "@/components/marketing/product-feature"
import { ProcessStepper } from "@/components/marketing/process-stepper"
import { CostCard } from "@/components/marketing/cost-card"
import { StickyCta } from "@/components/marketing/sticky-cta"
import { RefilePromise } from "@/components/marketing/refile-promise"
import { PlacemakingBand } from "@/components/marketing/placemaking-band"
import { HowItWorksIllustration } from "@/components/marketing/showcase/how-it-works-illustration"
import { TheCount } from "@/components/marketing/showcase/the-count"

const TRUST: string[] = [
  "One tracked case",
  "Every step explained",
  "You file — that's the law",
]

export default async function Home() {
  const supabase = await createClient()
  const [packages, fees] = await Promise.all([getActivePackages(supabase), getFees(supabase)])
  const concierge = packages.find((p) => p.key === "full_concierge") ?? packages.find((p) => p.featured)

  const REALITY: [string, string][] = [
    ["~6 months", "Start to decision letter. No one can rush it — us included."],
    [`${fees.applicationFee} + ${fees.fingerprintFee}`, "Government fees, paid directly to them."],
    ["18 hours", "Of training — and it expires six months after it's dated."],
    ["4 references", "Notarized. We send them the link."],
    ["1 affidavit", "Per adult in your home. We chase them, not you."],
    ["1 interview", "Yours. You submit your own application — that's the law."],
  ]

  return (
    <>
      <JsonLd data={serviceSchema} />

      {/* ── HERO ─────────────────────────────────────────────────────────── */}
      <section
        id="hero"
        className="section-void relative flex min-h-[88svh] flex-col items-center justify-center overflow-hidden px-4 pt-20 text-center sm:px-6"
      >
        <HeroAura />
        <div className="relative z-10 mx-auto max-w-3xl">
          <Reveal>
            <div className="engraved text-brass-bright">NYC · concealed carry</div>
          </Reveal>
          <Reveal delay={90}>
            <h1 className="mx-auto mt-5 max-w-3xl text-balance font-display font-semibold leading-[1.02] tracking-tight [font-size:clamp(2.5rem,9vw,4.5rem)]">
              <span className="text-prestige">The whole process.</span> Handled.
            </h1>
          </Reveal>
          <Reveal delay={170}>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-text-mid">
              A NYC carry license is 24 documents and about six months — one missing page restarts it.
              Gun License NYC runs it as a single tracked case.
            </p>
          </Reveal>
          <Reveal delay={250}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Magnetic className="w-full sm:w-auto">
                <Button asChild size="lg" className="min-h-12 w-full sm:w-auto">
                  <Link href="/eligibility">
                    Check your eligibility <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </Magnetic>
              <VideoModal>
                <Button variant="outline" size="lg" className="min-h-12 w-full sm:w-auto">
                  <Play className="size-4 fill-current" /> Watch how it works
                </Button>
              </VideoModal>
            </div>
          </Reveal>
          <Reveal delay={320}>
            <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2">
              {TRUST.map((t) => (
                <li key={t} className="flex items-center gap-2 text-sm text-text-mid">
                  <span className="size-1.5 rounded-full bg-brass" aria-hidden />
                  {t}
                </li>
              ))}
            </ul>
          </Reveal>
        </div>

        {/* Retail-first: a calm, plain-English "how it works in 3 steps" diagram —
            no citations, no codes. The detailed tool lives below the fold. */}
        <Reveal delay={200} className="relative z-10 mt-12 w-full">
          <HowItWorksIllustration />
        </Reveal>
      </section>

      {/* ── PROOF STRIP ──────────────────────────────────────────────────── */}
      <Ticker />

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
              Here&apos;s the real shape of it.
            </h2>
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

      {/* ── CANDOR (narrow, high-contrast) ───────────────────────────────── */}
      <section className="section-panel py-20 sm:py-28">
        <div className="mx-auto max-w-3xl px-4 text-center sm:px-6">
          <Reveal>
            <SectionEyebrow>Candor, not concealment</SectionEyebrow>
            <h2 className="mx-auto mt-4 max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Sealed and dismissed arrests are still disclosed.
            </h2>
            <p className="mx-auto mt-6 max-w-2xl text-xl leading-relaxed text-text-mid">
              New York requires it, and hiding one is how good applications die. We help you explain it —
              never omit it. When it&apos;s a lawyer&apos;s question, we point you to a lawyer.
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

      {/* ── CLOSING ──────────────────────────────────────────────────────── */}
      <section id="closing" className="section-void relative overflow-hidden border-t border-hairline">
        <HeroAura />
        <div className="relative z-10 mx-auto max-w-3xl px-4 py-28 text-center sm:px-6">
          <Reveal>
            <h2 className="mx-auto max-w-xl font-display text-3xl font-semibold tracking-tight sm:text-5xl">
              Find out if you qualify. Two minutes.
            </h2>
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
