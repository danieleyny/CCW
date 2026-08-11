import Link from "next/link"
import {
  KNOWN_ERRORS,
  LAWS_VERIFIED,
  LAW_TOPICS,
  allClaims,
  claimsNeedingReview,
} from "@/content/nyc-gun-laws"
import { breadcrumbs, lawsGraph, lawsMetadata, local } from "@/lib/gun-laws-site"
import { Handoff, JsonLd, PageHero, Rule, styles } from "../components"

export const metadata = lawsMetadata({
  title: "How We Source This",
  description:
    "Every legal claim on NYC Gun Laws is tied to a primary source, carries a review status, and is listed here. Including the citation errors we found circulating in published guidance.",
  path: "/sources",
})

export default function SourcesPage() {
  const claims = allClaims()
  const review = claimsNeedingReview()
  const verified = claims.length - review.length
  const authorities = Array.from(
    new Map(
      LAW_TOPICS.flatMap((t) => t.authorities).map((a) => [a.citation, a])
    ).values()
  ).sort((a, b) => a.citation.localeCompare(b.citation))

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
          breadcrumbs([
            { name: "NYC Gun Laws", path: "" },
            { name: "Sources", path: "/sources" },
          ]),
        ])}
      />

      <PageHero
        crumbs={[
          { name: "NYC Gun Laws", path: "" },
          { name: "Sources", path: "/sources" },
        ]}
        title="How we source this"
        meta={[`${claims.length} claims`, `Last reviewed ${reviewedOn}`]}
      />

      <section className={`${styles.sectionTight} ${styles.sectionInk}`}>
        <div className={styles.inner}>
          <div className={styles.statRow}>
            <div className={styles.stat}>
              <b>{claims.length}</b>
              <span>Sourced legal claims</span>
            </div>
            <div className={styles.stat}>
              <b>{verified}</b>
              <span>Read against primary text</span>
            </div>
            <div className={styles.stat}>
              <b>{review.length}</b>
              <span>Flagged contested or in review</span>
            </div>
            <div className={styles.stat}>
              <b>{authorities.length}</b>
              <span>Distinct authorities cited</span>
            </div>
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.innerNarrow}>
          <Rule>The rule</Rule>
          <h2 className={styles.sectionTitle}>
            No page may assert a legal claim we <em>cannot cite.</em>
          </h2>
          <p className={styles.sectionIntro}>
            This is enforced structurally, not by good intentions. Every claim on this site lives
            in a single content module with its citation, its primary-source link and a review
            status attached. Pages render from that module rather than from freehand prose, so a
            page physically cannot invent a fact, and correcting a claim once corrects it
            everywhere it appears.
          </p>
          <p className={styles.sectionIntro}>
            Secondary sources — advocacy organizations, commercial firearm sites, law-firm blogs —
            are used to locate a statute. They are never the citation. Where we found a secondary
            source to be wrong, we say so below rather than quietly routing around it.
          </p>

          <div style={{ marginTop: 52 }}>
            <Rule>What the statuses mean</Rule>
            <dl className={styles.deflist} style={{ marginTop: 26 }}>
              <div className={styles.defrow}>
                <dt>Primary source</dt>
                <dd>
                  The statutory or regulatory text was read directly against the authoritative
                  source — the legislature&apos;s site for the Penal Law, the City&apos;s code library for
                  the Rules of the City of New York and the Administrative Code, or the court&apos;s own
                  published opinion.
                </dd>
              </div>
              <div className={styles.defrow}>
                <dt>Contested / in review</dt>
                <dd>
                  The claim carries a citation but one of three things is true: the provision is
                  enjoined or in active litigation, published sources conflict on its scope, or the
                  text was read through a republication rather than the authoritative source. These
                  render with a visible note explaining exactly which, and they are the items on
                  our standing review list.
                </dd>
              </div>
            </dl>
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.innerNarrow}>
          <Rule>Corrections</Rule>
          <h2 className={styles.sectionTitle}>
            Citation errors we found <em>already published.</em>
          </h2>
          <p className={styles.sectionIntro}>
            These circulate widely enough that you are likely to encounter them elsewhere. Each was
            checked against the primary text.
          </p>
          <div style={{ marginTop: 36 }}>
            {KNOWN_ERRORS.map((e) => (
              <div className={styles.claim} key={e.error}>
                <p style={{ textDecoration: "line-through", opacity: 0.6 }}>{e.error}</p>
                <p style={{ marginTop: 12 }}>{e.truth}</p>
                <div className={styles.claimFoot}>
                  <span className={`${styles.chip} ${styles.chipReview}`}>Correction</span>
                  <span>Seen in: {e.seenIn}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.section}>
        <div className={styles.innerNarrow}>
          <Rule>Currently flagged</Rule>
          <h2 className={styles.sectionTitle}>
            {review.length} claims we have <em>not</em> closed.
          </h2>
          <p className={styles.sectionIntro}>
            Publishing these with a caveat is more useful than omitting them, and more honest than
            asserting them cleanly. Each appears on its page with the same note.
          </p>
          <div className={styles.sourceList} style={{ marginTop: 36 }}>
            {review.map(({ topic, claim }, i) => (
              <div className={styles.sourceRow} key={`${topic.slug}-${i}`}>
                <i>{String(i + 1).padStart(2, "0")}</i>
                <div>
                  <p style={{ fontWeight: 500 }}>{claim.citation}</p>
                  <p style={{ marginTop: 6, color: "var(--gl-muted)", fontSize: ".88rem" }}>
                    {claim.note ?? claim.text}
                  </p>
                </div>
                <Link href={local(`/laws/${topic.slug}`)}>{topic.title}</Link>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={`${styles.section} ${styles.sectionAlt}`}>
        <div className={styles.innerNarrow}>
          <Rule>Authorities</Rule>
          <h2 className={styles.sectionTitle}>Everything this site cites.</h2>
          <div className={styles.sourceList} style={{ marginTop: 36 }}>
            {authorities.map((a, i) => (
              <div className={styles.sourceRow} key={a.citation}>
                <i>{String(i + 1).padStart(2, "0")}</i>
                <p>{a.citation}</p>
                <a href={a.href} target="_blank" rel="noopener noreferrer">
                  {a.href.replace(/^https?:\/\//, "").slice(0, 46)}
                  {a.href.length > 54 ? "…" : ""}
                </a>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className={styles.sectionTight}>
        <div className={styles.innerNarrow}>
          <Rule>Found an error?</Rule>
          <p className={styles.sectionIntro}>
            Corrections are genuinely welcome, particularly from New York practitioners. Write to
            us and cite the provision — if you are right, the claim is corrected at the source and
            the fix propagates to every page that renders it.
          </p>
        </div>
      </section>

      <Handoff />
    </>
  )
}
