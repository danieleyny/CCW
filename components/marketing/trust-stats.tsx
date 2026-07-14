import { HudStat } from "@/components/ui/hud-stat"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import type { TrustStat } from "@/lib/stats"

/**
 * V5b Workstream C — the trust band. Renders ONLY when at least two stats clear
 * the n≥25 suppression bar (the caller passes an already-suppressed list). Every
 * figure carries a footnote: what it counts, over what window, as of what date,
 * from our own records. Big number, honest asterisk — done better than USCCA.
 */
export function TrustStats({ stats }: { stats: TrustStat[] }) {
  if (stats.length < 2) return null
  return (
    <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
      <SectionEyebrow>By our own records</SectionEyebrow>
      <div className="mt-6 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {stats.map((s, i) => (
          <div key={s.label} className="space-y-2">
            <HudStat value={s.value} label={s.label} suffix={s.suffix ?? ""} />
            <p className="px-1 text-[11px] leading-snug text-text-low">
              <sup>{i + 1}</sup> {s.footnote}
            </p>
          </div>
        ))}
      </div>
    </section>
  )
}
