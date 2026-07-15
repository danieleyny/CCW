import { CheckCircle2, CircleDashed, AlertTriangle } from "lucide-react"
import { cn } from "@/lib/utils"
import { ReticleProgress } from "@/components/ui/reticle-progress"

/**
 * The product view — the actual DARK instrument shown on the marketing page
 * (wrapped in `.dark`, so it renders in the app's own theme): a mid-journey case
 * file with the reticle rail, a vitals strip, and three requirement rows.
 *
 * V7: `simplified` is the RETAIL variant used below the fold (in ProductFeature).
 * It drops the internal codes (REF-01/AFF-01/TRN-01), relabels rows in plain
 * English, and keeps AT MOST ONE citation as a quiet trust signal. The full
 * citation-grade view lives on /how-it-works.
 */
const ROWS = [
  {
    code: "REF-01",
    title: "Four notarized character references",
    plain: "Character references — notarized",
    cite: "38 RCNY §5-03(a)(1)",
    keepCite: true, // the single trust-signal citation kept in the simplified view
    status: "satisfied" as const,
  },
  {
    code: "AFF-01",
    title: "Cohabitant affidavit — every adult in the home",
    plain: "A statement from everyone you live with",
    cite: "38 RCNY §5-02",
    status: "satisfied" as const,
  },
  {
    code: "TRN-01",
    title: "18-hour firearms safety course + live fire",
    plain: "18-hour safety course — done in time",
    cite: "Penal Law §400.00(19)",
    status: "fix" as const,
    note: "Your course certificate is about to age out — it must be recent when you file. We booked a refresher.",
  },
]

export function CaseFileShowcase({
  tilt = false,
  simplified = false,
}: {
  tilt?: boolean
  simplified?: boolean
}) {
  return (
    <div
      className={cn(
        "dark relative w-full rounded-xl border border-hairline bg-surface-1 p-5 text-foreground shadow-[0_30px_80px_-40px_rgba(20,18,14,0.5)]",
        tilt && "product-tilt"
      )}
    >
      <div className="flex items-center justify-between">
        <span className="engraved text-text-mid">Case file · NYC carry</span>
        <span className="rounded bg-signal-dim px-2 py-0.5 font-mono text-[10px] uppercase tracking-wide text-signal">
          Mid-journey
        </span>
      </div>

      <ReticleProgress currentStage="document_collection" className="mt-4" />

      {/* 17 of 24 requirements satisfied — the meter the mock leads with. */}
      <div className="mt-4">
        <div className="flex items-baseline justify-between">
          <span className="engraved text-text-low">Requirements satisfied</span>
          <span className="font-mono text-xs tabular-nums text-brass-bright">17 / 24</span>
        </div>
        <div className="mt-1.5 h-1.5 overflow-hidden rounded-full bg-surface-3">
          <div className="h-full rounded-full bg-brass" style={{ width: `${(17 / 24) * 100}%` }} />
        </div>
      </div>

      <div className="mt-4 grid grid-cols-3 gap-2 text-center">
        <Vital value="1" label="needs a fix" tone="warn" />
        <Vital value="71%" label="complete" tone="brass" />
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
                  {!simplified && (
                    <span className="rounded bg-surface-3 px-1.5 py-0.5 font-mono text-[10px] text-text-mid">
                      {r.code}
                    </span>
                  )}
                  <span className="text-sm font-medium">{simplified ? r.plain : r.title}</span>
                </div>
                {(!simplified || r.keepCite) && (
                  <div className="mt-0.5 font-mono text-[11px] text-text-low">{r.cite}</div>
                )}
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
        {simplified
          ? "We track every requirement. Nothing files until it's ready."
          : "Every rule carries its citation. Nothing files until it's satisfied."}
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
