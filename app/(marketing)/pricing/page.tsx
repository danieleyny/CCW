import Link from "next/link"
import { Check } from "lucide-react"
import { getPublicPackages, getPublicFees } from "@/lib/public-data"
import { getTrustStats } from "@/lib/stats"
import { buildMetadata } from "@/lib/seo"
import { RefilePromise } from "@/components/marketing/refile-promise"
import { TrustStats } from "@/components/marketing/trust-stats"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { RelatedLinks } from "@/components/marketing/page-blocks"
import { JsonLd, serviceSchemaWithOffers } from "@/components/marketing/json-ld"

export const metadata = buildMetadata({
  title: "NYC Gun License Service Pricing",
  description:
    "What our NYC gun license help costs — Self-Guided, Full Concierge, Non-Resident / Special Carry, and Renewal. Government fees are paid directly, never marked up.",
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
    <>
      {/* The Service + live Offers belong on the canonical pricing page too, not
          only the home page — every Offer's url already points here. */}
      <JsonLd data={serviceSchemaWithOffers(packages)} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Pricing", path: "/pricing" }]} />
      <PageHero
        eyebrow="Membership"
        title="Pick how much you want us to handle"
        subtitle="From guided support to fully done-for-you — every tier keeps your application complete and on schedule. Deposit to start, balance on filing."
      />

      <section className="mx-auto max-w-6xl px-4 py-16 sm:px-6">
        <div className="grid gap-4 lg:grid-cols-4">
          {packages.map((p) => {
            const featured = p.featured
            return (
              <div
                key={p.key}
                className={`flex flex-col rounded-lg border bg-card p-6 ${
                  featured ? "brass-edge" : "border-hairline edge-highlight"
                }`}
              >
                {featured && <div className="engraved mb-2 text-brass">Most chosen</div>}
                <h3 className="font-display text-lg font-semibold">{p.name}</h3>
                <div className="mt-2 font-display text-3xl font-bold tabular-nums">{p.priceLabel}</div>
                <p className="mt-2 text-sm text-text-mid">{p.blurb}</p>
                <ul className="mt-5 flex-1 space-y-2.5">
                  {(FEATURES[p.key] ?? []).map((f) => (
                    <li key={f} className="flex gap-2 text-sm">
                      <Check className="mt-0.5 size-4 shrink-0 text-brass" />
                      <span className="text-text-mid">{f}</span>
                    </li>
                  ))}
                </ul>
                <Button asChild variant={featured ? "default" : "outline"} className="mt-6 w-full">
                  <Link href={`/portal/enroll?package=${p.key}`}>
                    {p.priceCents > 0 ? "Buy now" : "Talk to us"}
                  </Link>
                </Button>
              </div>
            )
          })}
        </div>

        <p className="mt-8 text-center font-mono text-xs text-text-low">
          Service fees only. NYPD charges a separate {fees.applicationFee} license fee + {fees.fingerprintFee} fingerprinting fee.
        </p>

        {/* V5b — The Refile Promise, a band under the packages. */}
        <div className="mx-auto mt-12 max-w-2xl">
          <RefilePromise />
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
    </>
  )
}
