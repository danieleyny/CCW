import { cn } from "@/lib/utils"
import { brand } from "@/config/brand"

/**
 * Gun License NYC — the mark: a fine-line circular licensing "seal" enclosing an
 * abstract Manhattan skyline on a horizon. `currentColor` throughout, so it
 * inherits `text-brass` on the dark app / `text-brass-deep` on the light pages,
 * and renders as a single-color mark at any size (nav 28px, favicon 32px).
 * No firearm imagery — an official seal with a New York identity.
 */
export function LogoMark({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 48 48"
      fill="none"
      className={cn("shrink-0", className)}
      role="img"
      aria-label="Gun License NYC"
    >
      <circle cx="24" cy="24" r="21" stroke="currentColor" strokeWidth="1.8" />
      <circle cx="24" cy="24" r="17.5" stroke="currentColor" strokeWidth="0.7" opacity="0.45" />
      <g fill="currentColor">
        <rect x="13" y="25" width="3" height="6" />
        <rect x="16.5" y="20" width="3" height="11" />
        <rect x="20" y="13" width="3.5" height="18" />
        <rect x="24" y="17" width="3" height="14" />
        <rect x="27.5" y="22" width="3" height="9" />
        <rect x="31" y="25.5" width="3" height="5.5" />
      </g>
      <line x1="9" y1="31" x2="39" y2="31" stroke="currentColor" strokeWidth="1.6" />
    </svg>
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
