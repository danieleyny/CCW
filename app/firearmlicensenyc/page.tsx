import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { getPublicPackages } from "@/lib/public-data"
import { firearmMetadata, FIREARM_SITE } from "@/lib/firearm-license-site"
import { Handoff, local, styles } from "./components"

export const metadata = firearmMetadata({
  title: "NYC Firearm License Help | A Clear Application Path",
  description: "Understand the NYC firearm license process, requirements, costs, and timelines. Private application guidance for all five boroughs.",
})

const boroughs = [["01", "Manhattan", "manhattan"], ["02", "Brooklyn", "brooklyn"], ["03", "Queens", "queens"], ["04", "The Bronx", "bronx"], ["05", "Staten Island", "staten-island"]]

export default async function FirearmLicenseHome() {
  const packages = await getPublicPackages()
  const featured = packages.find((p) => p.featured)
  return (
    <>
      <section className={styles.hero}>
        <video className={styles.heroVideo} autoPlay muted loop playsInline preload="metadata" poster="/media/nyc-skyline-wide-poster.webp" aria-hidden><source src="/media/nyc-skyline-wide.webm" type="video/webm" /><source src="/media/nyc-skyline-wide.mp4" type="video/mp4" /></video>
        <div className={styles.heroScrim} /><div className={styles.heroGrid} />
        <div className={styles.heroInner}>
          <div className={styles.kicker}>New York City firearm licensing</div>
          <h1>A clearer route to your <em>NYC license.</em></h1>
          <p className={styles.heroLead}>One focused guide for the forms, records, training, references, fees, and deadlines that make a New York City firearm license application feel overwhelming.</p>
          <div className={styles.heroActions}><a className={styles.primaryCta} href={`${FIREARM_SITE.mainSite}/eligibility`}>Check your eligibility <ArrowUpRight size={16} /></a><Link className={styles.secondaryCta} href={local("/process")}>See the full process <ArrowRight size={16} /></Link></div>
        </div>
        <div className={styles.heroMeta}><div><b>5</b>Boroughs covered</div><div><b>1</b>Organized case</div>{featured && <div><b>{featured.priceLabel}</b>Featured support</div>}</div>
      </section>
      <div className={styles.proof}><div className={styles.proofInner}><div className={styles.proofItem}><strong>Full visibility</strong>Know what is required before you begin.</div><div className={styles.proofItem}><strong>One organized record</strong>Documents and dates tracked in one place.</div><div className={styles.proofItem}><strong>Applicant controlled</strong>You review and submit your own application.</div></div></div>

      <section className={`${styles.section} ${styles.sectionWhite}`}><div className={styles.inner}>
        <div className={styles.sectionHead}><div className={styles.eyebrow}>The route forward</div><div><h2 className={styles.sectionTitle}>Complex process.<br />Calm execution.</h2><p className={styles.sectionIntro}>The best application experience is not about shortcuts. It is about seeing the whole path early, sequencing the work correctly, and keeping every requirement visible.</p></div></div>
        <div className={styles.pathGrid}><div className={styles.pathCard} data-step="1"><span className={styles.pathNum}>PHASE 01</span><h3>Understand your path</h3><p>Start with license type, residence, history, and the facts that shape your document list.</p></div><div className={styles.pathCard} data-step="2"><span className={styles.pathNum}>PHASE 02</span><h3>Build the record</h3><p>Coordinate training, references, household affidavits, identity records, and disclosures.</p></div><div className={styles.pathCard} data-step="3"><span className={styles.pathNum}>PHASE 03</span><h3>Review and submit</h3><p>Check your application for completeness, submit it yourself, and stay ready for follow-up.</p></div></div>
      </div></section>

      <section className={`${styles.section} ${styles.sectionNavy}`}><div className={styles.inner}>
        <div className={styles.sectionHead}><div className={styles.eyebrow}>What applicants manage</div><div><h2 className={styles.sectionTitle}>The application is more than a form.</h2><p className={styles.sectionIntro}>A strong process coordinates multiple workstreams without losing track of timing or candor.</p></div></div>
        <div className={styles.ledger}><div className={styles.ledgerRow}><span className={styles.ledgerNum}>01 / 05</span><h3>Eligibility and license type</h3><p>Clarify whether you are pursuing concealed carry, premises, renewal, retired law enforcement, or a special-carry path.</p></div><div className={styles.ledgerRow}><span className={styles.ledgerNum}>02 / 05</span><h3>Training</h3><p>Plan the required course early enough to avoid bottlenecks while keeping certificate timing in view.</p></div><div className={styles.ledgerRow}><span className={styles.ledgerNum}>03 / 05</span><h3>Supporting records</h3><p>Collect identity, residence, household, employment, and character-reference documents that apply to your case.</p></div><div className={styles.ledgerRow}><span className={styles.ledgerNum}>04 / 05</span><h3>Complete disclosure</h3><p>Address history candidly. Sealed or dismissed matters may still need disclosure; case-specific legal questions belong with a New York attorney.</p></div><div className={styles.ledgerRow}><span className={styles.ledgerNum}>05 / 05</span><h3>Submission and follow-up</h3><p>Submit your own application and remain organized for fingerprinting, interview, supplemental requests, and renewal.</p></div></div>
      </div></section>

      <section className={styles.section}><div className={styles.inner}><div className={styles.sectionHead}><div className={styles.eyebrow}>Local intent, citywide knowledge</div><div><h2 className={styles.sectionTitle}>Built for every borough.</h2><p className={styles.sectionIntro}>The deciding authority is citywide, but applicants search locally. Our borough guides connect neighborhood intent to the same consistent NYC process.</p></div></div><div className={styles.boroughGrid}>{boroughs.map(([num, name, slug]) => <Link key={slug} className={styles.borough} href={local(`/boroughs/${slug}`)}><span>{num} / NYC</span><h3>{name} <ArrowUpRight size={17} /></h3></Link>)}</div></div></section>

      <section className={`${styles.section} ${styles.sectionWhite}`}><div className={styles.inner}><div className={styles.sectionHead}><div className={styles.eyebrow}>Straight answers</div><div><h2 className={styles.sectionTitle}>No invented certainty.</h2><p className={styles.sectionIntro}>No private service can control an NYPD decision or timing. The real value is disciplined preparation, transparent pricing, and a process that stays organized.</p><div className={styles.heroActions}><Link className={styles.secondaryCta} href={local("/pricing")}>Compare pricing <ArrowRight size={15} /></Link><Link className={styles.secondaryCta} href={local("/faq")}>Read common questions <ArrowRight size={15} /></Link></div></div></div></div></section>
      <Handoff />
    </>
  )
}
