import Link from "next/link"

const requirementGroups = [
  ["01", "References & household", "People and household details tied to your case."],
  ["02", "Training & timing", "Qualifying course documentation and relevant dates."],
  ["03", "Identity & residence", "Identity and residence documentation for your file."],
  ["04", "Disclosures & records", "Complete disclosures and supporting records where required."],
  ["05", "Submission readiness", "A structured review before your own submission."],
] as const

/**
 * A deliberately representative view of the requirements engine — not a claim
 * about a visitor's individual case. The live portal generates this checklist
 * from the applicant's intake answers.
 */
export function CaseChecklistDemo() {
  return (
    <div className="case-demo" aria-label="Example of a case-specific requirements checklist">
      <div className="case-demo-light" aria-hidden="true" />

      <div className="case-demo-workspace">
        <div className="case-demo-heading">
          <div>
            <p className="case-demo-kicker">Case-specific checklist</p>
            <p className="case-demo-subtitle">Built from the answers you provide.</p>
          </div>
          <span className="case-demo-tag">Example view</span>
        </div>

        <ol className="case-demo-list">
          <span className="case-demo-rail" aria-hidden="true" />
          {requirementGroups.map(([number, title, description]) => (
            <li className="case-demo-item" key={number}>
              <span className="case-demo-marker" aria-hidden="true" />
              <span className="case-demo-number">{number}</span>
              <span className="case-demo-item-copy">
                <strong>{title}</strong>
                <small>{description}</small>
              </span>
            </li>
          ))}
        </ol>
      </div>

      <aside className="case-demo-review">
        <p className="case-demo-kicker">Next step</p>
        <h3>Your review</h3>
        <p>
          Review your prepared materials for accuracy before you submit your own application.
        </p>
        <Link href="/requirements" className="case-demo-link">
          Explore the requirements <span aria-hidden="true">→</span>
        </Link>
      </aside>
    </div>
  )
}
