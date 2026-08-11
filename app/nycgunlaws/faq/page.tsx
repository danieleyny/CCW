import Link from "next/link"
import { LAW_TOPICS } from "@/content/nyc-gun-laws"
import { breadcrumbs, faqNode, lawsGraph, lawsMetadata, lawsUrl, local } from "@/lib/gun-laws-site"
import { Faqs, Handoff, JsonLd, PageHero, Rule, styles } from "../components"

export const metadata = lawsMetadata({
  title: "New York City Gun Law — Questions and Answers",
  description:
    "Direct answers to the questions people actually ask about New York City firearm law, each linked to the entry and the primary source behind it.",
  path: "/faq",
})

export default function FaqPage() {
  const all = LAW_TOPICS.flatMap((t) => t.faqs.map((f) => ({ ...f, slug: t.slug, label: t.label })))

  const groups = LAW_TOPICS.filter((t) => t.faqs.length > 0)

  return (
    <>
      <JsonLd
        data={lawsGraph([
          breadcrumbs([
            { name: "NYC Gun Laws", path: "" },
            { name: "Questions", path: "/faq" },
          ]),
          faqNode(lawsUrl("/faq"), all.map(({ q, a }) => ({ q, a }))),
        ])}
      />

      <PageHero
        crumbs={[
          { name: "NYC Gun Laws", path: "" },
          { name: "Questions", path: "/faq" },
        ]}
        title="Questions and answers"
        meta={[`${all.length} answers`, "Every answer cites its entry"]}
      />

      <section className={styles.section}>
        <div className={styles.innerNarrow}>
          <p className={styles.sectionIntro} style={{ marginTop: 0, marginBottom: 20 }}>
            These are the questions that bring people here, answered directly. Each group links to
            the entry where the underlying statute is set out with its primary source.
          </p>

          {groups.map((t) => (
            <div key={t.slug} style={{ marginTop: 48 }}>
              <div className={styles.groupHead}>
                <h3>{t.label}</h3>
                <p>
                  <Link
                    href={local(`/laws/${t.slug}`)}
                    style={{ color: "var(--gl-ox)", textDecoration: "underline", textUnderlineOffset: 3 }}
                  >
                    {t.eyebrow} →
                  </Link>
                </p>
              </div>
              <Faqs faqs={t.faqs} />
            </div>
          ))}
        </div>
      </section>

      <section className={`${styles.sectionTight} ${styles.sectionAlt}`}>
        <div className={styles.innerNarrow}>
          <Rule>Not answered here</Rule>
          <p className={styles.sectionIntro}>
            Questions about your own history — a specific arrest, a sealed matter, a prior denial,
            an out-of-state conviction — are legal advice, and this site does not give it. Those
            belong with a New York–licensed attorney. Questions about the application process
            itself are covered on{" "}
            <Link
              href={local("/getting-licensed")}
              style={{ color: "var(--gl-ox)", textDecoration: "underline", textUnderlineOffset: 3 }}
            >
              getting licensed
            </Link>
            .
          </p>
        </div>
      </section>

      <Handoff />
    </>
  )
}
