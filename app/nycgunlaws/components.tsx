import Link from "next/link"
import { ArrowUpRight, ArrowRight } from "lucide-react"
import { LAWS_SITE, local, mainSiteUrl } from "@/lib/gun-laws-site"
import type { LawClaim, LawSection } from "@/content/nyc-gun-laws"
import styles from "./site.module.css"

export { styles }

/** JSON-LD, rendered once per page. */
export function JsonLd({ data }: { data: unknown }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  )
}

export function Rule({ children }: { children: React.ReactNode }) {
  return <div className={styles.rule}>{children}</div>
}

export function SiteHeader() {
  return (
    <>
      <div className={styles.masthead}>
        <div className={styles.mastheadInner}>
          <span>Independent legal reference</span>
          <span>Not a law firm · Not affiliated with the NYPD or the City of New York</span>
        </div>
      </div>
      <header className={styles.header}>
        <nav className={styles.nav} aria-label="Main">
          <Link className={styles.brand} href={local()}>
            <span className={styles.brandMark} aria-hidden>
              <b>NY</b>
              <i />
            </span>
            <span className={styles.brandText}>
              <strong>NYC Gun Laws</strong>
              <small>New York City firearm law</small>
            </span>
          </Link>
          <div className={styles.navLinks}>
            <Link href={local("/laws")}>The law</Link>
            <Link href={local("/laws/sensitive-locations")}>Where you can&apos;t carry</Link>
            <Link href={local("/getting-licensed")}>Getting licensed</Link>
            <Link href={local("/glossary")}>Glossary</Link>
            <Link href={local("/sources")}>Sources</Link>
          </div>
          <a className={styles.cta} href={mainSiteUrl("/eligibility", "header")}>
            Check eligibility <ArrowUpRight size={14} />
          </a>
        </nav>
      </header>
    </>
  )
}

export function SiteFooter() {
  const year = new Date().getFullYear()
  return (
    <>
      <div className={styles.disclaimer}>
        <div className={styles.disclaimerInner}>
          <b>This is legal information, not legal advice.</b> NYC Gun Laws is an independent
          publication. It is not a law firm, a government agency, or affiliated with the New York
          City Police Department or the City of New York, and reading it does not create an
          attorney–client relationship. Firearm law changes, and several provisions described here
          are the subject of active litigation. For advice about your own situation, consult a
          New York–licensed attorney.
        </div>
      </div>
      <footer className={styles.footer}>
        <div className={styles.footerInner}>
          <div className={styles.footerTop}>
            <div>
              <div className={styles.footerBrand}>NYC Gun Laws</div>
              <p className={styles.footerText}>
                A plain-English reference to New York City firearm law, written from primary
                sources and published by the licensing team behind {LAWS_SITE.mainSiteLabel}.
              </p>
            </div>
            <div className={styles.footerCol}>
              <strong>The law</strong>
              <Link href={local("/laws/sensitive-locations")}>Where you cannot carry</Link>
              <Link href={local("/laws/license-types")}>License types</Link>
              <Link href={local("/laws/eligibility")}>Who qualifies</Link>
              <Link href={local("/laws/penalties")}>Penalties</Link>
              <Link href={local("/laws")}>Full library</Link>
            </div>
            <div className={styles.footerCol}>
              <strong>Applying</strong>
              <Link href={local("/getting-licensed")}>How licensing works</Link>
              <Link href={local("/laws/training")}>Training requirement</Link>
              <Link href={local("/pricing")}>Pricing</Link>
              <Link href={local("/faq")}>Questions</Link>
            </div>
            <div className={styles.footerCol}>
              <strong>Continue</strong>
              <a href={mainSiteUrl("/", "footer")}>Visit our main website</a>
              <a href={LAWS_SITE.phoneHref}>{LAWS_SITE.phone}</a>
              <a href={`mailto:${LAWS_SITE.email}`}>{LAWS_SITE.email}</a>
              <Link href={local("/sources")}>How we source this</Link>
            </div>
          </div>
          <div className={styles.footerBottom}>
            <span>© {year} NYC Gun Laws</span>
            <span>
              Statutory text is quoted and paraphrased from the New York Penal Law, the Rules of
              the City of New York, and the New York City Administrative Code. Every claim on this
              site links to its primary source.
            </span>
          </div>
        </div>
      </footer>
    </>
  )
}

export function Handoff({
  title = "Reading the law is step one.",
  emphasis = "Applying is step two.",
  body = "Our main website turns everything on this page into a tracked application: a personalized document checklist, character-reference invitations, training coordination, and a case file that shows exactly what is outstanding.",
  cta = "Continue to our main website",
  href = "/eligibility",
}: {
  title?: string
  emphasis?: string
  body?: string
  cta?: string
  href?: string
} = {}) {
  return (
    <section className={styles.handoff}>
      <div className={styles.handoffInner}>
        <div>
          <Rule>Next step</Rule>
          <h2>
            {title} <em>{emphasis}</em>
          </h2>
        </div>
        <div>
          <p>{body}</p>
          <a className={styles.cta} href={mainSiteUrl(href, "handoff")}>
            {cta} <ArrowUpRight size={16} />
          </a>
        </div>
      </div>
    </section>
  )
}

export function RailCard({
  eyebrow = "Next step",
  title = "Find out where you stand.",
  body = "A short eligibility check on our main website tells you the likely path before you spend money on training or start collecting documents.",
  cta = "Check eligibility",
  href = "/eligibility",
}: {
  eyebrow?: string
  title?: string
  body?: string
  cta?: string
  href?: string
} = {}) {
  return (
    <div className={styles.railCard}>
      <Rule>{eyebrow}</Rule>
      <h4>{title}</h4>
      <p>{body}</p>
      <a className={styles.cta} href={mainSiteUrl(href, "rail")}>
        {cta} <ArrowUpRight size={15} />
      </a>
    </div>
  )
}

/** A single sourced legal claim — the atomic unit of this site. */
export function Claim({ claim }: { claim: LawClaim }) {
  return (
    <div className={styles.claim}>
      <p>{claim.text}</p>
      <div className={styles.claimFoot}>
        <span
          className={`${styles.chip} ${claim.status === "verified" ? styles.chipOk : styles.chipReview}`}
        >
          {claim.status === "verified" ? "Primary source" : "Contested / in review"}
        </span>
        <span>{claim.citation}</span>
        <a href={claim.href} target="_blank" rel="noopener noreferrer">
          Read the source
        </a>
      </div>
      {claim.note && (
        <div className={styles.claimNote}>
          <b>Note</b>
          {claim.note}
        </div>
      )}
    </div>
  )
}

export function Banner({ children }: { children: React.ReactNode }) {
  return <div className={styles.banner}>{children}</div>
}

/** Renders one section of a topic page from the content module. */
export function Section({ section, index }: { section: LawSection; index: number }) {
  return (
    <section>
      <h2>
        <span>{String(index + 1).padStart(2, "0")}</span>
        {section.heading}
      </h2>
      {section.body?.map((p, i) => (
        <p key={i}>{p}</p>
      ))}
      {section.claims?.map((c, i) => (
        <Claim key={i} claim={c} />
      ))}
      {section.list && (
        <dl className={styles.deflist}>
          {section.list.map((row) => (
            <div className={styles.defrow} key={row.term}>
              <dt>{row.term}</dt>
              <dd>{row.detail}</dd>
            </div>
          ))}
        </dl>
      )}
      {section.table && (
        <div className={styles.tableWrap}>
          <table className={styles.table}>
            <thead>
              <tr>
                {section.table.head.map((h) => (
                  <th key={h}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {section.table.rows.map((r, i) => (
                <tr key={i}>
                  {r.map((cell, j) => (
                    <td key={j}>{cell}</td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </section>
  )
}

export function Faqs({ faqs }: { faqs: { q: string; a: string }[] }) {
  return (
    <div className={styles.faq}>
      {faqs.map((f) => (
        <details key={f.q}>
          <summary>{f.q}</summary>
          <p>{f.a}</p>
        </details>
      ))}
    </div>
  )
}

export function PageHero({
  crumbs,
  title,
  meta,
}: {
  crumbs: { name: string; path: string }[]
  title: string
  meta?: string[]
}) {
  return (
    <section className={styles.pageHero}>
      <div className={styles.inner}>
        <nav className={styles.crumbs} aria-label="Breadcrumb">
          {crumbs.map((c, i) => (
            <span key={c.path}>
              {i > 0 && <span aria-hidden>&nbsp;/&nbsp;</span>}
              {i === crumbs.length - 1 ? (
                <span>{c.name}</span>
              ) : (
                <Link href={local(c.path)}>{c.name}</Link>
              )}
            </span>
          ))}
        </nav>
        <h1 className={styles.pageTitle}>{title}</h1>
        {meta && (
          <div className={styles.pageMeta}>
            {meta.map((m) => (
              <span key={m}>{m}</span>
            ))}
          </div>
        )}
      </div>
    </section>
  )
}

export function Answer({ text }: { text: string }) {
  return (
    <div className={styles.answer}>
      <div className={styles.answerLabel}>The short answer</div>
      <p>{text}</p>
    </div>
  )
}

export function RelatedTopics({
  items,
}: {
  items: { slug: string; label: string; title: string; answer: string }[]
}) {
  if (!items.length) return null
  return (
    <div className={styles.relatedGrid}>
      {items.map((t) => (
        <Link className={styles.relatedItem} key={t.slug} href={local(`/laws/${t.slug}`)}>
          <span>{t.label}</span>
          <b>{t.title}</b>
          <p>{t.answer.split(". ")[0]}.</p>
        </Link>
      ))}
    </div>
  )
}

export { ArrowRight, ArrowUpRight, Link, local, mainSiteUrl }
