import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { CASE_STAGES } from "@/config/stages"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { Reveal } from "@/components/marketing/reveal"
import { CaseFileArtifact } from "@/components/marketing/showcase/case-file-artifact"

/**
 * V9 — "You'll never wonder what's next." The claim promises DIRECTION, so the
 * artifact shows one next move (see CaseFileArtifact) instead of a status
 * dashboard. Left: brass rule → eyebrow → H2 → lead → a 24 → 13 → 1 proof ladder
 * → a text CTA into /how-it-works. Right: the layered case-file artifact.
 *
 * Server component. The old MediaFrame + AmbientVideo (a flat-black rectangle for
 * two media downloads) is gone; AmbientVideo still ships for PlacemakingBand.
 */

/** 24 is the registry count shown in the artifact; 13 is read from CASE_STAGES,
 *  never typed — a stage reorder moves this number automatically. */
const BEATS: { n: string; label: string; detail: string; signal?: boolean }[] = [
  { n: "24", label: "requirements tracked", detail: "Every rule that applies to your case, carrying the citation it comes from." },
  { n: String(CASE_STAGES.length), label: "stages, start to licensed", detail: "You always know which one you're in — and what closes it." },
  { n: "1", label: "thing on your plate", detail: "We surface the single next action. The rest is ours to chase.", signal: true },
]

export function ProductFeature() {
  return (
    <section className="pf-section section-raised wash-brass relative overflow-hidden">
      <span aria-hidden className="divider-horizon absolute inset-x-0 top-0" />
      <div aria-hidden className="tech-grid-pool absolute inset-0" />

      <div className="pf-inner relative z-10 mx-auto max-w-[1200px]">
        <div className="pf-grid">
          <Reveal className="pf-head">
            <span
              aria-hidden
              className="block h-0.5 w-[34px] rounded-full bg-brass shadow-[0_0_12px_var(--brass-glow)]"
            />
            <SectionEyebrow className="mt-3.5">What you actually get</SectionEyebrow>
            <h2 className="mt-4 max-w-[14ch] text-balance font-display font-semibold leading-[1.04] tracking-[-0.022em] [font-size:clamp(2rem,3.4vw,3.05rem)]">
              You&apos;ll never wonder what&apos;s next.
            </h2>
            <p className="mt-5 max-w-[44ch] text-pretty text-[1.0625rem] leading-[1.7] text-text-mid">
              We keep the whole application organized and on schedule, so you always know what&apos;s done
              and what&apos;s next — without chasing any of it yourself.
            </p>
          </Reveal>

          <Reveal delay={200} className="pf-art">
            <CaseFileArtifact />
          </Reveal>

          <Reveal delay={120} className="pf-tail">
            <ul className="pf-beats">
              {BEATS.map((b) => (
                <li key={b.n} className={`pf-beat ${b.signal ? "is-signal" : ""}`}>
                  <span className="pf-beat-n">{b.n}</span>
                  <span>
                    <span className="block font-medium text-text-hi">{b.label}</span>
                    <span className="mt-0.5 block text-sm leading-relaxed text-text-mid">{b.detail}</span>
                  </span>
                </li>
              ))}
            </ul>

            <Link
              href="/how-it-works"
              className="mt-7 inline-flex items-center gap-1.5 text-sm font-medium text-signal transition-colors hover:text-signal/80"
            >
              See how the whole process works
              <ArrowRight className="size-4" />
            </Link>
          </Reveal>
        </div>
      </div>

      <span aria-hidden className="divider-horizon absolute inset-x-0 bottom-0" />
    </section>
  )
}
