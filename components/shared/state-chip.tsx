import { cn } from "@/lib/utils"
import { chipClasses, docStateStyle, type DocState } from "@/lib/ui/doc-state"

/**
 * The one chip for a document's state. Mass (filled / outline / ghost) — not hue
 * alone — separates the states, so they read in greyscale and for colour-blind
 * viewers. The icon is always shown, so colour is never the only signal.
 * Drives itself entirely from lib/ui/doc-state; a caller passes only the DocState
 * (and optionally overriding label text, e.g. "Waiting on Pamela").
 */
export function StateChip({ state, label, className }: { state: DocState; label?: string; className?: string }) {
  const s = docStateStyle(state)
  const Icon = s.icon
  return (
    <span
      className={cn(
        "inline-flex shrink-0 items-center gap-1 text-xs font-medium",
        chipClasses(s.chipVariant, s.tone),
        className
      )}
    >
      <Icon className="size-3.5" />
      {label ?? s.label}
    </span>
  )
}
