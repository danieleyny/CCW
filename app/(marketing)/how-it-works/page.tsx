import Link from "next/link"
import { CASE_STAGES } from "@/config/stages"
import { JOURNEY } from "@/content/journey"
import { buildMetadata } from "@/lib/seo"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { RelatedLinks } from "@/components/marketing/page-blocks"
import { RequirementsWall } from "@/components/marketing/showcase/requirements-wall"
import { RefilePromise } from "@/components/marketing/refile-promise"

export const metadata = buildMetadata({
  title: "How to Get a Gun License in NYC",
  description:
    "The NYC gun license process end to end — eligibility, the 18-hour course, documents, notarization, filing, the investigation, and the interview.",
  path: "/how-it-works",
  hreflang: "/how-it-works",
})

const measure: React.CSSProperties = { width: "min(100% - 48px, 820px)", marginInline: "auto" }

export default function HowItWorks() {
  return (
    <div className="guide-page">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "How it works", path: "/how-it-works" }]} />
      {/* Copy note: this page renders content/journey.ts (the PUBLIC story), not
          config/stages.ts (the internal pipeline vocabulary). Staff say "Lead /
          Inquiry"; a nervous applicant should never have to. */}
      <PageHero
        eyebrow="How it works"
        title="How we get you ready to file, step by step"
        subtitle="New York's process is tough — which is exactly why having it handled matters. Here's the whole path, and what we do at each point so you don't have to."
      />

      <section style={{ padding: "56px 0 40px" }}>
        <div style={measure}>
          <ol style={{ listStyle: "none", margin: 0, padding: 0, display: "grid", gap: 10 }}>
            {CASE_STAGES.map((s) => (
              <li
                key={s.key}
                style={{ border: "1px solid var(--rule)", background: "var(--ivory)", padding: "20px 22px" }}
              >
                <div
                  style={{
                    color: "var(--electric)",
                    fontFamily: "var(--mono)",
                    fontSize: 11,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                  }}
                >
                  Step {String(s.order).padStart(2, "0")}
                </div>
                <div style={{ marginTop: 4, fontFamily: "var(--display)", fontSize: 20, fontWeight: 600 }}>
                  {JOURNEY[s.key].label}
                </div>
                <p style={{ margin: "6px 0 0", color: "var(--ink-soft)", fontSize: 15, lineHeight: 1.55 }}>
                  {JOURNEY[s.key].description}
                </p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* V5 — the full 24-document citation wall lives here (relocated off the
          homepage, where it read as legalese homework). A motivated reader
          finds it and is impressed instead of exhausted. */}
      <RequirementsWall />

      {/* V5b — the Refile Promise, at the QA-gate payoff: this is the gate said
          out loud. Always beside brand.disclaimer. */}
      <section style={{ padding: "48px 0", borderTop: "1px solid var(--rule)" }}>
        <div style={{ width: "min(100% - 48px, 680px)", marginInline: "auto" }}>
          <RefilePromise />
        </div>
      </section>

      <section style={{ padding: "8px 0 8px" }}>
        <div style={{ ...measure, textAlign: "center" }}>
          <Link className="button" href="/eligibility">
            Check your eligibility <span className="button-arrow" aria-hidden="true">→</span>
          </Link>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "What it costs, all-in", href: "/cost" },
          { label: "How long it takes", href: "/timeline" },
          { label: "Your borough's page", href: "/gun-license" },
        ]}
      />
    </div>
  )
}
