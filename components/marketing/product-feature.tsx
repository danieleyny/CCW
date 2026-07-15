import { Play } from "lucide-react"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { Reveal } from "@/components/marketing/reveal"
import { MediaFrame } from "@/components/marketing/media-frame"
import { AmbientVideo } from "@/components/marketing/ambient-video"
import { VideoModal } from "@/components/marketing/video-modal"
import { CaseFileShowcase } from "@/components/marketing/showcase/case-file-showcase"

/**
 * V6/V7 — the "here's the actual tool" split, below the fold where detail is
 * welcome. Left: the claim, three numerals, and the "watch how it works" entry.
 * Right: the real (simplified) case file floating over an ambient NYC backdrop —
 * code-generated SkylineArt today, swapped for the muted night clip (Clip B) in
 * Task 2. The obsidian scrim keeps the product card legible over either.
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
          <SectionEyebrow>The instrument</SectionEyebrow>
          <h2 className="mt-3 font-display text-3xl font-semibold tracking-tight sm:text-4xl">
            One case. Every requirement, in one place.
          </h2>
          <p className="mt-4 max-w-md text-text-mid">
            See exactly where you stand — what&apos;s done, what&apos;s next, and what still needs a hand.
            No spreadsheets, no lost paperwork, no wondering whether a form is still good.
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
          <VideoModal>
            <button
              type="button"
              className="group mt-8 inline-flex items-center gap-3 rounded-full border border-hairline-strong py-2 pl-2 pr-5 text-sm font-medium text-text-hi transition-colors hover:border-brass/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
            >
              <span className="flex size-9 items-center justify-center rounded-full bg-brass text-[color:var(--primary-foreground)] transition-transform group-hover:scale-105">
                <Play className="ml-0.5 size-4 fill-current" />
              </span>
              Watch how it works
            </button>
          </VideoModal>
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
