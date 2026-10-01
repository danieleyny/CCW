"use client"

/**
 * Tiny, isolated replay controller for the Precision hero. The sculpture itself is
 * fully server-rendered and its entrance is pure CSS — this button only RE-triggers
 * that entrance by briefly nulling every descendant animation and forcing a reflow,
 * so the hero's initial visibility and layout never depend on hydration. Hidden under
 * prefers-reduced-motion in CSS (there is nothing to replay).
 */
export function HeroPrecisionReplay() {
  return (
    <button
      type="button"
      className="hp-replay"
      aria-label="Replay the hero animation"
      onClick={(e) => {
        const root = e.currentTarget.closest(".hero-precision") as HTMLElement | null
        if (!root) return
        root.classList.add("hp-replaying")
        void root.offsetWidth // reflow — drop then restore the animations to restart them
        root.classList.remove("hp-replaying")
      }}
    >
      <span aria-hidden="true">↻</span> Replay
    </button>
  )
}
