import { FileDown } from "lucide-react"

/**
 * B2 — the assembled packet. Mirrors lib/packet/assemble.ts: a cover sheet, an
 * investigator index, then tabbed sections in the exact order the License
 * Division reads them. Rendered as a few fanned pages with the index legible —
 * the payoff of the whole process, handed over ready to file.
 */
const INDEX = [
  { tab: "A", label: "Application & fees", pages: "1–4" },
  { tab: "B", label: "Identity & residence", pages: "5–9" },
  { tab: "C", label: "Character references (4)", pages: "10–17" },
  { tab: "D", label: "Cohabitant affidavits", pages: "18–21" },
  { tab: "E", label: "Training certificates", pages: "22–24" },
  { tab: "F", label: "Disclosures & explanations", pages: "25–31" },
  { tab: "G", label: "Safe storage evidence", pages: "32–33" },
]

export function PacketShowcase() {
  return (
    <div className="relative">
      {/* Fanned pages behind */}
      <div aria-hidden className="absolute inset-0">
        <div className="absolute inset-0 translate-x-3 translate-y-3 rotate-2 rounded-xl border border-hairline bg-surface-1/70" />
        <div className="absolute inset-0 translate-x-1.5 translate-y-1.5 rotate-1 rounded-xl border border-hairline bg-surface-1/85" />
      </div>

      {/* Top page: cover + index */}
      <div className="relative rounded-xl border border-hairline bg-surface-1 p-6 shadow-[0_24px_60px_-40px_rgba(20,18,14,0.4)]">
        <div className="flex items-start justify-between border-b border-hairline pb-4">
          <div>
            <div className="engraved text-brass-bright">NYPD License Division</div>
            <div className="mt-1 font-display text-lg font-semibold">Application Packet</div>
            <div className="mt-0.5 text-sm text-text-mid">Assembled in filing order · 33 pages · tabbed</div>
          </div>
          <FileDown className="size-5 text-brass" />
        </div>

        <div className="engraved mt-4 mb-2 text-text-low">Investigator index</div>
        <ul className="divide-y divide-hairline">
          {INDEX.map((row) => (
            <li key={row.tab} className="flex items-center gap-3 py-2 text-sm">
              <span className="flex size-6 shrink-0 items-center justify-center rounded bg-brass/15 font-mono text-xs font-semibold text-brass-bright">
                {row.tab}
              </span>
              <span className="flex-1 font-medium">{row.label}</span>
              <span className="font-mono text-xs text-text-low">{row.pages}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}
