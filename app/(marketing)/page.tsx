import Link from "next/link"
import { ArrowRight, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getActivePackages } from "@/lib/packages"
import { getFees } from "@/lib/fees"
import { brand } from "@/config/brand"
import { Button } from "@/components/ui/button"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { JsonLd, serviceSchema } from "@/components/marketing/json-ld"
import { HeroAura } from "@/components/marketing/hero-aura"
import { Magnetic } from "@/components/marketing/magnetic"
import { Reveal } from "@/components/marketing/reveal"
import { Ticker } from "@/components/marketing/ticker"
import { JourneyScroll } from "@/components/marketing/journey-scroll"
import { StickyCta } from "@/components/marketing/sticky-cta"
import { PricingReveal } from "@/components/marketing/pricing-reveal"
import { CaseFileShowcase } from "@/components/marketing/showcase/case-file-showcase"
import { ConsultantShowcase } from "@/components/marketing/showcase/consultant-showcase"
import { TheCount } from "@/components/marketing/showcase/the-count"

export default async function Home() {
  const supabase = await createClient()
  const [packages, fees] = await Promise.all([getActivePackages(supabase), getFees(supabase)])
  const concierge = packages.find((p) => p.key === "full_concierge") ?? packages.find((p) => p.featured)

  const REALITY: [string, string][] = [
    ["~6 months", "Start to decision letter. No one can expedite it — us included."],
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
            <h1 className="text-prestige mx-auto mt-5 max-w-3xl text-balance font-display font-semibold leading-[1.02] tracking-tight [font-size:clamp(2.5rem,9vw,4.5rem)]">
              The whole process. Handled.
            </h1>
          </Reveal>
          <Reveal delay={170}>
            <p className="mx-auto mt-6 max-w-xl text-pretty text-lg text-text-mid">
              A NYC carry license is 24 documents and about six months — one missing page restarts it.
              CARRY runs it as a single tracked case.
            </p>
          </Reveal>
          <Reveal delay={250}>
            <div className="mt-9 flex flex-col items-center gap-4">
              <Magnetic className="w-full sm:w-auto">
                <Button asChild size="lg" className="min-h-12 w-full sm:w-auto">
                  <Link href="/eligibility">
                    Check your eligibility <ArrowRight className="size-4" />
                  </Link>
                </Button>
              </Magnetic>
              <Link href="/how-it-works" className="text-sm font-medium text-text-mid hover:text-foreground">
                See how it works
              </Link>
            </div>
          </Reveal>
        </div>

        {/* The product, peeking above the fold line and inviting the scroll. */}
        <Reveal delay={200} className="relative z-10 mt-12 w-full max-w-md">
          <div className="[mask-image:linear-gradient(to_bottom,black_72%,transparent)]">
            <CaseFileShowcase />
          </div>
        </Reveal>
      </section>

      {/* ── PROOF STRIP ──────────────────────────────────────────────────── */}
      <Ticker />

      {/* ── THE COUNT (centerpiece) ──────────────────────────────────────── */}
      <TheCount />

      {/* ── THE MACHINE (horizontal / sticky sequence) ───────────────────── */}
      <JourneyScroll />

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
          <Reveal delay={140} className="mx-auto mt-10 max-w-md">
            <ConsultantShowcase />
          </Reveal>
        </div>
      </section>

      {/* ── PRICING (one all-in total, expandable) ───────────────────────── */}
      <section className="section-void py-20 sm:py-28">
        <div className="mx-auto max-w-6xl px-4 sm:px-6">
          <Reveal>
            <div className="text-center">
              <SectionEyebrow>What it costs</SectionEyebrow>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                One number. Nothing hidden behind it.
              </h2>
            </div>
          </Reveal>
          <Reveal delay={120} className="mt-10">
            {concierge && <PricingReveal pkg={{ name: concierge.name, priceCents: concierge.priceCents }} fees={fees} />}
          </Reveal>
        </div>
      </section>

      {/* ── TRUST BAND (slim furniture) ──────────────────────────────────── */}
      <section className="section-void pb-16">
        <div className="mx-auto max-w-4xl px-4 sm:px-6">
          <div className="rounded-xl border border-hairline bg-surface-1/40 p-5">
            <div className="flex items-center gap-2 text-brass-bright">
              <ShieldCheck className="size-4" />
              <span className="engraved">What we are, and what we&apos;re not</span>
            </div>
            <ul className="mt-3 grid gap-x-6 gap-y-1.5 text-sm text-text-mid sm:grid-cols-2">
              <li>✓ A document-prep & case-management service.</li>
              <li>✕ Not attorneys; we don&apos;t represent you at the License Division.</li>
              <li>✓ Honest about timelines; attorney referral when you need one.</li>
              <li>✕ Not NYPD-affiliated; we can&apos;t expedite or guarantee any outcome.</li>
            </ul>
            <p className="mt-4 border-t border-hairline pt-3 text-xs leading-relaxed text-text-low">
              {brand.disclaimer}
            </p>
          </div>
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
