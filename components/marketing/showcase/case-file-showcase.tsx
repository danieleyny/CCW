import { CheckCircle2, CircleDashed, AlertTriangle } from "lucide-react"
import { ReticleProgress } from "@/components/ui/reticle-progress"

/**
 * B2 — the hero's product view. The light marketing page shows the actual DARK
 * instrument (wrapped in `.dark`, so it renders in the app's own theme on
 * paper): a mid-journey case file with the real reticle rail, a vitals strip,
 * and three requirement rows carrying real citations — one that "needs a fix"
 * with a consultant note. Everything here is a real primitive, not a mockup.
 */
const ROWS = [
  {
    code: "REF-01",
    title: "Four notarized character references",
    cite: "38 RCNY §5-03(a)(1)",
    status: "satisfied" as const,
  },
  {
    code: "AFF-01",
    title: "Cohabitant affidavit — every adult in the home",
    cite: "38 RCNY §5-02",
    status: "satisfied" as const,
  },
  {
    code: "TRN-01",
    title: "18-hour firearms safety course + live fire",
    cite: "Penal Law §400.00(19)",
    status: "fix" as const,
    note: "Cert dates 7 months ago — it must be within 6 months at filing. We booked a refresher.",
  },
]

export function CaseFileShowcase() {
  return (
    <div className="dark relative w-full rounded-xl border border-hairline bg-surface-1 p-5 text-foreground shadow-[0_30px_80px_-40px_rgba(20,18,14,0.5)]">
      <div className="flex items-center justify-between">
        <span className="engraved text-text-mid">Case file · NYC carry</span>
        <span className="rounded bg-signal-dim px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-signal">
          Mid-journey
        </span>
      </div>

      <ReticleProgress currentStage="document_collection" className="mt-4" />

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Vital value="1" label="needs a fix" tone="warn" />
        <Vital value="46%" label="complete" tone="brass" />
        <Vital value="24" label="docs tracked" tone="mid" />
      </div>

      <ul className="mt-4 space-y-2">
        {ROWS.map((r) => (
          <li
            key={r.code}
            className="rounded-lg border border-hairline bg-surface-2/60 p-3"
          >
            <div className="flex items-start gap-2.5">
              {r.status === "satisfied" ? (
                <CheckCircle2 className="mt-0.5 size-4 shrink-0 text-ok" />
              ) : (
                <AlertTriangle className="mt-0.5 size-4 shrink-0 text-warn" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-text-mid">
                    {r.code}
                  </span>
                  <span className="text-sm font-medium">{r.title}</span>
                </div>
                <div className="mt-0.5 font-mono text-[11px] text-text-low">{r.cite}</div>
                {r.status === "fix" && (
                  <p className="mt-1.5 rounded border border-warn/25 bg-warn/10 px-2 py-1 text-[11px] leading-snug text-warn">
                    {r.note}
                  </p>
                )}
              </div>
            </div>
          </li>
        ))}
      </ul>

      <div className="mt-3 flex items-center gap-2 text-[11px] text-text-low">
        <CircleDashed className="size-3.5" />
        Every rule carries its citation. Nothing files until it&apos;s satisfied.
      </div>
    </div>
  )
}

function Vital({
  value,
  label,
  tone,
}: {
  value: string
  label: string
  tone: "warn" | "brass" | "mid"
}) {
  const color = tone === "warn" ? "text-warn" : tone === "brass" ? "text-brass-bright" : "text-text-hi"
  return (
    <div className="rounded-lg border border-hairline bg-surface-2/40 px-2 py-2.5">
      <div className={`font-display text-xl font-bold tabular-nums ${color}`}>{value}</div>
      <div className="engraved mt-0.5 text-[9px] text-text-low">{label}</div>
    </div>
  )
}
