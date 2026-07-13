import Link from "next/link"
import { ArrowRight, ShieldCheck, FileCheck2, CalendarClock } from "lucide-react"
import { brand } from "@/config/brand"
import { SERVICE_PACKAGES } from "@/lib/stripe"
import { Button } from "@/components/ui/button"
import { HudStat } from "@/components/ui/hud-stat"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { HeroAura } from "@/components/marketing/hero-aura"
import { Reveal } from "@/components/marketing/reveal"
import { Magnetic } from "@/components/marketing/magnetic"
import { SpotlightCard } from "@/components/marketing/spotlight-card"
import { Ticker } from "@/components/marketing/ticker"
import { JourneyScroll } from "@/components/marketing/journey-scroll"
import { PrecisionTest } from "@/components/marketing/precision-test"
import { JsonLd, serviceSchema } from "@/components/marketing/json-ld"

const FEATURES = [
  {
    icon: FileCheck2,
    title: "Documents done right",
    body: "References, affidavits, safe photos, social-media history — assembled and QA'd so nothing bounces at the License Division.",
  },
  {
    icon: ShieldCheck,
    title: "A guided process",
    body: "A demanding ~6-month process, made precise. You always know which stage you're in and exactly what's next.",
  },
  {
    icon: CalendarClock,
    title: "Training coordinated",
    body: "16-hour classroom + 2-hour live-fire with vetted DCJS instructors, scheduled around you.",
  },
]

export default function Home() {
  return (
    <>
      <JsonLd data={serviceSchema} />

      {/* Hero */}
      <section className="relative overflow-hidden border-b border-hairline">
        <HeroAura />
        <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-background" />
        <div className="relative mx-auto max-w-6xl px-4 py-24 text-center sm:px-6 sm:py-32">
          <Reveal>
            <h1 className="text-prestige mx-auto max-w-4xl text-balance pb-1 font-display text-[2.5rem] font-semibold leading-[1.03] tracking-tight sm:text-6xl">
              {brand.tagline}
            </h1>
          </Reveal>
          <Reveal delay={170}>
            <p className="mx-auto mt-5 max-w-2xl text-pretty text-lg text-text-mid">
              {brand.description}
            </p>
          </Reveal>
          <Reveal delay={250}>
            <div className="mt-9 flex flex-col items-center justify-center gap-3 sm:flex-row">
              <Magnetic>
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/eligibility">
                    Check your eligibility <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </Magnetic>
              <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                <Link href="/how-it-works">See how it works</Link>
              </Button>
            </div>
          </Reveal>
          {/* V3-P0.7 — fabricated counters ("1200+ clients", "98% on-time")
              removed. These three are structural facts of the product itself:
              24 document types in the pipeline, 13 tracked stages, 5 boroughs. */}
          <Reveal delay={340}>
            <div className="mx-auto mt-16 grid max-w-3xl grid-cols-3 gap-2.5 sm:gap-3">
              <HudStat value={24} label="Doc types tracked" className="glass-premium" />
              <HudStat value={13} label="Stage pipeline" className="glass-premium" />
              <HudStat value={5} label="Boroughs served" className="glass-premium" />
            </div>
          </Reveal>
        </div>
      </section>

      <Ticker />

      {/* Value props */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <SectionEyebrow>Why CARRY</SectionEyebrow>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-3">
          {FEATURES.map((f, i) => (
            <Reveal key={f.title} delay={i * 90}>
              <SpotlightCard>
                <div className="glass-premium h-full rounded-lg p-6">
                  <f.icon className="size-5 text-brass" />
                  <h3 className="mt-4 font-display text-lg font-semibold">{f.title}</h3>
                  <p className="mt-2 text-sm text-text-mid">{f.body}</p>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* Scroll-driven journey */}
      <JourneyScroll />

      {/* Precision mini-game */}
      <PrecisionTest />

      {/* Pricing teaser */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="flex items-end justify-between">
            <div>
              <SectionEyebrow>Membership</SectionEyebrow>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
                Choose your level of service
              </h2>
            </div>
            <Button asChild variant="link" className="hidden sm:inline-flex">
              <Link href="/pricing">
                All packages <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {SERVICE_PACKAGES.map((p, i) => {
            const featured = "featured" in p && p.featured
            return (
              <Reveal key={p.key} delay={i * 80}>
                <SpotlightCard>
                  <div
                    className={`glass-premium h-full rounded-lg p-6 ${
                      featured ? "brass-edge" : ""
                    }`}
                  >
                    {featured && <div className="engraved mb-2 text-brass">Most chosen</div>}
                    <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                    <div className="mt-2 font-display text-2xl font-bold tabular-nums">
                      {p.priceLabel}
                    </div>
                    <p className="mt-2 text-sm text-text-mid">{p.blurb}</p>
                    <Button
                      asChild
                      variant={featured ? "default" : "outline"}
                      size="sm"
                      className="mt-5 w-full"
                    >
                      <Link href="/eligibility">Get started</Link>
                    </Button>
                  </div>
                </SpotlightCard>
              </Reveal>
            )
          })}
        </div>
      </section>

      {/* CTA */}
      <section className="border-t border-hairline">
        <div className="relative mx-auto max-w-6xl overflow-hidden px-4 py-24 text-center sm:px-6">
          <div className="pointer-events-none absolute left-1/2 top-1/2 h-64 w-[40rem] -translate-x-1/2 -translate-y-1/2 rounded-full bg-brass/8 blur-[120px]" />
          <div className="pointer-events-none absolute left-1/2 top-1/3 h-48 w-[28rem] -translate-x-1/2 rounded-full bg-ice/[0.05] blur-[110px]" />
          <Reveal className="relative">
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Find out if you qualify in two minutes
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-text-mid">
              Take the eligibility quiz — no commitment, no payment. We&apos;ll tell you exactly where
              you stand.
            </p>
            <Magnetic>
              <Button asChild size="lg" className="mt-8">
                <Link href="/eligibility">
                  Check your eligibility <ArrowRight className="size-4" />
                </Link>
              </Button>
            </Magnetic>
          </Reveal>
        </div>
      </section>
    </>
  )
}
