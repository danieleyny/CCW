/**
 * The obsidian app backdrop: faint blueprint grid + brass/signal/ice rim glows.
 * Lives inside a `.dark` wrapper (marketing, portal, admin, instructor) so it
 * renders on every surface — the whole product runs the dark register.
 */
export function DarkBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 tech-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <div className="absolute -top-48 left-1/2 h-96 w-[64rem] -translate-x-1/2 rounded-full bg-brass/5 blur-[140px]" />
      <div className="absolute bottom-0 right-0 h-80 w-96 rounded-full bg-signal/5 blur-[140px]" />
      <div className="absolute bottom-1/3 -left-32 h-80 w-80 rounded-full bg-ice/[0.04] blur-[150px]" />
    </div>
  )
}
