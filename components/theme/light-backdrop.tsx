/**
 * The marketing (light) backdrop — restrained on purpose: warm paper, a very
 * faint blueprint grid, and a single soft brass wash at the top. No gradient
 * meshes, no 3D blobs; the register is "my lawyer's office," calm and legible.
 */
export function LightBackdrop() {
  return (
    <div aria-hidden className="pointer-events-none fixed inset-0 -z-10">
      <div className="absolute inset-0 tech-grid opacity-[0.5] [mask-image:radial-gradient(ellipse_at_top,black,transparent_70%)]" />
      <div className="absolute -top-40 left-1/2 h-80 w-[56rem] -translate-x-1/2 rounded-full bg-brass/[0.06] blur-[130px]" />
    </div>
  )
}
