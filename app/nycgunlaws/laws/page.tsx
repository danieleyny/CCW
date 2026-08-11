import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { LAW_SECTIONS, LAW_TOPICS, getTopic } from "@/content/nyc-gun-laws"
import { breadcrumbs, lawsGraph, lawsMetadata, lawsUrl, local } from "@/lib/gun-laws-site"
import { Handoff, JsonLd, PageHero, Rule, styles } from "../components"

export const metadata = lawsMetadata({
  title: "The New York City Firearm Law Library",
  description:
    "Fourteen sourced entries covering carrying, licensing, ownership, penalties and special cases under the New York Penal Law, the Rules of the City of New York, and the NYC Administrative Code.",
  path: "/laws",
})

export default function LawsIndex() {
  return (
    <>
      <JsonLd
        data={lawsGraph([
          breadcrumbs([
            { name: "NYC Gun Laws", path: "" },
            { name: "The law", path: "/laws" },
          ]),
          {
            "@type": "CollectionPage",
            "@id": `${lawsUrl("/laws")}#webpage`,
            url: lawsUrl("/laws"),
            name: "The New York City Firearm Law Library",
            isPartOf: { "@id": `${lawsUrl()}/#website` },
            hasPart: LAW_TOPICS.map((t) => ({
              "@type": "Article",
              headline: t.title,
              url: local(`/laws/${t.slug}`),
              abstract: t.answer,
            })),
          },
        ])}
      />

      <PageHero
        crumbs={[
          { name: "NYC Gun Laws", path: "" },
          { name: "The law", path: "/laws" },
        ]}
        title="The firearm law library"
        meta={[`${LAW_TOPICS.length} entries`, "Cited to primary sources", "Litigation status noted"]}
      />

      <section className={styles.section}>
        <div className={styles.inner}>
          <p className={styles.sectionIntro} style={{ marginTop: 0, marginBottom: 56 }}>
            Each entry opens with a short answer written to stand on its own, then works through
            the statute in sequence. Claims appear in bordered blocks with the citation and a link
            to the primary source underneath. Where a provision is enjoined, contested, or
            unsettled, that is stated on the page rather than buried.
          </p>

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
                      <p>{t.answer.split(". ").slice(0, 2).join(". ")}.</p>
                      <span className={styles.cardMore}>
                        Read the entry <ArrowRight size={13} />
                      </span>
                    </Link>
                  )
                })}
              </div>
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.sectionTight} ${styles.sectionAlt}`}>
        <div className={styles.innerNarrow}>
          <Rule>A word on scope</Rule>
          <p className={styles.sectionIntro}>
            This library covers New York State law as it applies in New York City, plus the City&apos;s
            own rules. It does not cover federal prosecutions, hunting regulation, dealer
            licensing, or the law of self-defense. It is legal information, not legal advice — for
            your own situation, speak with a New York–licensed attorney.
          </p>
        </div>
      </section>

      <Handoff />
    </>
  )
}
