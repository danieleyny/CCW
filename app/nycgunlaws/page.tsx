import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { LAW_SECTIONS, LAW_TOPICS, getTopic, LAWS_VERIFIED } from "@/content/nyc-gun-laws"
import { LAWS_SITE, lawsGraph, lawsMetadata, local } from "@/lib/gun-laws-site"
import { Handoff, JsonLd, Rule, styles } from "./components"

export const metadata = lawsMetadata({
  title: "NYC Gun Laws — New York City Firearm Law, in Plain English",
  description:
    "Where you cannot carry, who qualifies for a license, what the penalties are, and what the courts have changed. Every claim cited to the New York Penal Law, the Rules of the City of New York, or a published opinion.",
})

const FEATURED = ["sensitive-locations", "private-property", "penalties"]

const COURT_CHANGES = [
  {
    date: "Oct 2024",
    case: "Antonyuk v. James",
    court: "2d Cir.",
    held: "Vacated the injunctions against the sensitive-location list, the good-moral-character standard, the four-reference requirement, the in-person interview, and the training requirement. Certiorari denied April 2025.",
    effect: "In effect",
  },
  {
    date: "Sep 2025",
    case: "Frey v. City of New York",
    court: "2d Cir.",
    held: "Upheld the Times Square provision and the public transit and subway provision of the sensitive-location statute.",
    effect: "In effect",
  },
  {
    date: "Mar 2026",
    case: "Antonyuk v. James",
    court: "N.D.N.Y.",
    held: "Consent injunction against the social media disclosure requirement; New York agreed the State Police application form would not include social media language.",
    effect: "Enjoined",
  },
  {
    date: "May 2026",
    case: "Christian v. James",
    court: "2d Cir.",
    held: "Rejected the facial challenge to the public parks provision, and affirmed a permanent injunction against the private-property rule as applied to property open to the public.",
    effect: "Split",
  },
]

export default function LawsHome() {
  const featured = FEATURED.map((s) => getTopic(s)!).filter(Boolean)
  const reviewedOn = new Date(LAWS_VERIFIED).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })

  return (
    <>
      <JsonLd
        data={lawsGraph([
          {
            "@type": "CollectionPage",
            "@id": `${LAWS_SITE.origin}/#webpage`,
            url: LAWS_SITE.origin,
            name: "NYC Gun Laws",
            isPartOf: { "@id": `${LAWS_SITE.origin}/#website` },
            about: { "@type": "Legislation", name: "New York Penal Law article 265 and §400.00" },
            description:
              "A plain-English, citation-backed reference to New York City firearm law.",
            hasPart: LAW_TOPICS.map((t) => ({
              "@type": "Article",
              headline: t.title,
              url: local(`/laws/${t.slug}`),
              abstract: t.answer,
            })),
          },
        ])}
      />

      <section className={styles.hero}>
        <div className={styles.heroInner}>
          <Rule>New York City · Firearm law reference · Revised {reviewedOn}</Rule>
          <h1 className={styles.heroTitle}>
            The law, <em>before</em> the paperwork.
          </h1>
          <div className={styles.heroBody}>
            <div>
              <p className={styles.heroLead}>
                New York City has some of the most demanding firearm law in the country, and most
                of what is published about it online is out of date, miscited, or describing an
                injunction that no longer exists. This is a plain-English reference to what the law
                actually says — <strong>every claim linked to its primary source</strong>, with the
                litigation that changed it noted where it matters.
              </p>
              <p className={styles.heroNote}>
                Written and maintained by the licensing team behind {LAWS_SITE.mainSiteLabel}. We
                assert nothing we cannot cite, and we flag what is contested rather than smoothing
                it over.
              </p>
              <div className={styles.heroActions}>
                <Link className={styles.cta} href={local("/laws/sensitive-locations")}>
                  Where you cannot carry <ArrowRight size={15} />
                </Link>
                <Link className={styles.ctaGhost} href={local("/laws")}>
                  Browse the full library <ArrowRight size={15} />
                </Link>
              </div>
            </div>

            <div className={styles.contents}>
              <div className={styles.contentsHead}>
                <b>Contents</b>
                <span>{LAW_TOPICS.length} entries</span>
              </div>
              <div className={styles.contentsList}>
                {LAW_TOPICS.slice(0, 9).map((t, i) => (
                  <Link className={styles.contentsItem} key={t.slug} href={local(`/laws/${t.slug}`)}>
                    <em>{String(i + 1).padStart(2, "0")}</em>
                    <b>{t.title}</b>
                    <i>{t.eyebrow.split(" · ")[0]}</i>
                  </Link>
                ))}
                <Link className={styles.contentsItem} href={local("/laws")}>
                  <em>→</em>
                  <b>All {LAW_TOPICS.length} entries</b>
                  <i />
                </Link>
              </div>
            </div>
          </div>
        </div>
      </section>

      <section className={`${styles.sectionTight} ${styles.sectionInk}`}>
        <div className={styles.inner}>
          <div className={styles.statRow}>
            <div className={styles.stat}>
              <b>20</b>
              <span>Categories of sensitive location</span>
            </div>
            <div className={styles.stat}>
              <b>18</b>
              <span>Hours of required training</span>
            </div>
            <div className={styles.stat}>
              <b>3½ yrs</b>
              <span>Mandatory minimum, loaded &amp; unlicensed</span>
            </div>
            <div className={styles.stat}>
              <b>0</b>
              <span>Out-of-state permits recognized</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <Rule>Start here</Rule>
            <h2 className={styles.sectionTitle}>
              Three things that put <em>licensed</em> New Yorkers in handcuffs.
            </h2>
            <p className={styles.sectionIntro}>
              A license answers one question — whether you may carry at all. It does not answer
              where, or under what conditions. These are the rules that catch people who did
              everything right on the application.
            </p>
          </div>
          <div className={styles.cardGrid}>
            {featured.map((t) => (
              <Link className={styles.card} key={t.slug} href={local(`/laws/${t.slug}`)}>
                <span className={styles.cardCite}>{t.eyebrow}</span>
                <h4>{t.title}</h4>
                <p>{t.answer.split(". ").slice(0, 2).join(". ")}.</p>
                <span className={styles.cardMore}>
                  Read the entry <ArrowRight size={13} />
                </span>
              </Link>
            ))}
            <Link className={styles.card} href={local("/getting-licensed")}>
              <span className={styles.cardCite}>The practical path</span>
              <h4>What getting licensed actually involves</h4>
              <p>
                The law tells you what is required. This tells you what the process looks like from
                the inside — sequence, timing, and where applications stall.
              </p>
              <span className={styles.cardMore}>
                Read the guide <ArrowRight size={13} />
              </span>
            </Link>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <Rule>The library</Rule>
            <h2 className={styles.sectionTitle}>
              Fourteen entries. <em>Every one</em> sourced.
            </h2>
            <p className={styles.sectionIntro}>
              Organized the way the law actually applies to you — carrying, getting licensed,
              owning, and the categories that follow different rules.
            </p>
          </div>
          {LAW_SECTIONS.map((group) => (
            <div key={group.title}>
              <div className={styles.groupHead}>
                <h3>{group.title}</h3>
                <p>{group.blurb}</p>
              </div>
              <div className={styles.cardGrid}>
                {group.slugs.map((slug) => {
                  const t = getTopic(slug)
                  if (!t) return null
                  return (
                    <Link className={styles.card} key={slug} href={local(`/laws/${slug}`)}>
                      <span className={styles.cardCite}>{t.eyebrow}</span>
                      <h4>{t.title}</h4>
                      <p>{t.answer.split(". ")[0]}.</p>
                      <span className={styles.cardMore}>
                        Read <ArrowRight size={13} />
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionInk}`}>
        <div className={styles.inner}>
          <div className={styles.sectionHead}>
            <Rule>Since Bruen</Rule>
            <h2 className={styles.sectionTitle}>
              The courts have been rewriting this <em>continuously.</em>
            </h2>
            <p className={styles.sectionIntro}>
              Most published guidance on New York firearm law describes injunctions that have since
              been vacated, or misses ones entered last year. Here is what actually moved, and
              where it stands today.
            </p>
          </div>
          <div className={styles.tableWrap}>
            <table className={styles.table}>
              <thead>
                <tr>
                  <th>Decided</th>
                  <th>Case</th>
                  <th>What it held</th>
                  <th>Status</th>
                </tr>
              </thead>
              <tbody>
                {COURT_CHANGES.map((c) => (
                  <tr key={`${c.date}-${c.case}`}>
                    <td>{c.date}</td>
                    <td>
                      {c.case}
                      <br />
                      <span style={{ opacity: 0.6 }}>{c.court}</span>
                    </td>
                    <td>{c.held}</td>
                    <td>{c.effect}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.innerNarrow}>
          <blockquote className={styles.pullquote}>
            We publish nothing we cannot cite. Where the law is contested, we say so on the page
            rather than picking whichever reading reads better — because a firearm-law page that is
            confidently wrong is worse than one that is carefully uncertain.
            <footer>
              <Link href={local("/sources")}>How we source this →</Link>
            </footer>
          </blockquote>
        </div>
      </section>

      <Handoff />
    </>
  )
}
