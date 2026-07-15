import { Play } from "lucide-react"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { Reveal } from "@/components/marketing/reveal"
import { MediaFrame, SkylineArt } from "@/components/marketing/media-frame"
import { VideoModal } from "@/components/marketing/video-modal"

/**
 * V6 — the Stripe-style product split. Left: the claim + three numerals. Right:
 * a floating MediaFrame that doubles as the "watch how it works" surface (a
 * code-generated skyline panel today; a real tour video once TOUR_VIDEO_SRC is
 * set). The panel gets the subtle perspective tilt via `.product-tilt`.
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
            See exactly where you stand — what&apos;s done, what&apos;s next, and the citation behind every
            item. No spreadsheets, no lost paperwork, no wondering whether a form is still good.
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
          <MediaFrame className="product-tilt">
            <SkylineArt />
            <div className="absolute inset-0 flex items-center justify-center">
              <VideoModal>
                <button
                  type="button"
                  className="group flex items-center gap-3 rounded-full border border-hairline-strong bg-black/30 py-2 pl-2 pr-5 text-sm font-medium text-text-hi backdrop-blur-sm transition-colors hover:border-brass/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                >
                  <span className="flex size-9 items-center justify-center rounded-full bg-brass text-[color:var(--primary-foreground)] transition-transform group-hover:scale-105">
                    <Play className="ml-0.5 size-4 fill-current" />
                  </span>
                  Watch how it works
                </button>
              </VideoModal>
            </div>
          </MediaFrame>
        </Reveal>
      </div>
    </section>
  )
}
