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
        className="saturate-[1.3] brightness-110"
      />
      {/* Light full-bleed scrim keeps the palette but lets the city read vividly;
          a localized radial scrim behind the text holds the headline high-contrast. */}
      <div aria-hidden className="absolute inset-0 bg-gradient-to-b from-background/55 via-background/20 to-background/65" />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ boxShadow: "inset 0 0 180px 40px var(--brass-glow)" }}
      />
      <div
        aria-hidden
        className="absolute inset-0"
        style={{ background: "radial-gradient(ellipse 42% 45% at 50% 50%, rgba(0,0,0,0.62), transparent 70%)" }}
      />
      <p className="relative z-10 max-w-2xl px-6 text-center font-display text-2xl font-semibold tracking-tight text-text-hi drop-shadow-[0_2px_12px_rgba(0,0,0,0.6)] sm:text-4xl">
        Built for New Yorkers. In all five boroughs.
      </p>
    </section>
  )
}
