import { AmbientVideo } from "@/components/marketing/ambient-video"

/**
 * V7 — a full-bleed cinematic "placemaking" beat: a slow twilight NYC aerial
 * (Clip A) under a heavy obsidian scrim + brass vignette, with one short,
 * retail-warm line. An emotional/trust moment, not an information one — no
 * stats, no jargon. The video is lazy + reduced-motion/Save-Data safe via
 * AmbientVideo; it lives below the fold so it never touches hero LCP.
 */
export function PlacemakingBand() {
  return (
    <section className="section-void relative flex min-h-[40svh] items-center justify-center overflow-hidden border-y border-hairline">
      <AmbientVideo
        webm="/media/nyc-skyline-wide.webm"
        mp4="/media/nyc-skyline-wide.mp4"
        poster="/media/nyc-skyline-wide-poster.webp"
      />
      {/* Obsidian scrim + brass vignette keep the palette and the text legible. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-background/85 via-background/55 to-background/85" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ boxShadow: "inset 0 0 180px 40px var(--brass-glow)" }}
      />
      <p className="relative z-10 max-w-2xl px-6 text-center font-display text-2xl font-semibold tracking-tight text-text-hi sm:text-4xl">
        Built for New Yorkers. In all five boroughs.
      </p>
    </section>
  )
}
