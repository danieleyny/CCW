import { cn } from "@/lib/utils"

/**
 * Decorative blueprint-grid backdrop with optional brass/signal rim glows.
 * Place inside a `relative` container; it is aria-hidden and non-interactive.
 */
export function TechGrid({
  className,
  glow = "brass",
  fade = true,
}: {
  className?: string
  glow?: "brass" | "signal" | "both" | "none"
  fade?: boolean
}) {
  return (
    <div aria-hidden className={cn("pointer-events-none absolute inset-0 overflow-hidden", className)}>
      <div
        className={cn(
          "absolute inset-0 tech-grid opacity-60",
          fade && "[mask-image:radial-gradient(ellipse_at_center,black,transparent_80%)]"
        )}
      />
      {(glow === "brass" || glow === "both") && (
        <div className="absolute -top-24 left-1/2 h-72 w-[40rem] -translate-x-1/2 rounded-full bg-brass/8 blur-[120px]" />
      )}
      {(glow === "signal" || glow === "both") && (
        <div className="absolute -bottom-24 right-0 h-64 w-80 rounded-full bg-signal/8 blur-[120px]" />
      )}
    </div>
  )
}
