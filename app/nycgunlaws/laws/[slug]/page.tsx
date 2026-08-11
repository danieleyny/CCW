import { notFound } from "next/navigation"
import Link from "next/link"
import { LAW_TOPICS, getTopic } from "@/content/nyc-gun-laws"
import { breadcrumbs, faqNode, lawsGraph, lawsMetadata, lawsUrl, local } from "@/lib/gun-laws-site"
import {
  Answer,
  Banner,
  Faqs,
  Handoff,
  JsonLd,
  PageHero,
  RailCard,
  RelatedTopics,
  Rule,
  Section,
  styles,
} from "../../components"

export function generateStaticParams() {
  return LAW_TOPICS.map((t) => ({ slug: t.slug }))
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const topic = getTopic(slug)
  if (!topic) return {}
  return lawsMetadata({
    title: topic.metaTitle,
    description: topic.metaDescription,
    path: `/laws/${topic.slug}`,
    type: "article",
    modifiedTime: topic.updated,
  })
}

export default async function LawTopicPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params
  const topic = getTopic(slug)
  if (!topic) notFound()

  const url = lawsUrl(`/laws/${topic.slug}`)
  const related = topic.related.map((s) => getTopic(s)).filter(Boolean) as NonNullable<
    ReturnType<typeof getTopic>
  >[]
  const updated = new Date(topic.updated).toLocaleDateString("en-US", {
    month: "long",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  })

  return (
    <>
      <JsonLd
        data={lawsGraph([
          breadcrumbs([
            { name: "NYC Gun Laws", path: "" },
            { name: "The law", path: "/laws" },
            { name: topic.label, path: `/laws/${topic.slug}` },
          ]),
          {
            "@type": "Article",
            "@id": `${url}#article`,
            headline: topic.title,
            description: topic.metaDescription,
            abstract: topic.answer,
            url,
            inLanguage: "en-US",
            dateModified: topic.updated,
            isPartOf: { "@id": `${lawsUrl()}/#website` },
            publisher: { "@id": `${lawsUrl()}/#publisher` },
            about: topic.authorities.map((a) => ({
              "@type": "Legislation",
              name: a.citation,
              url: a.href,
            })),
            citation: topic.authorities.map((a) => a.href),
          },
          faqNode(url, topic.faqs),
        ])}
      />

      <PageHero
        crumbs={[
          { name: "NYC Gun Laws", path: "" },
          { name: "The law", path: "/laws" },
          { name: topic.label, path: `/laws/${topic.slug}` },
        ]}
        title={topic.title}
        meta={[topic.eyebrow, `Reviewed ${updated}`]}
      />

      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.layout}>
            <div>
              {topic.contested && (
                <Banner>
                  <div>
                    <b>Parts of this area are contested.</b>
                    One or more provisions on this page are enjoined, in active litigation, or
                    unsettled. Those claims are marked, and the current status is stated where it
                    appears. Verify before relying on it.
                  </div>
                </Banner>
              )}

              <Answer text={topic.answer} />

              <div className={styles.prose}>
                {topic.sections.map((s, i) => (
                  <Section key={s.heading} section={s} index={i} />
                ))}
              </div>

              {topic.faqs.length > 0 && (
                <div style={{ marginTop: 56 }}>
                  <Rule>Common questions</Rule>
                  <div style={{ marginTop: 26 }}>
                    <Faqs faqs={topic.faqs} />
                  </div>
                </div>
              )}
            </div>

            <aside className={styles.rail}>
              <div className={styles.railBox}>
                <b>Authorities on this page</b>
                <div className={styles.railBody}>
                  {topic.authorities.map((a) => (
                    <a key={a.href + a.citation} href={a.href} target="_blank" rel="noopener noreferrer">
                      <span className={styles.railCite}>{a.citation}</span>
                    </a>
                  ))}
                </div>
              </div>

              <div className={styles.railBox}>
                <b>Related entries</b>
                <div className={styles.railBody}>
                  {related.map((r) => (
                    <Link key={r.slug} href={local(`/laws/${r.slug}`)}>
                      {r.title}
                    </Link>
                  ))}
                  <Link href={local("/laws")}>All entries →</Link>
                </div>
              </div>

              <RailCard />
            </aside>
          </div>
        </div>
      </section>

      {related.length > 0 && (
        <section className={`${styles.sectionTight} ${styles.sectionAlt}`}>
          <div className={styles.inner}>
            <Rule>Keep reading</Rule>
            <div style={{ marginTop: 28 }}>
              <RelatedTopics
                items={related.map((r) => ({
                  slug: r.slug,
                  label: r.label,
                  title: r.title,
                  answer: r.answer,
                }))}
              />
            </div>
          </div>
        </section>
      )}

      <Handoff />
    </>
  )
}
