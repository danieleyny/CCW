import { buildMetadata } from "@/lib/seo"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { RelatedLinks } from "@/components/marketing/page-blocks"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { buildResourceGroups } from "@/content/resources"
import { getPublicFees } from "@/lib/public-data"

export const metadata = buildMetadata({
  title: "NYC Gun License Official Sources",
  description:
    "Primary sources for NYC gun licensing — the NYPD License Division, fees, DCJS, CCIA training, recertification, and safe storage. Each link dated.",
  path: "/resources",
})

export default async function ResourcesPage() {
  const fees = await getPublicFees()
  const resourceGroups = buildResourceGroups(fees)

  return (
    <div className="guide-page">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Resources", path: "/resources" }]} />
      <PageHero
        eyebrow="Resources"
        title="Official sources, in one place"
        subtitle="Everything here points to a government source. Every link is dated the day we last verified it."
      />

      <section style={{ padding: "56px 0 8px" }}>
        <div className="article-body" style={{ width: "min(100% - 48px, 820px)", marginInline: "auto" }}>
          <div className="faq-block" style={{ marginTop: 0, borderTop: "none", paddingTop: 0 }}>
            {resourceGroups.map((g) => (
              <details className="faq-item" key={g.title} open>
                <summary>{g.title}</summary>
                <div style={{ padding: "0 0 24px" }}>
                  {g.intro && (
                    <p style={{ margin: "0 0 12px", color: "var(--ink-soft)", fontSize: 14 }}>{g.intro}</p>
                  )}
                  <ul style={{ listStyle: "none", margin: 0, padding: 0 }}>
                    {g.links.map((l) => (
                      <li key={`${g.title}-${l.label}`} style={{ borderTop: "1px solid var(--rule)" }}>
                        <a
                          href={l.href}
                          target="_blank"
                          rel="noopener noreferrer"
                          style={{
                            display: "flex",
                            minHeight: 52,
                            alignItems: "center",
                            justifyContent: "space-between",
                            gap: 12,
                            padding: "10px 0",
                            textDecoration: "none",
                            color: "var(--ink)",
                          }}
                        >
                          <span style={{ minWidth: 0 }}>
                            <span style={{ display: "block", fontSize: 14, fontWeight: 600 }}>
                              {l.label} <span aria-hidden="true" style={{ color: "var(--ink-muted)" }}>↗</span>
                            </span>
                            {l.note && (
                              <span style={{ display: "block", marginTop: 2, fontSize: 12, color: "var(--ink-soft)" }}>
                                {l.note}
                              </span>
                            )}
                          </span>
                          <span
                            style={{
                              flexShrink: 0,
                              fontFamily: "var(--mono)",
                              fontSize: 10,
                              color: "var(--ink-muted)",
                            }}
                          >
                            verified {l.lastVerified}
                          </span>
                        </a>
                      </li>
                    ))}
                  </ul>
                </div>
              </details>
            ))}
          </div>

          <div style={{ marginTop: 40, textAlign: "center" }}>
            <SectionEyebrow>Note</SectionEyebrow>
            <p style={{ marginTop: 10, fontSize: 12, color: "var(--ink-muted)" }}>
              Rules change. If a link is stale, tell us — we keep these current, and Law Watch emails you
              when a requirement actually changes.
            </p>
          </div>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "What it costs, all-in", href: "/cost" },
          { label: "How long it takes", href: "/timeline" },
          { label: "Common questions, answered", href: "/faq" },
        ]}
      />
    </div>
  )
}
