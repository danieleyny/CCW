/**
 * Cinematic hero backdrop — a layered, STATIC composition over the deepened obsidian:
 * a brass/ice/signal gradient mesh, a fine starfield/dust layer for depth, a hairline
 * horizon, and a vignette that fades into the page.
 *
 * Deliberately motionless. It used to run five infinite blur animations (and a pointer
 * parallax rAF loop) over 68rem `blur-[150px]` pools; at that blur radius the motion is
 * imperceptible but the per-frame compositor repaint of those huge surfaces was a prime
 * cause of scroll jank on mobile. Static costs nothing per frame and looks identical at
 * rest. aria-hidden + pointer-events-none. No `"use client"` — it's a server component.
 */
export function HeroAura() {
  return (
    <div aria-hidden className="noise pointer-events-none absolute inset-0 overflow-hidden">
      {/* warm wash from the top — anchors the composition in brass */}
      <div className="absolute inset-0 bg-[radial-gradient(120%_80%_at_50%_-15%,rgba(201,162,75,0.14),transparent_60%)]" />

      {/* the aurora gradient-mesh (static) */}
      <div className="absolute inset-0">
        <div className="absolute -top-1/3 left-1/2 h-[68rem] w-[68rem] -translate-x-1/2 rounded-full bg-brass/[0.10] blur-[150px]" />
        <div className="absolute top-1/4 -right-56 h-[46rem] w-[46rem] rounded-full bg-signal/[0.07] blur-[150px]" />
        <div className="absolute -bottom-56 -left-40 h-[48rem] w-[48rem] rounded-full bg-ice/[0.05] blur-[150px]" />
      </div>

      {/* Starfield / floating dust — tiled radial-gradients, masked densest mid-hero. */}
      <div className="absolute inset-0 opacity-50 [background-image:radial-gradient(1px_1px_at_20%_30%,rgba(255,255,255,0.7),transparent),radial-gradient(1px_1px_at_75%_60%,rgba(191,216,230,0.6),transparent),radial-gradient(1px_1px_at_45%_85%,rgba(255,255,255,0.5),transparent),radial-gradient(1px_1px_at_85%_20%,rgba(255,255,255,0.45),transparent)] [background-size:240px_240px] [mask-image:radial-gradient(ellipse_at_center,black,transparent_75%)]" />

      {/* a couple of brighter signal/ice motes for depth */}
      <div className="absolute inset-0">
        <div className="absolute left-[22%] top-[28%] size-1 rounded-full bg-signal/60 blur-[1px]" />
        <div className="absolute right-[26%] top-[44%] size-1 rounded-full bg-ice/60 blur-[1px]" />
        <div className="absolute left-[60%] top-[64%] size-[3px] rounded-full bg-brass/50 blur-[1px]" />
      </div>

      {/* hairline horizon for quiet structure */}
      <div className="absolute inset-x-0 top-[58%] h-px bg-gradient-to-r from-transparent via-brass/15 to-transparent" />

      {/* vignette + fade into the page (uses deepened obsidian) */}
      <div className="absolute inset-0 [background:radial-gradient(ellipse_at_center,transparent_52%,rgba(7,8,11,0.7)_100%)]" />
    </div>
  )
}
