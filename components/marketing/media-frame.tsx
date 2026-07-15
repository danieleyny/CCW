import { cn } from "@/lib/utils"

/**
 * The "floating panel" media surface from the mock: rounded, hairline-bordered,
 * soft shadow, with an obsidian scrim so any visual reads as part of the dark
 * world. It wraps CODE-GENERATED visuals today (an SVG skyline), and can later
 * host a `next/image <Image fill>` or a `<video>` unchanged — one swap point.
 */
export function MediaFrame({
  children,
  className,
  aspect,
}: {
  children: React.ReactNode
  className?: string
  /** Lock an aspect ratio (e.g. "16 / 10"); omit to size naturally to children. */
  aspect?: string
}) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-2xl border border-hairline bg-gradient-to-br from-surface-2 to-surface-1 shadow-[0_40px_90px_-50px_rgba(0,0,0,0.9)]",
        className
      )}
      style={aspect ? { aspectRatio: aspect } : undefined}
    >
      {children}
      <div
        aria-hidden
        className="pointer-events-none absolute inset-0 bg-gradient-to-b from-transparent to-black/30"
      />
    </div>
  )
}

/** Reusable code-generated NYC skyline (fills the lower edge of a MediaFrame). */
export function SkylineArt({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 600 160"
      preserveAspectRatio="none"
      aria-hidden
      className={cn("absolute inset-x-0 bottom-0 h-2/5 w-full text-surface-3", className)}
    >
      <g fill="currentColor">
        <rect x="0" y="90" width="40" height="70" />
        <rect x="44" y="70" width="30" height="90" />
        <rect x="78" y="110" width="26" height="50" />
        <rect x="110" y="50" width="34" height="110" />
        <rect x="150" y="95" width="28" height="65" />
        <rect x="184" y="30" width="24" height="130" />
        <rect x="214" y="80" width="36" height="80" />
        <rect x="256" y="60" width="26" height="100" />
        <rect x="288" y="20" width="20" height="140" />
        <rect x="314" y="100" width="34" height="60" />
        <rect x="354" y="55" width="28" height="105" />
        <rect x="388" y="85" width="30" height="75" />
        <rect x="424" y="40" width="24" height="120" />
        <rect x="454" y="95" width="34" height="65" />
        <rect x="494" y="65" width="26" height="95" />
        <rect x="526" y="105" width="30" height="55" />
        <rect x="562" y="75" width="38" height="85" />
      </g>
    </svg>
  )
}
