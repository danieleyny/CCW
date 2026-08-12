import type { CSSProperties } from "react"
import { cn } from "@/lib/utils"

/**
 * Fade + rise as the element scrolls into view — CSS-only, SERVER component.
 *
 * The content is ALWAYS present and visible in the server HTML; this component
 * never gates visibility on JavaScript (that was the black-page bug — it used to
 * server-render children at opacity-0 and only reveal them inside a useEffect).
 *
 * The motion now lives in `app/globals.css` (`.reveal`), driven by a scroll
 * timeline (`animation-timeline: view()`) inside `@supports` + a
 * `prefers-reduced-motion: no-preference` guard:
 *   - Browsers that support scroll-driven animations play the same fade/rise as
 *     the element scrolls in.
 *   - Browsers that don't (the hidden `from` keyframe only exists inside
 *     `@supports`) show the content immediately, unanimated — the safe path.
 *   - Reduced-motion users get no animation at all.
 *
 * `delay` staggers grid items via the `--reveal-delay` custom property. Public
 * API (children / className / delay) is unchanged, so no call site changes.
 */
export function Reveal({
  children,
  className,
  delay = 0,
}: {
  children: React.ReactNode
  className?: string
  delay?: number
}) {
  return (
    <div
      className={cn("reveal", className)}
      style={{ "--reveal-delay": `${delay}ms` } as CSSProperties}
    >
      {children}
    </div>
  )
}
