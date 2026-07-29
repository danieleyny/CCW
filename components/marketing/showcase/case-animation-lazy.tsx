"use client"

import dynamic from "next/dynamic"

/**
 * The hero's animated case card is the heaviest above-the-fold client component
 * (self-advancing 5-phase timers + inline SVG scenes). It's pure aria-hidden
 * decoration, so we load it AFTER first paint — `ssr: false` keeps its JS out of
 * the server render and the initial critical path, and a dimension-matched
 * placeholder holds the space so hydration causes no layout shift. The hero copy
 * + CTA (the LCP) stay server-rendered and instant next to it.
 */
const CaseAnimation = dynamic(
  () => import("./case-animation").then((m) => m.CaseAnimation),
  { ssr: false, loading: () => <CaseCardPlaceholder /> }
)

/** Still frame of the card frame — same outer size + min-h body as the real one. */
function CaseCardPlaceholder() {
  return (
    <div aria-hidden className="relative mx-auto w-full max-w-[440px]">
      <div
        className="pointer-events-none absolute -inset-6 -z-10 rounded-[2rem] opacity-70 blur-2xl"
        style={{
          background:
            "radial-gradient(60% 60% at 70% 20%, var(--brass-glow), transparent 70%), radial-gradient(50% 50% at 20% 90%, var(--ice-dim), transparent 70%)",
        }}
      />
      <div className="glass-premium overflow-hidden rounded-2xl border border-hairline p-5 shadow-[0_40px_90px_-50px_rgba(0,0,0,0.9)]">
        <div className="flex items-center gap-1.5">
          {Array.from({ length: 5 }).map((_, i) => (
            <span key={i} className="h-1 flex-1 rounded-full bg-hairline-strong" />
          ))}
        </div>
        <div className="shimmer mt-4 min-h-[264px] rounded-xl border border-hairline/60 bg-surface-1/40" />
      </div>
    </div>
  )
}

export function CaseAnimationLazy() {
  return <CaseAnimation />
}
