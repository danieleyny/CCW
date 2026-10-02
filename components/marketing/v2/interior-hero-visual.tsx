import type { CSSProperties } from "react"

export type InteriorHeroVariant =
  | "process"
  | "evidence"
  | "ledger"
  | "decision"
  | "editorial"
  | "concierge"

const LABELS: Record<InteriorHeroVariant, readonly string[]> = {
  process: ["Qualify", "Train", "Assemble", "Review", "Submit"],
  evidence: ["Rule", "Source", "Verified", "Required"],
  ledger: ["Service", "Government", "Training", "Total"],
  decision: ["Your answer", "Published rule", "Clear next step"],
  editorial: ["Plain English", "Primary source", "Current"],
  concierge: ["Intake", "Case file", "Checklist", "Ready"],
}

/**
 * Selects one of a small number of shared visual systems without forcing every
 * marketing route to hand-author hero artwork. The caller can still provide an
 * explicit variant when a page needs to override the content-derived default.
 */
export function inferInteriorHeroVariant(eyebrow: string, title: string): InteriorHeroVariant {
  const subject = `${eyebrow} ${title}`.toLowerCase()

  if (/price|pricing|cost|fee|membership/.test(subject)) return "ledger"
  if (/eligib|qualif|lawyer|disqual|renew|reciproc|premises|carry/.test(subject)) return "decision"
  if (/requirement|resource|source|document|checklist|filing/.test(subject)) return "evidence"
  if (/guide|blog|glossary|answer|faq|learn/.test(subject)) return "editorial"
  if (/process|timeline|how it works|step/.test(subject)) return "process"
  return "concierge"
}

export function InteriorHeroVisual({ variant }: { variant: InteriorHeroVariant }) {
  const labels = LABELS[variant]

  return (
    <div className={`ih-visual ih-visual--${variant}`} aria-hidden="true">
      <span className="ih-grid" />
      <span className="ih-orbit ih-orbit--outer" />
      <span className="ih-orbit ih-orbit--inner" />
      <span className="ih-axis ih-axis--x" />
      <span className="ih-axis ih-axis--y" />

      <div className="ih-core">
        <span className="ih-core-kicker">Case system</span>
        <strong>{variant === "ledger" ? "$" : variant === "decision" ? "?" : "✓"}</strong>
        <small>{variant}</small>
      </div>

      <div className="ih-path">
        {labels.map((label, index) => (
          <span
            className="ih-node"
            key={label}
            style={{ "--i": index } as CSSProperties}
          >
            <i />
            <b>{label}</b>
          </span>
        ))}
      </div>

      <div className="ih-file-stack">
        <span />
        <span />
        <span />
      </div>

      <div className="ih-status">
        <i />
        <span>Organized · traceable · yours</span>
      </div>
    </div>
  )
}
