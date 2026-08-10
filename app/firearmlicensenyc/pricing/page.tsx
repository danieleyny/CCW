import { ArrowUpRight } from "lucide-react"
import { getPublicFees, getPublicPackages } from "@/lib/public-data"
import { firearmMetadata, FIREARM_SITE } from "@/lib/firearm-license-site"
import { Handoff, PageHero, styles } from "../components"

export const metadata = firearmMetadata({ title: "NYC Firearm License Help Pricing", description: "Compare current NYC firearm license application support pricing: Self-Guided, Full Concierge, Non-Resident, and Renewal options.", path: "/pricing" })

const features: Record<string, string[]> = {
  self_guided: ["Private client workspace", "Personalized document checklist", "Application guidance", "Email support"],
  full_concierge: ["Everything in Self-Guided", "Training coordination", "Document preparation support", "Interview preparation", "Priority concierge support"],
  non_resident: ["Special-carry track", "Out-of-area coordination", "Document preparation support"],
  renewal: ["Renewal checklist", "Document refresh", "Resubmission support"],
}

export default async function PricingPage() {
  const [packages, fees] = await Promise.all([getPublicPackages(), getPublicFees()])
  return <><PageHero eyebrow="Same pricing, clearer entry point" title="Choose how much support you want." lead="Pricing is synchronized with our main website. When you are ready to proceed, you will continue there to create your secure workspace." />
    <section className={`${styles.section} ${styles.sectionWhite}`}><div className={styles.inner}><div className={styles.priceGrid}>{packages.map((p) => <article key={p.key} className={`${styles.priceCard} ${p.featured ? styles.featured : ""}`}><div className={styles.priceTag}>{p.featured ? "Most selected" : "Support option"}</div><h3>{p.name}</h3><div className={styles.price}>{p.priceLabel}</div><p>{p.blurb}</p><ul className={styles.features}>{(features[p.key] ?? []).map((f) => <li key={f}>{f}</li>)}</ul><a className={styles.secondaryCta} href={`${FIREARM_SITE.mainSite}/portal/enroll?package=${p.key}`}>{p.priceCents > 0 ? "Choose this option" : "Discuss your case"} <ArrowUpRight size={14} /></a></article>)}</div><p className={styles.sectionIntro}>Service fees only. NYPD currently charges a separate {fees.applicationFee} application fee and {fees.fingerprintFee} fingerprint fee. Training and notarization are separate third-party costs. Government fees and rules can change.</p></div></section><Handoff /></>
}
