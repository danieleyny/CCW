import Link from "next/link"
import { breadcrumbs, lawsGraph, lawsMetadata, lawsUrl, local } from "@/lib/gun-laws-site"
import { Handoff, JsonLd, PageHero, Rule, styles } from "../components"

export const metadata = lawsMetadata({
  title: "Glossary of New York Firearm Law Terms",
  description:
    "Sensitive location, restricted location, premises licence, special carry, serious offence, ERPO, recertification, LEOSA — the vocabulary of New York firearm law, defined.",
  path: "/glossary",
})

const TERMS: { term: string; cite?: string; def: string; link?: string }[] = [
  {
    term: "CCIA",
    cite: "L.2022 ch. 371",
    def: "The Concealed Carry Improvement Act, New York's 2022 response to the Supreme Court's decision in Bruen. It created the sensitive-location and restricted-location offences, the eighteen-hour training requirement, the four-reference and in-person interview requirements, and the three-year recertification cycle for carry licences.",
  },
  {
    term: "Sensitive location",
    cite: "Penal Law §265.01-e",
    def: "One of twenty enumerated categories of place where possessing a firearm is a class E felony even for a licence holder — government buildings, health care, worship, schools, parks, transit, bars, entertainment venues, polling places, protests and Times Square among them.",
    link: "/laws/sensitive-locations",
  },
  {
    term: "Restricted location",
    cite: "Penal Law §265.01-d",
    def: "Private property where the owner has not affirmatively permitted firearms. Permanently enjoined as applied to property held open to the public by Christian v. James (2d Cir. 2026); still on the books as to genuinely private, non-public property.",
    link: "/laws/private-property",
  },
  {
    term: "Premises licence",
    cite: "Penal Law §400.00(2)(a)–(b)",
    def: "A licence to possess a handgun at one specified location — a dwelling or a place of business. It does not authorize carrying in public.",
    link: "/laws/license-types",
  },
  {
    term: "Carry licence",
    cite: "Penal Law §400.00(2)(f)",
    def: "The unrestricted licence to have and carry a handgun concealed, without regard to employment or place of possession. This is the licence the CCIA's additional requirements attach to.",
    link: "/laws/license-types",
  },
  {
    term: "Special Carry Licence",
    cite: "38 RCNY §5-23",
    def: "A New York City licence that gives validity inside the five boroughs to a carry licence issued by another New York county, as required by Penal Law §400.00(6). Frequently and wrongly conflated with the state's §400.00(2)(f) licence.",
    link: "/laws/license-types",
  },
  {
    term: "Serious offence",
    cite: "Penal Law §400.00(1)(c)",
    def: "A defined category of conviction — including a number of misdemeanours — that permanently disqualifies an applicant, alongside any felony conviction.",
    link: "/laws/eligibility",
  },
  {
    term: "Good moral character",
    cite: "Penal Law §400.00(1)(b)",
    def: "The statutory standard: having the essential character, temperament and judgment necessary to be entrusted with a weapon and to use it only in a manner that does not endanger oneself or others. Upheld against constitutional challenge in Antonyuk v. James.",
    link: "/laws/eligibility",
  },
  {
    term: "Duly authorized instructor",
    cite: "Penal Law §265.00(19)",
    def: "An instructor approved by the New York State Division of Criminal Justice Services to deliver the statutory eighteen-hour training curriculum.",
    link: "/laws/training",
  },
  {
    term: "Recertification",
    cite: "Penal Law §400.00(10)",
    def: "A State Police process — every three years for carry licences, every five for others. Licensees in New York City, Nassau, Suffolk and Westchester do not recertify with the State Police at all; they follow their county's renewal process.",
    link: "/laws/renewal",
  },
  {
    term: "Safe storage depository",
    cite: "Penal Law §265.45(3)",
    def: "A fire-, impact- and tamper-resistant container in which a firearm may lawfully be secured. The statute expressly excludes glove compartments.",
    link: "/laws/safe-storage",
  },
  {
    term: "Purchase authorization",
    cite: "38 RCNY §5-25",
    def: "Written NYPD permission a New York City licensee must obtain before taking possession of a handgun. Valid thirty days, presented to the dealer, and returned to the License Division afterward.",
    link: "/laws/buying-a-handgun",
  },
  {
    term: "ERPO",
    cite: "C.P.L.R. article 63-A",
    def: "An extreme risk protection order — New York's red flag order. It requires surrender of firearms and suspension or revocation of any firearm licence.",
    link: "/laws/red-flag-orders",
  },
  {
    term: "LEOSA",
    cite: "18 U.S.C. §926C",
    def: "The federal Law Enforcement Officers Safety Act, which permits a qualified retired officer meeting its conditions to carry concealed, subject to state law on where carry is prohibited.",
    link: "/laws/retired-law-enforcement",
  },
  {
    term: "FOPA / peaceable journey",
    cite: "18 U.S.C. §926A",
    def: "The federal transport provision protecting travel with a lawfully possessed, unloaded and inaccessible firearm between two places where possession is lawful. Treated in practice as an affirmative defence rather than a bar to arrest, and no protection for a journey broken by a stopover.",
    link: "/laws/transport",
  },
  {
    term: "Bruen",
    cite: "N.Y. State Rifle & Pistol Ass'n v. Bruen (2022)",
    def: "The Supreme Court decision striking down New York's 'proper cause' requirement and establishing the text-and-historical-tradition test that every provision on this site has since been litigated under.",
  },
  {
    term: "Rifle and shotgun permit",
    cite: "NYC Admin. Code §10-303",
    def: "A separate NYPD permit required to possess or purchase a long gun in New York City. Three-year term, subject to automatic renewal. No equivalent exists elsewhere in New York State.",
    link: "/laws/long-guns",
  },
  {
    term: "Semiautomatic rifle licence",
    cite: "Penal Law §400.00(2), unlettered paragraph",
    def: "A state licence required to purchase or take ownership of a semiautomatic rifle on or after the 2022 effective date. Commonly miscited to §400.00(16-a), which is actually SAFE Act assault-weapon registration.",
    link: "/laws/long-guns",
  },
]

export default function Glossary() {
  return (
    <>
      <JsonLd
        data={lawsGraph([
          breadcrumbs([
            { name: "NYC Gun Laws", path: "" },
            { name: "Glossary", path: "/glossary" },
          ]),
          {
            "@type": "DefinedTermSet",
            "@id": `${lawsUrl("/glossary")}#terms`,
            name: "Glossary of New York firearm law terms",
            url: lawsUrl("/glossary"),
            hasDefinedTerm: TERMS.map((t) => ({
              "@type": "DefinedTerm",
              name: t.term,
              description: t.def,
            })),
          },
        ])}
      />

      <PageHero
        crumbs={[
          { name: "NYC Gun Laws", path: "" },
          { name: "Glossary", path: "/glossary" },
        ]}
        title="Glossary"
        meta={[`${TERMS.length} terms`, "With citations"]}
      />

      <section className={styles.section}>
        <div className={styles.innerNarrow}>
          <p className={styles.sectionIntro} style={{ marginTop: 0 }}>
            New York firearm law uses several terms that sound interchangeable and are not. The
            distinctions below are the ones that decide outcomes.
          </p>
          <dl className={styles.deflist} style={{ marginTop: 40 }}>
            {TERMS.map((t) => (
              <div className={styles.defrow} key={t.term}>
                <dt>
                  {t.term}
                  {t.cite && (
                    <>
                      <br />
                      <span style={{ color: "var(--gl-muted-2)", fontWeight: 500 }}>{t.cite}</span>
                    </>
                  )}
                </dt>
                <dd>
                  {t.def}
                  {t.link && (
                    <>
                      {" "}
                      <Link
                        href={local(t.link)}
                        style={{ color: "var(--gl-ox)", textDecoration: "underline", textUnderlineOffset: 3 }}
                      >
                        Read the entry →
                      </Link>
                    </>
                  )}
                </dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      <section className={`${styles.sectionTight} ${styles.sectionAlt}`}>
        <div className={styles.innerNarrow}>
          <Rule>A note on spelling</Rule>
          <p className={styles.sectionIntro}>
            New York statutes use &ldquo;license.&rdquo; Where this site quotes or paraphrases
            statutory text it follows the statute; elsewhere it reads as ordinary prose. Nothing
            turns on it.
          </p>
        </div>
      </section>

      <Handoff />
    </>
  )
}
