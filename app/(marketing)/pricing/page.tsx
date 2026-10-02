import Link from "next/link"
import { TrackView } from "@/components/analytics/track-view"
import { getPublicPackages, getPublicFees } from "@/lib/public-data"
import { getTrustStats } from "@/lib/stats"
import { buildMetadata } from "@/lib/seo"
import { RefilePromise } from "@/components/marketing/refile-promise"
import { TrustStats } from "@/components/marketing/trust-stats"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { RelatedLinks } from "@/components/marketing/page-blocks"
import { JsonLd, serviceSchemaWithOffers } from "@/components/marketing/json-ld"

export const metadata = buildMetadata({
  title: "NYC Gun License Service Pricing",
  description:
    "What our NYC gun license help costs — Self-Guided, Full Concierge, Non-Resident, and Renewal tiers. Government fees are paid directly, never marked up.",
  path: "/pricing",
})

const FEATURES: Record<string, string[]> = {
  self_guided: ["Client portal access", "Full document checklist", "Filing guidance", "Email support"],
  full_concierge: [
    "Everything in Self-Guided",
    "Training coordination",
    "Document prep + notarization help",
    "Application assembly + filing",
    "Interview preparation",
    "Priority concierge support",
  ],
  non_resident: ["Dedicated Special Carry track", "Out-of-area logistics", "Document prep + filing"],
  renewal: ["Discounted 3-year renewal", "Document refresh", "Re-filing support"],
}

export default async function Pricing() {
  // V3-P3.1 — pricing comes from the DB; a price change is a data edit.
  // Cookieless + cached → static render (see lib/public-data).
  const [packages, fees, stats] = await Promise.all([getPublicPackages(), getPublicFees(), getTrustStats()])
  return (
    <div className="guide-page">
      <TrackView event="pricing_viewed" />
      {/* The Service + live Offers belong on the canonical pricing page too, not
          only the home page — every Offer's url already points here. */}
      <JsonLd data={serviceSchemaWithOffers(packages)} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]} />
      <PageHero
        eyebrow="Membership"
        title="Pick how much you want us to handle"
        subtitle="From guided support to fully managed preparation — every tier keeps your application organized and on schedule. Deposit to start, balance when your packet is ready."
      />

      <section style={{ padding: "56px 0 8px" }}>
        <div className="shell">
          <div
            style={{
              display: "grid",
              gap: 14,
              gridTemplateColumns: "repeat(auto-fit, minmax(240px, 1fr))",
            }}
          >
            {packages.map((p) => {
              const featured = p.featured
              return (
                <div
                  key={p.key}
                  style={{
                    display: "flex",
                    flexDirection: "column",
                    padding: 26,
                    background: "var(--paper)",
                    border: featured ? "1px solid var(--ink)" : "1px solid var(--rule)",
                    boxShadow: featured ? "var(--shadow-soft)" : "none",
                  }}
                >
                  {featured && (
                    <div
                      style={{
                        marginBottom: 8,
                        color: "var(--electric)",
                        fontFamily: "var(--mono)",
                        fontSize: 11,
                        letterSpacing: "0.08em",
                        textTransform: "uppercase",
                      }}
                    >
                      Most chosen
                    </div>
                  )}
                  <h3 style={{ margin: 0, fontFamily: "var(--display)", fontSize: 20, fontWeight: 600 }}>
                    {p.name}
                  </h3>
                  <div
                    style={{
                      marginTop: 8,
                      fontFamily: "var(--display)",
                      fontSize: 34,
                      fontWeight: 500,
                      letterSpacing: "-0.03em",
                      fontVariantNumeric: "tabular-nums",
                    }}
                  >
                    {p.priceLabel}
                  </div>
                  <p style={{ margin: "8px 0 0", fontSize: 14, color: "var(--ink-soft)" }}>{p.blurb}</p>
                  <ul style={{ listStyle: "none", margin: "20px 0 0", padding: 0, flex: 1, display: "grid", gap: 10 }}>
                    {(FEATURES[p.key] ?? []).map((f) => (
                      <li key={f} style={{ display: "flex", gap: 8, fontSize: 14, color: "var(--ink-soft)" }}>
                        <span aria-hidden="true" style={{ color: "var(--success)", flexShrink: 0 }}>
                          ✓
                        </span>
                        <span>{f}</span>
                      </li>
                    ))}
                  </ul>
                  <Link
                    className={featured ? "button" : "button button-outline"}
                    href={`/portal/enroll?package=${p.key}`}
                    style={{ marginTop: 24, width: "100%" }}
                  >
                    {p.priceCents > 0 ? "Buy now" : "Talk to us"}
                  </Link>
                </div>
              )
            })}
          </div>

          <p
            style={{
              marginTop: 32,
              textAlign: "center",
              fontFamily: "var(--mono)",
              fontSize: 12,
              color: "var(--ink-muted)",
            }}
          >
            Service fees only. NYPD charges a separate {fees.applicationFee} license fee +{" "}
            {fees.fingerprintFee} fingerprinting fee.
          </p>

          {/* V5b — The Refile Promise, a band under the packages. */}
          <div style={{ margin: "48px auto 0", maxWidth: 680 }}>
            <RefilePromise />
          </div>
        </div>
      </section>

      <TrustStats stats={stats} />

      <RelatedLinks
        links={[
          { label: "What the whole thing costs, all-in", href: "/cost" },
          { label: "Do I even need to pay for help?", href: "/do-i-need-a-lawyer" },
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "How the process works, step by step", href: "/how-it-works" },
        ]}
      />
    </div>
  )
}
