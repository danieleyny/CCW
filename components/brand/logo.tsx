import { cn } from "@/lib/utils"
import { brand } from "@/config/brand"

/**
 * Gun License NYC — the brand mark: a shield carrying the Manhattan skyline over a
 * gold check. Two rasters, trimmed to their content so they fill their box, used at
 * every size the old SVG seal was (nav 28px, sidebar 32px, auth 36px).
 *
 * WHY TWO FILES. The skyline is a TRANSPARENT KNOCKOUT through the shield, not
 * painted lines — so whatever sits behind the mark shows through it. On the light
 * marketing pages that reads as a white skyline on a grey shield, which is correct.
 * On the app routes (which wrap their tree in `.dark`) the obsidian ground showed
 * through the same holes and the mark collapsed into a grey smudge with an
 * invisible skyline. logo-dark.png inverts the shield to a warm off-white so the
 * dark ground showing through the knockout becomes the skyline instead of erasing
 * it. Same artwork, same alpha, opposite ground.
 *
 * Both are rendered and toggled with the `dark` variant rather than swapped in JS,
 * so there is no flash on hydration and no client component.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo.png"
        alt="Gun License NYC"
        className={cn("shrink-0 object-contain dark:hidden", className)}
      />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        src="/logo-dark.png"
        alt=""
        aria-hidden="true"
        className={cn("hidden shrink-0 object-contain dark:block", className)}
      />
    </>
  )
}

/** The mark + wordmark in the display typeface. */
export function LogoLockup({
  className,
  markClassName,
}: {
  className?: string
  markClassName?: string
}) {
  return (
    <span className={cn("flex items-center gap-2 font-display font-semibold tracking-tight", className)}>
      <LogoMark className={cn("size-7 text-brass", markClassName)} />
      {brand.logo.wordmark}
    </span>
  )
}
