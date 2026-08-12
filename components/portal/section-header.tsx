import { cn } from "@/lib/utils"

/**
 * The shared section-header ROW — a mono eyebrow, a rule that fades to the right,
 * and an optional count on the far end. Lifted out of requirements-checklist so
 * the checklist and the intake wizard stop inventing their own section treatment.
 *
 * On a phone the label uses `.engraved-sm` (a touch larger than `.engraved`, which
 * is an 11px micro-label — too small to lead a section on a small screen).
 */
export function SectionHeader({
  label,
  count,
  id,
  className,
}: {
  label: string
  /** e.g. "3 / 13" or "2" — rendered mono on the far right. Omit for none. */
  count?: string
  /** Set when the header labels a region via aria-labelledby. */
  id?: string
  className?: string
}) {
  return (
    <div className={cn("mb-3 flex items-center gap-3", className)}>
      <h3 id={id} className="engraved-sm shrink-0 text-text-mid">
        {label}
      </h3>
      <div aria-hidden className="h-px min-w-6 flex-1 bg-gradient-to-r from-hairline to-transparent" />
      {count && (
        <span className="shrink-0 font-mono text-[10px] tabular-nums text-text-low">{count}</span>
      )}
    </div>
  )
}
