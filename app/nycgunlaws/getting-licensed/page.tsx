import Link from "next/link"
import { ArrowRight, ArrowUpRight } from "lucide-react"
import { getPublicFees } from "@/lib/public-data"
import { getTopic } from "@/content/nyc-gun-laws"
import { breadcrumbs, faqNode, lawsGraph, lawsMetadata, lawsUrl, local, mainSiteUrl, LAWS_SITE } from "@/lib/gun-laws-site"
import { Answer, Faqs, Handoff, JsonLd, PageHero, RailCard, Rule, styles } from "../components"

export const metadata = lawsMetadata({
  title: "How Getting a NYC Gun License Actually Works",
  description:
    "The legal requirements mapped onto the real sequence: eligibility, training timing, references, the interview, filing, and the six-month wait. Written for people who have read the law and want to know what happens next.",
  path: "/getting-licensed",
})

const PHASES = [
  {
    n: "01",
    title: "Establish where you stand",
    law: "Penal Law §400.00(1)",
    body: "Before anything else, work through the statutory disqualifiers. A felony or 'serious offense' conviction is permanent. The five-year bar on third-degree assault, misdemeanor DWI and third-degree menacing applies only to concealed carry. Involuntary commitment history, an outstanding warrant, a prior revocation, and a guardianship determination each have their own paragraph.",
    link: "eligibility",
    watch:
      "The single most common self-inflicted wound is non-disclosure. Sealed and dismissed arrests are disclosed. A twenty-year-old dismissal is rarely fatal; concealing one goes straight to good moral character.",
  },
  {
    n: "02",
    title: "Choose the license you actually need",
    law: "Penal Law §400.00(2)",
    body: "Premises-residence, premises-business, and unrestricted concealed carry are different licenses with different requirements. A premises license does not authorize carrying in public — it authorizes possession at one address, plus limited lawful transport. Applying for the wrong one is a costly detour.",
    link: "license-types",
    watch:
      "If you hold a carry license from another New York county, it is not valid in the five boroughs without a Special Carry License under 38 RCNY §5-23.",
  },
  {
    n: "03",
    title: "Time the training deliberately",
    law: "Penal Law §400.00(19) · 38 RCNY §5-03",
    body: "Eighteen hours — sixteen classroom, two live fire — with a DCJS-approved instructor, an eighty percent written test, and a live-fire qualification. In New York City the certificate must be dated within six months of submission.",
    link: "training",
    watch:
      "Training first feels productive and is usually a mistake. A certificate that ages out while the rest of the packet is assembled has to be redone at full cost. It belongs in the middle of the sequence, not at the front.",
  },
  {
    n: "04",
    title: "Build the record",
    law: "Penal Law §400.00(1)(o) · 38 RCNY §5-03",
    body: "Four character references, of whom New York City requires at least two to be non-family. Contact details for a spouse or domestic partner and every other adult in the home. Identity and residence documents, employment history, and notarized affidavits from adult cohabitants.",
    link: "eligibility",
    watch:
      "References and cohabitant affidavits are the slowest moving parts, because they depend on other people finding a notary. Start them the day you decide to apply, not when the rest is finished.",
  },
  {
    n: "05",
    title: "File, interview, and wait",
    law: "38 RCNY chapter 5",
    body: "New York City applications are filed online through the NYPD's licensing portal. An in-person interview at the License Division is required for concealed carry. Fingerprinting, the FBI background check and the character investigation follow.",
    link: null,
    watch:
      "An incomplete packet is not rejected on the merits — it is returned, and the clock restarts. Completeness at the moment of filing is worth more than speed getting there.",
  },
  {
    n: "06",
    title: "Stay licensed",
    law: "Penal Law §400.00(10) · NYC Admin. Code §10-131",
    body: "A New York City license runs three years and renews on your birthday. NYC licensees do not recertify with the State Police — they renew with the NYPD. The training requirement applies on renewal as well as issuance.",
    link: "renewal",
    watch:
      "The obligations that begin at issuance are the ones people forget: the safe-storage duty, the purchase authorization requirement, and the sensitive-location rules that a license does not override.",
  },
]

const FAQS = [
  {
    q: "How long does a NYC gun license take?",
    a: "Roughly six months is typical from a complete submission to a decision, covering the interview, fingerprinting, the FBI background check and the character investigation. The NYPD retains full investigative discretion over both the decision and the timing, and no private service can change either.",
  },
  {
    q: "Do I need a lawyer to apply?",
    a: "Not to apply. A document-preparation or concierge service cannot represent you before the License Division — only a New York-licensed attorney may do that. If your history includes a contested denial, an appeal, or a complex disclosure question, that is attorney territory.",
  },
  {
    q: "Can I apply if I live outside New York?",
    a: "Yes. 38 RCNY §5-03 provides for applicants residing outside New York State, with additional background-investigation forms covering each jurisdiction you have lived in over the previous five years.",
  },
  {
    q: "What happens if my application is returned as incomplete?",
    a: "It is not a denial. The packet comes back and you resubmit — but the elapsed time is lost, and any document with its own clock, such as a training certificate, may have expired in the meantime.",
  },
]

export default async function GettingLicensed() {
  const fees = await getPublicFees()
  const url = lawsUrl("/getting-licensed")

  return (
    <>
      <JsonLd
        data={lawsGraph([
          breadcrumbs([
            { name: "NYC Gun Laws", path: "" },
            { name: "Getting licensed", path: "/getting-licensed" },
          ]),
          {
            "@type": "HowTo",
            "@id": `${url}#howto`,
            name: "How to get a New York City handgun license",
            description:
              "The statutory requirements mapped onto the actual sequence of a New York City handgun licence application.",
            url,
            step: PHASES.map((p, i) => ({
              "@type": "HowToStep",
              position: i + 1,
              name: p.title,
              text: p.body,
            })),
          },
          faqNode(url, FAQS),
        ])}
      />

      <PageHero
        crumbs={[
          { name: "NYC Gun Laws", path: "" },
          { name: "Getting licensed", path: "/getting-licensed" },
        ]}
        title="What getting licensed actually involves"
        meta={["The practical path", "Six phases", "~6 months typical"]}
      />

      <section className={styles.section}>
        <div className={styles.inner}>
          <div className={styles.layout}>
            <div>
              <Answer text="A New York City handgun licence application is not a form — it is a records project with six moving parts, several of which depend on other people and one of which expires. The statute tells you what is required. The sequence you assemble it in is what decides whether the process takes six months or eighteen." />

              <div className={styles.prose}>
                {PHASES.map((p) => {
                  const linked = p.link ? getTopic(p.link) : null
                  return (
                    <section key={p.n}>
                      <h2>
                        <span>{p.n}</span>
                        {p.title}
                      </h2>
                      <p style={{ fontFamily: "var(--font-mono)", fontSize: ".78rem", color: "var(--gl-ox)", letterSpacing: ".04em" }}>
                        {p.law}
                      </p>
                      <p>{p.body}</p>
                      <div className={styles.claimNote}>
                        <b>Where it goes wrong</b>
                        {p.watch}
                      </div>
                      {linked && (
                        <p style={{ marginTop: 16 }}>
                          <Link
                            href={local(`/laws/${linked.slug}`)}
                            style={{ color: "var(--gl-ox)", textDecoration: "underline", textUnderlineOffset: 3 }}
                          >
                            Read the law: {linked.title} →
                          </Link>
                        </p>
                      )}
                    </section>
                  )
                })}
              </div>

              <div style={{ marginTop: 56 }}>
                <Rule>What it costs</Rule>
                <p className={styles.sectionIntro}>
                  Government fees are set by the City and the State and are paid directly to them —
                  no service collects them on your behalf. The NYPD application fee is currently{" "}
                  {fees.applicationFee} and the fingerprint fee is {fees.fingerprintFee}. Training
                  and notarization are separate third-party costs. Fees and rules change; the
                  figures shown here are read live from our main website&apos;s fee table.{" "}
                  <Link href={local("/pricing")} style={{ color: "var(--gl-ox)", textDecoration: "underline", textUnderlineOffset: 3 }}>
                    See service pricing →
                  </Link>
                </p>
              </div>

              <div style={{ marginTop: 56 }}>
                <Rule>Common questions</Rule>
                <div style={{ marginTop: 26 }}>
                  <Faqs faqs={FAQS} />
                </div>
              </div>
            </div>

            <aside className={styles.rail}>
              <div className={styles.railBox}>
                <b>Read the law first</b>
                <div className={styles.railBody}>
                  <Link href={local("/laws/eligibility")}>Who qualifies</Link>
                  <Link href={local("/laws/license-types")}>License types</Link>
                  <Link href={local("/laws/training")}>Training requirement</Link>
                  <Link href={local("/laws/renewal")}>Renewal &amp; recertification</Link>
                  <Link href={local("/laws")}>All entries →</Link>
                </div>
              </div>
              <RailCard
                eyebrow="Ready to start"
                title="Turn this into a tracked case."
                body={`${LAWS_SITE.mainSiteLabel[0].toUpperCase()}${LAWS_SITE.mainSiteLabel.slice(1)} builds your document checklist, sends the reference invitations, and shows exactly what is outstanding.`}
                cta="Check eligibility"
              />
            </aside>
          </div>
        </div>
      </section>

      <section className={`${styles.sectionTight} ${styles.sectionAlt}`}>
        <div className={styles.innerNarrow}>
          <Rule>Honest limits</Rule>
          <p className={styles.sectionIntro}>
            No private service can control an NYPD decision or its timing, and anyone who tells you
            otherwise is selling something. What preparation buys you is a complete packet the
            first time, a sequence that does not waste a training certificate, and someone tracking
            the twenty-odd documents so none of them quietly expires.
          </p>
          <div className={styles.heroActions}>
            <a className={styles.cta} href={mainSiteUrl("/eligibility", "body")}>
              Check your eligibility <ArrowUpRight size={15} />
            </a>
            <Link className={styles.ctaGhost} href={local("/pricing")}>
              See pricing <ArrowRight size={15} />
            </Link>
          </div>
        </div>
      </section>

      <Handoff />
    </>
  )
}
