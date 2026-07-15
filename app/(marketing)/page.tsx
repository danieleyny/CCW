import Link from "next/link"
import { ArrowRight } from "lucide-react"
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
import { ProductFeature } from "@/components/marketing/product-feature"
import { ProcessStepper } from "@/components/marketing/process-stepper"
import { CostCard } from "@/components/marketing/cost-card"
import { StickyCta } from "@/components/marketing/sticky-cta"
import { RefilePromise } from "@/components/marketing/refile-promise"
import { PlacemakingBand } from "@/components/marketing/placemaking-band"
import { CandorReveal } from "@/components/marketing/candor-reveal"
import { CaseAnimation } from "@/components/marketing/showcase/case-animation"
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

      {/* ── HERO (copy left · animated case card right) ──────────────────── */}
      <section
        id="hero"
        className="section-void relative overflow-hidden px-4 pt-20 sm:px-6"
      >
        <HeroAura />
        <div className="relative z-10 mx-auto grid min-h-[80svh] max-w-6xl items-center gap-12 py-14 lg:grid-cols-[0.85fr_1.15fr] lg:gap-14">
          {/* LEFT: copy */}
          <div className="text-center lg:text-left">
            <Reveal>
              <div className="engraved text-brass-bright">NYC · gun license, handled</div>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mx-auto mt-5 max-w-xl text-balance font-display font-semibold leading-[1.02] tracking-tight [font-size:clamp(2.5rem,8vw,4rem)] lg:mx-0">
                <span className="text-prestige">The whole process.</span> Handled.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-text-mid lg:mx-0">
                A NYC gun license is 24 documents and about six months — one missing page restarts it.
                Gun License NYC runs it as a single tracked case.
              </p>
            </Reveal>
            <Reveal delay={250}>
              <div className="mt-9 flex justify-center lg:justify-start">
                <Magnetic className="w-full sm:w-auto">
                  <Button asChild size="lg" className="min-h-12 w-full sm:w-auto">
                    <Link href="/eligibility">
                      Check your eligibility <ArrowRight className="size-4" />
                    </Link>
                  </Button>
                </Magnetic>
              </div>
            </Reveal>
            <Reveal delay={320}>
              <ul className="mt-8 flex flex-wrap items-center justify-center gap-x-6 gap-y-2 lg:justify-start">
                {TRUST.map((t) => (
                  <li key={t} className="flex items-center gap-2 text-sm text-text-mid">
                    <span className="size-1.5 rounded-full bg-brass" aria-hidden />
                    {t}
                  </li>
                ))}
              </ul>
            </Reveal>
          </div>

          {/* RIGHT: self-advancing animated case card */}
          <Reveal delay={200} className="relative z-10 w-full">
            <CaseAnimation />
          </Reveal>
        </div>
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
            <SectionEyebrow>Candor, not concealment</SectionEyebrow>
            <CandorReveal />
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
