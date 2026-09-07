/**
 * The obsidian app backdrop: faint blueprint grid + brass/signal/ice rim glows.
 * Lives inside a `.dark` wrapper (marketing, portal, admin, instructor) so it renders
 * on every surface — the whole product runs the dark register.
 *
 * The rim glows are rendered as static `radial-gradient`s rather than blurred solid
 * circles. This element is `fixed`, so a large `blur()` filter on it forces the
 * compositor to re-rasterise a full-viewport blurred layer on every scroll frame — a
 * prime cause of mobile scroll jank. Radial-gradients paint once and cost nothing to
 * scroll, and are visually indistinguishable from the soft blurred pools.
 */
export function DarkBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10 overflow-hidden">
      <div className="absolute inset-0 tech-grid opacity-30 [mask-image:radial-gradient(ellipse_at_top,black,transparent_75%)]" />
      <div
        className="absolute inset-0"
        style={{
          background:
            "radial-gradient(60rem 22rem at 50% -4rem, rgba(201,162,75,0.06), transparent 65%)," +
            "radial-gradient(30rem 24rem at 100% 100%, rgba(95,208,224,0.06), transparent 65%)," +
            "radial-gradient(24rem 24rem at -4rem 66%, rgba(191,216,230,0.05), transparent 65%)",
        }}
      />
    </div>
  )
}
