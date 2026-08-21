import { cn } from "@/lib/utils"
import { brand } from "@/config/brand"

/**
 * Gun License NYC — the brand mark: a shield carrying the Manhattan skyline over a
 * gold check. A full-color raster (public/logo.png, trimmed to its content so it
 * fills its box), used at every size the old SVG seal was (nav 28px, sidebar
 * 32px, auth 36px). The mark is portrait, so `object-contain` centers it in a
 * square slot; the wordmark sits beside it via LogoLockup. `className` keeps the
 * same sizing API every caller already passes (any `text-*` is a harmless no-op
 * on a raster).
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src="/logo.png"
      alt="Gun License NYC"
      className={cn("shrink-0 object-contain", className)}
    />
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
