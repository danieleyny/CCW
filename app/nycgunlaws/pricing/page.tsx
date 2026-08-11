import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { getPublicFees, getPublicPackages } from "@/lib/public-data"
import { breadcrumbs, lawsGraph, lawsMetadata, local, mainSiteUrl } from "@/lib/gun-laws-site"
import { Handoff, JsonLd, PageHero, Rule, styles } from "../components"

export const metadata = lawsMetadata({
  title: "Application Support Pricing",
  description:
    "Service pricing for New York City handgun licence application support, synchronized with our main website. Government fees are separate and paid directly to the agencies that charge them.",
  path: "/pricing",
})

/** Feature lists per package key — the copy layer only; prices come from the database. */
const FEATURES: Record<string, string[]> = {
  self_guided: [
    "Private client workspace",
    "Personalized document checklist",
    "Character-reference invitations with tracking",
    "Deadline and expiry reminders",
    "Email support",
  ],
  full_concierge: [
    "Everything in Self-Guided",
    "Training coordination and scheduling",
    "Document preparation support",
    "Digital signing and notarization coordination",
    "Interview preparation",
    "Priority concierge support",
  ],
  non_resident: [
    "Out-of-state applicant track",
    "Prior-jurisdiction background forms",
    "Out-of-area coordination",
    "Document preparation support",
  ],
  renewal: [
    "Renewal checklist",
    "Document refresh and re-verification",
    "Training recency check",
    "Resubmission support",
  ],
}

export default async function PricingPage() {
  const [packages, fees] = await Promise.all([getPublicPackages(), getPublicFees()])

  return (
    <>
      <JsonLd
        data={lawsGraph([
          breadcrumbs([
            { name: "NYC Gun Laws", path: "" },
            { name: "Pricing", path: "/pricing" },
          ]),
        ])}
      />

      <PageHero
        crumbs={[
          { name: "NYC Gun Laws", path: "" },
          { name: "Pricing", path: "/pricing" },
        ]}
        title="Application support, priced plainly"
        meta={["Same pricing as our main website", "Government fees separate"]}
      />

      <section className={styles.section}>
        <div className={styles.inner}>
          <p className={styles.sectionIntro} style={{ marginTop: 0, marginBottom: 48 }}>
            This site is a legal reference and is free to read. If you want help turning the
            requirements into a filed application, these are the support options — identical to
            those on our main website, because they are read from the same system. Choosing one
            takes you there to create your secure workspace.
          </p>

          <div className={styles.priceGrid}>
            {packages.map((p) => (
              <article
                key={p.key}
                className={`${styles.priceCard} ${p.featured ? styles.priceFeatured : ""}`}
              >
                <div className={styles.priceTag}>{p.featured ? "Most selected" : "Support option"}</div>
                <h3>{p.name}</h3>
                <div className={styles.priceAmount}>{p.priceLabel}</div>
                <p className={styles.priceBlurb}>{p.blurb}</p>
                <ul className={styles.priceFeatures}>
                  {(FEATURES[p.key] ?? []).map((f) => (
                    <li key={f}>{f}</li>
                  ))}
                </ul>
                <a
                  className={styles.ctaGhost}
                  href={mainSiteUrl(`/portal/enroll?package=${p.key}`, "pricing")}
                >
                  {p.priceCents > 0 ? "Choose this option" : "Discuss your case"}{" "}
                  <ArrowUpRight size={14} />
                </a>
              </article>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.innerNarrow}>
          <Rule>What is not a service fee</Rule>
          <h2 className={styles.sectionTitle}>
            Government charges go to the <em>government.</em>
          </h2>
          <p className={styles.sectionIntro}>
            The NYPD application fee is currently {fees.applicationFee} and the New York State
            fingerprint fee is {fees.fingerprintFee}. Both are paid directly to the agencies that
            charge them, both are non-refundable, and neither is collected by any preparation
            service. Training is billed by your instructor, and notarization by the notary.
            Government fees and rules change without notice — the amounts above are read live from
            our fee table rather than typed into this page.
          </p>
          <p className={styles.sectionIntro}>
            The New York City application fee is set by the City Council in Administrative Code
            §10-131(a) for a three-year licence period.{" "}
            <Link
              href={local("/laws/renewal")}
              style={{ color: "var(--gl-ox)", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              More on terms and renewal →
            </Link>
          </p>
        </div>
      </section>

      <Handoff
        title="Read the law free."
        emphasis="Get help when you want it."
        body="Everything on this site stays free to read. Support is optional, priced the same as on our main website, and starts with a two-minute eligibility check."
      />
    </>
  )
}
