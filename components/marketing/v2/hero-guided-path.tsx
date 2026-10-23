/**
 * The hero visual is deliberately a case file, not a generic city illustration.
 * Three paper states travel through the same thin route: intake → organized →
 * ready for the applicant's review. CSS provides the quiet, finite motion so the
 * first view remains useful even when motion is reduced.
 */
export function HeroGuidedPath() {
  return (
    <div className="hero-guided-path" aria-hidden="true">
      <div className="case-journey-route">
        <svg viewBox="0 0 760 600" focusable="false">
          <path className="case-route-bed" d="M70 492C156 488 158 398 270 390s114-118 220-124 99-90 184-158" />
          <path className="case-route-live" d="M70 492C156 488 158 398 270 390s114-118 220-124 99-90 184-158" />
        </svg>
      </div>

      <section className="case-file case-file--intake">
        <span className="case-file-tab">01 / INTAKE</span>
        <i /><i /><i />
        <b />
      </section>

      <section className="case-file case-file--organized">
        <span className="case-file-tab">02 / ORGANIZED</span>
        <div className="case-file-layer case-file-layer--back" />
        <div className="case-file-layer case-file-layer--middle" />
        <div className="case-file-sheet"><i /><i /><i /><b /></div>
      </section>

      <section className="case-file case-file--review">
        <span className="case-file-tab">03 / YOUR REVIEW</span>
        <div className="case-file-layer case-file-layer--back" />
        <div className="case-file-layer case-file-layer--middle" />
        <div className="case-file-sheet"><i /><i /><i /><b /></div>
        <span className="case-file-seal">✓</span>
      </section>

      <span className="case-journey-caption">YOUR CASE / VISIBLE STAGES</span>
    </div>
  )
}
