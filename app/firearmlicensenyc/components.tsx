import Link from "next/link"
import { ArrowUpRight } from "lucide-react"
import { FIREARM_SITE } from "@/lib/firearm-license-site"
import styles from "./site.module.css"

const local = (path = "") => `${FIREARM_SITE.origin}${path}`

export function SiteHeader() {
  return (
    <>
      <div className={styles.notice}>Independent application guidance · Serving all five boroughs</div>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main navigation">
          <Link className={styles.brand} href={local()}>
            <span className={styles.brandMark}>NYC</span>
            <span className={styles.brandText}>Firearm License NYC<small>A clearer route to applying</small></span>
          </Link>
          <div className={styles.navLinks}>
            <Link href={local("/process")}>The process</Link>
            <Link href={local("/requirements")}>Requirements</Link>
            <Link href={local("/pricing")}>Pricing</Link>
            <Link href={local("/faq")}>FAQ</Link>
          </div>
          <a className={styles.navCta} href={`${FIREARM_SITE.mainSite}/eligibility`}>
            Check eligibility <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
    </>
  )
}

export function SiteFooter() {
  return (
    <footer className={styles.footer}>
      <div className={styles.footerInner}>
        <div className={styles.footerTop}>
          <div>
            <div className={styles.footerBrand}>Firearm License NYC</div>
            <p className={styles.footerText}>A focused guide to the NYC firearm license process, supported by the case-management team at our main website.</p>
          </div>
          <div className={styles.footerCol}><strong>Explore</strong><Link href={local("/process")}>Process</Link><Link href={local("/requirements")}>Requirements</Link><Link href={local("/pricing")}>Pricing</Link><Link href={local("/faq")}>FAQ</Link></div>
          <div className={styles.footerCol}><strong>Boroughs</strong><Link href={local("/boroughs/manhattan")}>Manhattan</Link><Link href={local("/boroughs/brooklyn")}>Brooklyn</Link><Link href={local("/boroughs/queens")}>Queens</Link><Link href={local("/boroughs/bronx")}>The Bronx</Link><Link href={local("/boroughs/staten-island")}>Staten Island</Link></div>
          <div className={styles.footerCol}><strong>Continue</strong><a href={FIREARM_SITE.mainSite}>Visit our main website</a><a href={`tel:+19293525961`}>{FIREARM_SITE.phone}</a><a href={`mailto:${FIREARM_SITE.email}`}>{FIREARM_SITE.email}</a></div>
        </div>
        <div className={styles.footerBottom}>
          <span>© {new Date().getFullYear()} Firearm License NYC</span>
          <span>Private application-preparation and case-management information. Not a law firm, government agency, or NYPD affiliate. We cannot represent applicants, influence timing, or promise outcomes. Applicants submit their own applications.</span>
        </div>
      </div>
    </footer>
  )
}

export function PageHero({ eyebrow, title, lead }: { eyebrow: string; title: string; lead: string }) {
  return <section className={styles.pageHero}><div className={styles.pageHeroInner}><div className={styles.kicker}>{eyebrow}</div><h1 className={styles.pageTitle}>{title}</h1><p className={styles.pageLead}>{lead}</p></div></section>
}

export function Handoff() {
  return <section className={styles.handoff}><div className={styles.handoffInner}><h2>Ready to turn the checklist into a case?</h2><div><p>Continue to our main website to check eligibility, compare support options, and begin your application workspace.</p><a className={styles.primaryCta} href={`${FIREARM_SITE.mainSite}/eligibility`}>Continue to our main website <ArrowUpRight size={16} /></a></div></div></section>
}

export function AsideCard() {
  return <aside><div className={styles.asideCard}><div className={styles.eyebrow}>Next step</div><h3>Start with eligibility.</h3><p>A short check on our main website helps you understand the likely path before you collect documents or schedule training.</p><a className={styles.primaryCta} href={`${FIREARM_SITE.mainSite}/eligibility`}>Check eligibility <ArrowUpRight size={15} /></a></div></aside>
}

export { styles, local }
