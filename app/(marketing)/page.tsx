import Link from "next/link"
import { buildMetadata } from "@/lib/seo"
import { getPublicPackages, getPublicFees } from "@/lib/public-data"
import { JsonLd, serviceSchemaWithOffers } from "@/components/marketing/json-ld"
import { HeroGuidedPath } from "@/components/marketing/v2/hero-guided-path"

export const metadata = buildMetadata({
  title: "NYC Gun License Help — Concealed Carry",
  description:
    "NYC gun license help without the guesswork. We organize your documents, training, references, and deadlines while you stay in control.",
  path: "/",
  hreflang: "",
  ogTitle: "NYC gun license, handled — Gun License NYC",
})

/**
 * Homepage — marketing redesign v2 (redesign/homepage-visual-spec.html), scoped
 * under `.mkt2`. Copy and structure are ported from the spec; links point at real
 * routes; the Service JSON-LD and the live government fees stay wired to our data.
 * Entrances are CSS scroll-driven and start from a visible opacity (see
 * marketing-v2.css). The hero's <HeroGuidedPath> is a server-rendered architectural
 * illustration; its entrance and scroll response are CSS-only, finite, and
 * progressively enhanced.
 */
export default async function Home() {
  // Cookieless + cached → this page stays statically rendered (see lib/public-data).
  const [packages, fees] = await Promise.all([getPublicPackages(), getPublicFees()])

  return (
    <>
      {/* Offers come from the live service_packages rows — a price change in admin
          moves the structured data with it. */}
      <JsonLd data={serviceSchemaWithOffers(packages)} />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <section className="hero" aria-labelledby="hero-title">
        <div className="shell hero-grid">
          <div className="hero-copy">
            <p className="eyebrow">NYC · Private case management</p>
            <h1 id="hero-title">
              Complicated by design.
              <br />
              <span className="hero-highlight">Clear by ours.</span>
            </h1>
            <p className="hero-lede">
              We turn New York City’s concealed-carry process into one clear next step at a
              time—preparing your documents, tracking every requirement, and keeping your case
              organized while you remain in control of your own application.
            </p>
            <div className="hero-action">
              <div className="hero-buttons">
                <Link className="button" href="/eligibility">
                  Check eligibility <span className="button-arrow" aria-hidden="true">→</span>
                </Link>
                <Link className="button button-outline" href="/how-it-works">
                  See the process
                </Link>
              </div>
              <span className="hero-micro">2 minutes · no card required</span>
            </div>
          </div>

          <HeroGuidedPath />
        </div>
      </section>

      {/* ── PROOF RAIL ───────────────────────────────────────────────────────── */}
      <section className="proof-rail" aria-label="Service principles">
        <div className="shell proof-grid">
          <div className="proof-item">
            <span className="proof-index">01</span>
            <p><strong>All five boroughs</strong>One case system built around NYC’s published process.</p>
          </div>
          <div className="proof-item">
            <span className="proof-index">02</span>
            <p><strong>Every requirement traced</strong>Your file is organized against a source, not a guess.</p>
          </div>
          <div className="proof-item">
            <span className="proof-index">03</span>
            <p><strong>You remain the applicant</strong>You review and submit your own application.</p>
          </div>
        </div>
      </section>

      {/* ── PROCESS — five phases ────────────────────────────────────────────── */}
      <section className="section dark" id="process" aria-labelledby="process-title">
        <div className="shell">
          <div className="phases-head">
            <div>
              <p className="eyebrow">A controlled process</p>
              <h2 className="display" id="process-title">One clear path.<br />Five phases.</h2>
            </div>
            <p className="section-lede">
              The full journey is long. Your interface is not. At every stage, you see what is yours,
              what is being prepared, and what comes next.
            </p>
          </div>

          <div className="journey-console" aria-label="Five phases of the service">
            <div className="journey-toolbar">
              <span>PRIVATE CASE DESK / NYC</span>
              <span className="journey-live"><i aria-hidden="true" /> CONTROLLED + TRACEABLE</span>
            </div>
            <div className="journey-workspace">
              <div className="journey-dossier">
                <div className="dossier-sight" aria-hidden="true"><i /><i /></div>
                <div className="dossier-topline">
                  <span>NYC / CCW</span><span>CASE 001</span>
                </div>
                <p className="dossier-kicker">One organized case file</p>
                <h3>Precision around every requirement.</h3>
                <div className="dossier-count">
                  <strong>24</strong>
                  <span>requirements<br />tracked together</span>
                </div>
                <div className="dossier-status">
                  <span><i aria-hidden="true" /> Identity</span>
                  <span><i aria-hidden="true" /> Training</span>
                  <span><i aria-hidden="true" /> References</span>
                  <span><i aria-hidden="true" /> Disclosures</span>
                </div>
                <p className="dossier-note">Document preparation · timing control · source traceability</p>
              </div>

              <div className="journey-sequence-wrap">
                <p className="journey-sequence-label">Your guided sequence</p>
                <ol className="journey-sequence">
                  {[
                    ["01", "Qualify", "Confirm the track and identify legal-review boundaries."],
                    ["02", "Train", "Plan the required course inside the usable certificate window."],
                    ["03", "Assemble", "Bring documents, people, records, and disclosures into one file."],
                    ["04", "Review", "Pass a structured completeness gate before submission."],
                    ["05", "You submit", "Review the finished packet and submit your own application."],
                  ].map(([n, t, d], i) => (
                    <li className={i === 4 ? "is-final" : undefined} key={n}>
                      <span className="journey-step-number">{n}</span>
                      <span className="journey-step-copy"><strong>{t}</strong><small>{d}</small></span>
                      <span className="journey-step-state">{i === 4 ? "YOUR CONTROL" : "GUIDED"}</span>
                    </li>
                  ))}
                </ol>
              </div>
            </div>
            <div className="journey-boundary">
              <span>WE PREPARE + ORGANIZE</span><i aria-hidden="true" />
              <strong>YOU REVIEW + SUBMIT</strong>
            </div>
          </div>
          <p className="phase-note">
            <strong>Thirteen stages behind the scenes.</strong> Five phases in front of you. The
            system handles the complexity; you always keep the final decision.
          </p>
        </div>
      </section>

      {/* ── REQUIREMENTS — everything in order ───────────────────────────────── */}
      <section className="section" id="requirements" aria-labelledby="requirements-title">
        <div className="shell order-grid">
          <div className="order-copy">
            <p className="eyebrow">Your complete file</p>
            <h2 className="display" id="requirements-title">Everything<br />in order.</h2>
            <p className="section-lede">
              One checklist serves your case from the first intake answer to the final pre-submission
              review.
            </p>
            <p className="order-note">
              Requirements change with license type, renewal status, household, and personal history.
              Your list is generated for your case—not copied from a generic worksheet.
            </p>
          </div>

          <div className="requirement-stack">
            {[
              ["01", "References and household", "7 items", true, [
                "Four character references, tracked through notarization where required",
                "One cohabitant statement for each adult living with you",
                "Private outreach links that keep sensitive case information out of view",
              ]],
              ["02", "Training and timing", "4 items", false, [
                "18-hour training certificate",
                "Certificate timing checked against the intended submission date",
                "Training-related records organized with the rest of the case file",
              ]],
              ["03", "Identity and residence", "5 items", false, [
                "Government-issued identity documents",
                "Address and residence documentation",
                "Photo and document-format checks",
              ]],
              ["04", "Disclosures and records", "5 items", false, [
                "Complete disclosure intake, including sealed or dismissed matters",
                "Supporting records requested and tracked where applicable",
                "Attorney referral whenever the question becomes legal advice",
              ]],
              ["05", "Submission readiness", "3 items", false, [
                "Blocking items resolved before the packet is marked ready",
                "Named staff review recorded",
                "Your final review completed before you submit",
              ]],
            ].map(([idx, title, count, open, items]) => (
              <details className="requirement-group" key={idx as string} open={open as boolean}>
                <summary>
                  <span className="req-index">{idx as string}</span>
                  <span className="req-title">{title as string}</span>
                  <span className="req-count">{count as string}</span>
                  <span className="req-plus" aria-hidden="true">+</span>
                </summary>
                <div className="requirement-body">
                  <ul>
                    {(items as string[]).map((it) => <li key={it}>{it}</li>)}
                  </ul>
                </div>
              </details>
            ))}
          </div>
        </div>
      </section>

      {/* ── REALITY — what it actually takes ─────────────────────────────────── */}
      <section className="section reality" aria-labelledby="reality-title">
        <div className="shell">
          <div className="reality-head">
            <div>
              <p className="eyebrow">The real shape of it</p>
              <h2 className="display" id="reality-title">What it actually takes.</h2>
            </div>
            <p>
              Clear expectations are part of the service. These are planning facts—not promises about
              what the NYPD will decide or when it will act.
            </p>
          </div>
          <div className="planning-board">
            <div className="planning-window">
              <div className="planning-window-top">
                <span>NYC CARRY / PLANNING PROFILE</span>
                <i aria-hidden="true" />
              </div>
              <div className="planning-window-value">
                <strong>~6</strong>
                <span>months</span>
              </div>
              <p>Typical planning horizon from a complete submission to a decision.</p>
              <small>PLANNING RANGE · NOT AN OUTCOME PROMISE</small>
            </div>
            <ol className="planning-track">
              {[
                ["18", "hours of training", "Protect the certificate window."],
                ["04", "character references", "Track outreach through completion."],
                ["1×", "each adult at home", "One statement per cohabitant."],
                ["01", "NYPD interview", "Prepare for questions and requests."],
              ].map(([value, label, detail], i) => (
                <li key={label}>
                  <span className="planning-index">0{i + 1}</span>
                  <strong>{value}</strong>
                  <p><b>{label}</b><small>{detail}</small></p>
                </li>
              ))}
            </ol>
          </div>
        </div>
      </section>

      {/* ── LEGAL — candor built in ──────────────────────────────────────────── */}
      <section className="section dark" id="legal" aria-labelledby="candor-title">
        <div className="shell candor-grid">
          <div className="candor-copy">
            <p className="eyebrow">Candor, built in</p>
            <h2 className="display" id="candor-title">The complete story is the safest one.</h2>
            <p className="section-lede">
              The process expects full disclosure. Our intake is designed to surface what belongs in
              the record—not to decide what can be left out.
            </p>
          </div>
          <aside className="candor-panel" aria-label="Disclosure approach">
            <h3>Nothing important gets minimized.</h3>
            <p>
              Sealed and dismissed arrests are still disclosed. Records are gathered and organized.
              Questions that call for legal judgment move to a New York-licensed attorney.
            </p>
            <ol className="candor-rules">
              <li><span>01</span><div>Tell the complete history in intake.</div></li>
              <li><span>02</span><div>Collect the records the published process calls for.</div></li>
              <li><span>03</span><div>Keep document preparation separate from legal advice.</div></li>
            </ol>
            <div className="attorney-seam">
              <strong>When the question is legal, the path changes.</strong>
              <p>
                We stop at the boundary and help you reach independent legal counsel. Only a New
                York-licensed attorney may represent an applicant before the License Division.
              </p>
            </div>
          </aside>
        </div>
      </section>

      {/* ── PRICING ──────────────────────────────────────────────────────────── */}
      <section className="section" id="pricing" aria-labelledby="pricing-title">
        <div className="shell pricing-grid">
          <div>
            <p className="eyebrow">Transparent from day one</p>
            <h2 className="display" id="pricing-title">One fee to us. Everything else, at cost.</h2>
            <p className="section-lede">
              You should know the complete financial picture before starting—not discover it one
              invoice at a time.
            </p>
          </div>
          <article className="price-card">
            <div className="price-top">
              <div>
                <p className="price-name">Full concierge</p>
                <p className="price-number">$1,000</p>
              </div>
              <p className="only-fee">The only service fee collected by Gun License NYC.</p>
            </div>
            <dl className="ledger">
              <div><dt>NYPD application</dt><dd>{fees.applicationFee}</dd></div>
              <div><dt>Fingerprint fee</dt><dd>{fees.fingerprintFee}</dd></div>
              <div><dt>Required training</dt><dd>$500–650</dd></div>
              <div><dt>Expected notarization</dt><dd>$25–100</dd></div>
            </dl>
            <div className="ledger-total">
              <span>Estimated all-in range</span>
              <strong>$1,950–2,200</strong>
            </div>
            <Link className="button" href="/pricing">
              See what the service includes <span className="button-arrow" aria-hidden="true">→</span>
            </Link>
          </article>
        </div>
      </section>

      {/* ── PROMISE — the refile promise ─────────────────────────────────────── */}
      <section className="promise" id="promise" aria-labelledby="promise-title">
        <div className="shell promise-grid">
          <div>
            <p className="eyebrow">Our work, owned</p>
            <h2 id="promise-title">The refile promise.</h2>
            <p>
              If we assemble your filing packet and the License Division returns it as incomplete, we
              reassemble it so you can resubmit at no additional service charge.
            </p>
          </div>
          <div className="promise-block">
            <p className="eyebrow">The important boundary</p>
            <h2>A promise about preparation—not outcome.</h2>
            <p>
              Government fees are set by the City and State and are not refundable by us. The NYPD
              retains full investigative discretion. You review and submit your own application.
            </p>
          </div>
        </div>
      </section>

      {/* ── GUIDES ───────────────────────────────────────────────────────────── */}
      <section className="section" id="guides" aria-labelledby="guides-title">
        <div className="shell">
          <div className="guides-head">
            <div>
              <p className="eyebrow">Understand before you begin</p>
              <h2 className="display" id="guides-title">Clear answers.<br />Primary sources.</h2>
            </div>
            <p className="section-lede">
              Read the requirements, costs, timeline, and legal boundaries in plain language, with a
              clear path back to the rules that govern the process.
            </p>
          </div>
          <nav className="guide-list" aria-label="Featured guides">
            {[
              ["01", "/requirements", "NYC concealed-carry requirements", "Documents, references, household statements, training, and disclosures."],
              ["02", "/cost", "The complete cost", "Service, government, training, fingerprint, and notarization costs."],
              ["03", "/timeline", "Timeline and process", "How thirteen internal stages become five understandable phases."],
              ["04", "/resources", "Official sources and legal boundaries", "Where the rules come from, and when a question belongs with an attorney."],
            ].map(([no, href, title, desc]) => (
              <Link className="guide-link" href={href} key={no}>
                <span className="guide-no">{no}</span>
                <span>
                  <span className="guide-title">{title}</span>
                  <span className="guide-desc">{desc}</span>
                </span>
                <span className="guide-arrow" aria-hidden="true">→</span>
              </Link>
            ))}
          </nav>
        </div>
      </section>

      {/* ── CLOSING ──────────────────────────────────────────────────────────── */}
      <section className="closing dark" aria-labelledby="closing-title">
        <div className="shell closing-inner">
          <div className="closing-copy">
            <p className="eyebrow">Start with clarity</p>
            <h2 id="closing-title">See where<br />you stand.</h2>
            <p>
              Answer a short set of questions and see whether our document-preparation and
              case-management service fits your situation.
            </p>
          </div>
          <div className="closing-action">
            <Link className="button button-light" href="/eligibility">
              Check eligibility <span className="button-arrow" aria-hidden="true">→</span>
            </Link>
            <p>2 minutes · no card required</p>
          </div>
        </div>
      </section>
    </>
  )
}
