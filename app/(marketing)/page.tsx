import Link from "next/link"
import { buildMetadata } from "@/lib/seo"
import { getPublicPackages } from "@/lib/public-data"
import { JsonLd, serviceSchemaWithOffers } from "@/components/marketing/json-ld"
import Hero from "@/components/marketing/hero/Hero"
import PhasesSection from "@/components/marketing/phases/PhasesSection"
import { CaseChecklistDemo } from "@/components/marketing/v2/case-checklist-demo"
import PlanningRealities from "@/components/marketing/planning-realities/PlanningRealities"
import PricingSection from "@/components/marketing/pricing/PricingSection"

export const metadata = buildMetadata({
  title: "NYC Gun License Help — Concealed Carry",
  description:
    "Guidance for preparing a NYC gun-license application: documents, requirements and clear next steps. You review and submit it yourself.",
  path: "/",
  hreflang: "",
  ogTitle: "NYC gun license, handled — Gun License NYC",
})

/**
 * Homepage — marketing redesign v2 (redesign/homepage-visual-spec.html), scoped
 * under `.mkt2`. Copy and structure are ported from the spec; links point at real
 * routes; the Service JSON-LD stays wired to the live package data.
 * Entrances are CSS scroll-driven and start from a visible opacity (see
 * marketing-v2.css). The hero's live-map composition is isolated in its own module.
 */
export default async function Home() {
  // Cookieless + cached → this page stays statically rendered (see lib/public-data).
  const packages = await getPublicPackages()

  return (
    <>
      {/* Offers come from the live service_packages rows — a price change in admin
          moves the structured data with it. */}
      <JsonLd data={serviceSchemaWithOffers(packages)} />

      {/* ── HERO ─────────────────────────────────────────────────────────────── */}
      <Hero />

      {/* ── PROOF RAIL ───────────────────────────────────────────────────────── */}
      <section className="proof-rail" aria-label="Service principles">
        <div className="shell proof-grid">
          {[
            ["01", "boroughs", "All five boroughs", "One case system built around NYC’s published process."],
            ["02", "traced", "Every requirement traced", "Your file is organized against a source, not a guess."],
            ["03", "applicant", "You remain the applicant", "You review and submit your own application."],
          ].map(([index, mark, title, detail]) => (
            <article className={`proof-item proof-item--${mark}`} key={index}>
              <span className="proof-mark" aria-hidden="true" />
              <div className="proof-copy">
                <span className="proof-index">{index}</span>
                <p><strong>{title}</strong>{detail}</p>
              </div>
            </article>
          ))}
        </div>
      </section>

      {/* ── PROCESS — five phases ────────────────────────────────────────────── */}
      <PhasesSection />

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

          <CaseChecklistDemo />
        </div>
      </section>

      <PlanningRealities />

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
            <p className="candor-panel-label">Complete record</p>
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
      <PricingSection />

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
