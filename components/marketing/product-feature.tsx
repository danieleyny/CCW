import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { Reveal } from "@/components/marketing/reveal"
import { MediaFrame } from "@/components/marketing/media-frame"
import { AmbientVideo } from "@/components/marketing/ambient-video"
import { CaseFileShowcase } from "@/components/marketing/showcase/case-file-showcase"

/**
 * V6/V7/V8 — the "here's the actual tool" split, below the fold where detail is
 * welcome. Left: the claim + three numerals. Right: the real (simplified) case
 * file floating over an ambient NYC night clip, with an obsidian scrim for
 * legibility. (V8 removed the dead "watch how it works" button — no tour exists.)
 */
const NUMERALS: [string, string][] = [
  ["24", "documents tracked"],
  ["13", "guided stages"],
  ["0", "filed incomplete"],
]

export function ProductFeature() {
  return (
    <section className="section-void py-20 sm:py-28">
      <div className="mx-auto grid max-w-6xl items-center gap-12 px-4 sm:px-6 lg:grid-cols-2">
        <Reveal>
          <SectionEyebrow>What you actually get</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            You&apos;ll never wonder what&apos;s next.
          </h2>
          <p className="mt-4 max-w-md text-text-mid">
            We keep the whole application organized and on schedule, so you always know what&apos;s done
            and what&apos;s next — without chasing any of it yourself.
          </p>
          <dl className="mt-8 flex gap-8">
            {NUMERALS.map(([n, l]) => (
              <div key={l}>
                <dt className="font-display text-3xl font-bold tabular-nums text-brass-bright sm:text-4xl">
                  {n}
                </dt>
                <dd className="engraved mt-1 text-text-low">{l}</dd>
              </div>
            ))}
          </dl>
        </Reveal>

        <Reveal delay={120} className="lg:order-last">
          <MediaFrame className="product-tilt p-4 sm:p-6">
            <AmbientVideo
              webm="/media/nyc-night-abstract.webm"
              mp4="/media/nyc-night-abstract.mp4"
              poster="/media/nyc-night-abstract-poster.webp"
              className="opacity-60"
            />
            <div aria-hidden className="absolute inset-0 bg-black/55" />
            <div className="relative">
              <CaseFileShowcase simplified />
            </div>
          </MediaFrame>
        </Reveal>
      </div>
    </section>
  )
}
