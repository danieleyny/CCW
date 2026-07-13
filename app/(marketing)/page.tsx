import Link from "next/link"
import { ArrowRight, ShieldCheck, ScrollText, Scale } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getActivePackages } from "@/lib/packages"
import { getFees } from "@/lib/fees"
import { Button } from "@/components/ui/button"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { Reveal } from "@/components/marketing/reveal"
import { SpotlightCard } from "@/components/marketing/spotlight-card"
import { JsonLd, serviceSchema } from "@/components/marketing/json-ld"
import { CaseFileShowcase } from "@/components/marketing/showcase/case-file-showcase"
import { RequirementsWall } from "@/components/marketing/showcase/requirements-wall"
import { PacketShowcase } from "@/components/marketing/showcase/packet-showcase"
import { ConsultantShowcase } from "@/components/marketing/showcase/consultant-showcase"

export default async function Home() {
  const supabase = await createClient()
  const packages = await getActivePackages(supabase)
  const fees = await getFees(supabase)

  return (
    <>
      <JsonLd data={serviceSchema} />

      {/* ── HERO — name the real fear, show the product ─────────────────────── */}
      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-[1.05fr_0.95fr] lg:py-28">
          <div>
            <Reveal>
              <div className="engraved text-brass-bright">NYC concealed carry · handled</div>
            </Reveal>
            <Reveal delay={90}>
              <h1 className="mt-4 max-w-xl text-balance font-display text-4xl font-semibold leading-[1.05] tracking-tight sm:text-5xl">
                The delay is the danger. Not the paperwork.
              </h1>
            </Reveal>
            <Reveal delay={170}>
              <p className="mt-5 max-w-xl text-pretty text-lg text-text-mid">
                A NYC carry license takes about six months and bounces on a single missing document.
                CARRY runs the whole thing as one tracked case — every requirement, every citation, every
                deadline — so nothing sends you back to the start of the line.
              </p>
            </Reveal>
            <Reveal delay={250}>
              <div className="mt-8 flex flex-col gap-3 sm:flex-row">
                <Button asChild size="lg" className="w-full sm:w-auto">
                  <Link href="/eligibility">
                    Check your eligibility <ArrowRight className="size-4" />
                  </Link>
                </Button>
                <Button asChild variant="outline" size="lg" className="w-full sm:w-auto">
                  <Link href="/how-it-works">See how it works</Link>
                </Button>
              </div>
            </Reveal>
            <Reveal delay={330}>
              <div className="mt-10 grid max-w-lg grid-cols-3 gap-3">
                <Fact head="~6 months" sub="if nothing bounces" />
                <Fact head="24 docs" sub="tracked to the citation" />
                <Fact head="0" sub="filed incomplete" />
              </div>
            </Reveal>
          </div>

          <Reveal delay={200}>
            <CaseFileShowcase />
          </Reveal>
        </div>
      </section>

      {/* ── THE HARD TRUTH — stated openly ─────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <SectionEyebrow>No surprises</SectionEyebrow>
          <h2 className="mt-3 max-w-3xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            Here&apos;s what it actually takes. We&apos;d rather you know now.
          </h2>
        </Reveal>
        <div className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Truth title="About six months">
            From a complete submission to the decision letter — an interview, fingerprints, an FBI check,
            and a good-moral-character investigation. No one can expedite it, and we never claim to.
          </Truth>
          <Truth title={`${fees.applicationFee} + ${fees.fingerprintFee} in government fees`}>
            The NYPD application fee and the DCJS fingerprint fee, paid directly to the government. Our
            service fee is separate and shown up front.
          </Truth>
          <Truth title="18 hours of training that expires">
            16 classroom hours plus 2 hours of live fire, and the certificate must be dated within six
            months of when you file. Book it early — it&apos;s the longest-lead item.
          </Truth>
          <Truth title="Four notarized references">
            Real people who&apos;ll vouch for you, each with a notarized letter. We send them a link;
            online notarization takes about ten minutes.
          </Truth>
          <Truth title="A cohabitant affidavit per adult">
            Every adult in your home signs a notarized affidavit. We collect them without you having to
            chase anyone down.
          </Truth>
          <Truth title="An in-person interview">
            You submit your own application and sit for your own interview — that&apos;s the law. We make
            sure what you filed and what you say line up.
          </Truth>
        </div>
      </section>

      {/* ── THE MACHINE — full-bleed centerpiece ───────────────────────────── */}
      <RequirementsWall />

      {/* ── CANDOR — the brave part ────────────────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <div className="grid items-center gap-12 lg:grid-cols-2">
          <Reveal>
            <div>
              <SectionEyebrow>Candor, not concealment</SectionEyebrow>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                Sealed and dismissed arrests are still disclosed.
              </h2>
              <p className="mt-5 text-lg text-text-mid">
                New York requires it, and hiding one is how good applications die. We&apos;ll never help
                you omit something — we&apos;ll help you explain it, clearly and completely, the way an
                investigator needs to read it.
              </p>
              <p className="mt-4 text-text-mid">
                Explaining a rule is our job. Advising on your specific record is a lawyer&apos;s job — and
                when you need one, we&apos;ll point you to a licensed attorney rather than guess.
              </p>
            </div>
          </Reveal>
          <Reveal delay={150}>
            <ConsultantShowcase />
          </Reveal>
        </div>
      </section>

      {/* ── THE PACKET — the payoff ────────────────────────────────────────── */}
      <section className="border-y border-hairline bg-surface-2/40">
        <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 py-20 sm:px-6 lg:grid-cols-2">
          <Reveal delay={120}>
            <PacketShowcase />
          </Reveal>
          <Reveal>
            <div className="lg:order-first">
              <SectionEyebrow>What you walk in with</SectionEyebrow>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
                One packet, assembled in the order they read it.
              </h2>
              <p className="mt-5 text-lg text-text-mid">
                Cover sheet, investigator index, then every section tabbed and paginated the way the
                License Division wants it. You review it, you submit it — but you never have to build it.
              </p>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── PRICE — government fees next to ours ────────────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 py-20 sm:px-6">
        <Reveal>
          <div className="flex flex-wrap items-end justify-between gap-4">
            <div>
              <SectionEyebrow>Membership</SectionEyebrow>
              <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight">
                Choose your level of service
              </h2>
              <p className="mt-2 max-w-xl text-text-mid">
                Service fees only. Separately, the government charges {fees.applicationFee} (NYPD) +{" "}
                {fees.fingerprintFee} (fingerprints) — paid directly to them, never collected by us.
              </p>
            </div>
            <Button asChild variant="link" className="hidden sm:inline-flex">
              <Link href="/pricing">
                All packages <ArrowRight className="size-4" />
              </Link>
            </Button>
          </div>
        </Reveal>
        <div className="mt-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          {packages.map((p, i) => (
            <Reveal key={p.key} delay={i * 80}>
              <SpotlightCard>
                <div className={`glass-premium h-full rounded-lg p-6 ${p.featured ? "brass-edge" : ""}`}>
                  {p.featured && <div className="engraved mb-2 text-brass-bright">Most chosen</div>}
                  <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                  <div className="mt-2 font-display text-2xl font-bold tabular-nums">{p.priceLabel}</div>
                  <p className="mt-2 text-sm text-text-mid">{p.blurb}</p>
                  <Button
                    asChild
                    variant={p.featured ? "default" : "outline"}
                    size="sm"
                    className="mt-5 w-full"
                  >
                    <Link href={`/portal/enroll?package=${p.key}`}>
                      {p.priceCents > 0 ? "Buy now" : "Talk to us"}
                    </Link>
                  </Button>
                </div>
              </SpotlightCard>
            </Reveal>
          ))}
        </div>
      </section>

      {/* ── TRUST FURNITURE (B6) — what we are / denial ─────────────────────── */}
      <section className="mx-auto max-w-6xl px-4 pb-4 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-2">
          <Reveal>
            <div className="glass-premium h-full rounded-xl p-6">
              <div className="flex items-center gap-2 text-brass-bright">
                <ShieldCheck className="size-5" />
                <h3 className="font-display text-lg font-semibold">What we are, and what we&apos;re not</h3>
              </div>
              <div className="mt-4 grid gap-3 sm:grid-cols-2">
                <WeAre yes>A document-preparation and case-management service that keeps your
                  application complete, correct, and on schedule.</WeAre>
                <WeAre>Not attorneys, and not able to represent you before the License Division.</WeAre>
                <WeAre yes>Honest about timelines and candor requirements, with a referral to a
                  licensed attorney when your situation needs one.</WeAre>
                <WeAre>Not affiliated with or endorsed by the NYPD, and unable to expedite or guarantee
                  any outcome.</WeAre>
              </div>
            </div>
          </Reveal>
          <Reveal delay={120}>
            <div className="glass-premium h-full rounded-xl p-6">
              <div className="flex items-center gap-2 text-brass-bright">
                <Scale className="size-5" />
                <h3 className="font-display text-lg font-semibold">What happens if you&apos;re denied</h3>
              </div>
              <p className="mt-4 text-text-mid">
                A denial isn&apos;t the end. You generally have a window to seek administrative review,
                and only you or a licensed attorney can pursue it — never a consulting firm on your
                behalf. We keep your full record exportable so, if it comes to that, your attorney starts
                with everything in order.
              </p>
              <div className="mt-4 flex items-center gap-2 text-sm text-text-low">
                <ScrollText className="size-4" /> Your complete case file, ready to hand off.
              </div>
            </div>
          </Reveal>
        </div>
      </section>

      {/* ── CLOSING CTA — eligibility ──────────────────────────────────────── */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-6xl px-4 py-24 text-center sm:px-6">
          <Reveal>
            <h2 className="mx-auto max-w-2xl font-display text-3xl font-semibold tracking-tight sm:text-4xl">
              Find out if you qualify in two minutes.
            </h2>
            <p className="mx-auto mt-3 max-w-xl text-text-mid">
              A short eligibility check — no commitment, no payment. We&apos;ll tell you exactly where you
              stand and what the road looks like from here.
            </p>
            <Button asChild size="lg" className="mt-8">
              <Link href="/eligibility">
                Check your eligibility <ArrowRight className="size-4" />
              </Link>
            </Button>
          </Reveal>
        </div>
      </section>
    </>
  )
}

function Fact({ head, sub }: { head: string; sub: string }) {
  return (
    <div className="rounded-lg border border-hairline bg-surface-1/60 p-3">
      <div className="font-display text-xl font-bold tabular-nums text-brass-bright">{head}</div>
      <div className="engraved mt-1 text-[9px] text-text-low">{sub}</div>
    </div>
  )
}

function Truth({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <Reveal>
      <div className="h-full rounded-lg border border-hairline bg-surface-1 p-5">
        <h3 className="font-display text-base font-semibold text-brass-bright">{title}</h3>
        <p className="mt-2 text-sm text-text-mid">{children}</p>
      </div>
    </Reveal>
  )
}

function WeAre({ yes, children }: { yes?: boolean; children: React.ReactNode }) {
  return (
    <div className="flex items-start gap-2 text-sm">
      <span
        className={`mt-0.5 flex size-4 shrink-0 items-center justify-center rounded-full text-[10px] font-bold ${
          yes ? "bg-ok/20 text-ok" : "bg-danger/15 text-danger"
        }`}
      >
        {yes ? "✓" : "✕"}
      </span>
      <span className="text-text-mid">{children}</span>
    </div>
  )
}
