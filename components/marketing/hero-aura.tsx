/**
 * Hero aurora — a calm, elegant ambient backdrop: soft brass/cyan light pools
 * over obsidian that drift slowly, plus fine film grain and a vignette. CSS-only
 * (no canvas), GPU-light, and effectively static under reduced-motion. Designed
 * to recede behind the headline, not compete with it.
 */
export function HeroAura() {
  return (
    <div aria-hidden className="noise pointer-events-none absolute inset-0 overflow-hidden">
      {/* warm wash from the top */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-15%,rgba(201,162,75,0.12),transparent_60%)]" />

      {/* drifting light pools */}
      <div className="animate-aura-1 absolute -top-1/3 left-1/2 h-[64rem] w-[64rem] -translate-x-1/2 rounded-full bg-brass/[0.08] blur-[150px]" />
      <div className="animate-aura-2 absolute top-1/4 -right-48 h-[42rem] w-[42rem] rounded-full bg-signal/[0.06] blur-[140px]" />
      <div className="animate-aura-3 absolute -bottom-48 -left-32 h-[44rem] w-[44rem] rounded-full bg-brass/[0.05] blur-[140px]" />

      {/* a single hairline horizon for quiet structure */}
      <div className="absolute inset-x-0 top-[58%] h-px bg-gradient-to-r from-transparent via-brass/15 to-transparent" />

      {/* vignette + fade into the page */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_55%,rgba(10,11,13,0.65)_100%)]" />
    </div>
  )
}
