import Link from "next/link"
import { buildMetadata } from "@/lib/seo"
import { getPublicPackages, getPublicFees } from "@/lib/public-data"
import { JsonLd, serviceSchemaWithOffers } from "@/components/marketing/json-ld"
import { HeroPrecision } from "@/components/marketing/v2/hero-precision"

export const metadata = buildMetadata({
  title: "NYC Gun License Help — Concealed Carry",
  description:
    "Get a NYC gun license without the guesswork. We track all 24 documents, your 18-hour course, and every deadline as one case — and can file it for you.",
  path: "/",
  hreflang: "",
  ogTitle: "NYC gun license, handled — Gun License NYC",
})

/**
 * Homepage — marketing redesign v2 (redesign/homepage-visual-spec.html), scoped
 * under `.mkt2`. Copy and structure are ported from the spec; links point at real
 * routes; the Service JSON-LD and the live government fees stay wired to our data.
 * Entrances are CSS scroll-driven and start from a visible opacity (see
 * marketing-v2.css). The hero's <HeroPrecision> combines an optimized local product
 * rendering with a server-rendered SVG field; its entrance and scroll response are
 * CSS-only, finite, and progressively enhanced.
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

          <HeroPrecision />
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

          <div className="phase-path" aria-label="Five phases of the service">
            {[
              ["01", "Qualify", "Understand the license track, basic fit, and what may require an attorney."],
              ["02", "Train", "Plan the required course and protect the six-month certificate window."],
              ["03", "Assemble", "Collect references, household statements, records, IDs, and disclosures."],
              ["04", "Review", "Run a structured completeness check before anything is ready to submit."],
              ["05", "You submit", "Review your packet, submit it yourself, then prepare for the next NYPD step."],
            ].map(([n, t, d], i) => (
              <article className={`phase${i === 2 ? " is-active" : ""}`} key={n}>
                <div className="phase-card-content">
                  <span className="phase-dot">{n}</span>
                  <div className="phase-text"><h3>{t}</h3><p>{d}</p></div>
                </div>
              </article>
            ))}
          </div>
          <p className="phase-note">
            <strong>Thirteen stages behind the scenes.</strong> Five phases in front of you. Complexity
            stays in the system instead of in your day.
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
          <div className="fact-grid">
            {[
              ["~6", "months", "Typical planning horizon from start to decision."],
              ["18", "hours", "Required training for a concealed-carry application."],
              ["4", "references", "For the standard NYC carry track."],
              ["1×", "each adult", "A cohabitant statement for every adult at home."],
              ["1", "interview", "Prepare for the investigator’s questions and requests."],
            ].map(([v, strong, rest]) => (
              <article className="fact" key={strong}>
                <p className="fact-value">{v}</p>
                <p className="fact-label"><strong>{strong}</strong><br />{rest}</p>
              </article>
            ))}
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
