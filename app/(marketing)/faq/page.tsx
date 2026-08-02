import { PageHero } from "@/components/marketing/page-hero"
import { JsonLd, faqSchema } from "@/components/marketing/json-ld"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { RelatedLinks } from "@/components/marketing/page-blocks"
import { getPublicFees } from "@/lib/public-data"
import { type Fees } from "@/lib/fees"
import { buildMetadata } from "@/lib/seo"

export const metadata = buildMetadata({
  title: "NYC Gun License FAQ",
  description:
    "Straight answers on NYC gun license cost, timeline, training hours, references, disclosures, and what happens at the interview.",
  path: "/faq",
})

// Every legal claim below traces to the sourced fact base (content/facts.ts) or
// is procedural/company framing — no new legal assertions. Money comes from the
// `fees` table via getFees(). Answers are kept short (≈40–55 words) so each is a
// clean featured-snippet / AI-citation candidate.
const buildFaqs = (fees: Fees) => [
  {
    q: "How do I get a gun license in NYC?",
    a: "You apply through the NYPD License Division: confirm you're eligible, complete New York's 18-hour firearms course, assemble your documents (references, cohabitant affidavits, proof of residence, photos, and disclosures), then file, get fingerprinted, and attend an interview. You submit your own application — the NYPD decides the outcome.",
  },
  {
    q: "How long does the NYC concealed carry process take?",
    a: "Roughly six months from a complete submission to the decision letter. The NYPD conducts an in-person interview, fingerprinting, an FBI background check, and a good-moral-character investigation. No one can rush the License Division — the only part you control is preparing a complete, correct application before you file.",
  },
  {
    q: "How much does a NYC gun license cost?",
    a: `The NYPD charges a ${fees.applicationFee} handgun license fee plus the ${fees.fingerprintFee} DCJS fingerprinting fee, paid directly to the government and non-refundable. You'll also pay a state-certified instructor for the 18-hour course. Gun License NYC's service fees are separate and depend on your chosen membership tier.`,
  },
  {
    q: "What training is required?",
    a: "New York's CCIA requires 18 hours total — 16 hours of in-person classroom instruction plus 2 hours of live-fire range training with a state-approved instructor, and a written test passed at 80% or higher.",
  },
  {
    q: "How current does my training certificate have to be?",
    a: "Your training certificate must be dated within 6 months of when you file. If it ages out before your application is submitted, you'll need to retake the course — which is why timing the training against the rest of your file matters.",
  },
  {
    q: "How old do I have to be to apply?",
    a: "You must be at least 21 years old to apply for a NYC handgun license through the NYPD License Division.",
  },
  {
    q: "What documents do I need?",
    a: "A government photo ID, four notarized character references, a notarized cohabitant affidavit for every adult in your home, a 3-year social media account list, proof of training, two photos of your gun safe (door open and closed), and proof of residence or business.",
  },
  {
    q: "How many character references do I need, and do they need to be notarized?",
    a: "Four character references are required, and they must be notarized. We send each of your references a secure link so they can complete and notarize their statement without you having to chase them.",
  },
  {
    q: "Does the process differ by borough?",
    a: "No. The NYPD License Division runs one centralized process for all five boroughs — same forms, same training, same investigation, same standard — whether you live in Manhattan, Brooklyn, Queens, the Bronx, or Staten Island. Your borough is an address on the application, not a separate category.",
  },
  {
    q: "Do I have to disclose a sealed or dismissed arrest?",
    a: "Yes. Sealed and dismissed arrests are still disclosed on a New York firearms application. We're candor-maximizing, never disclosure-minimizing — if your history raises a question specific to your situation, we route you to a licensed attorney rather than advise on it ourselves.",
  },
  {
    q: "Can a company file the application for me?",
    a: "No. You submit your own application. A consulting firm cannot file for you or represent you before the License Division — only a New York-licensed attorney may represent an applicant. We prepare and organize everything so your own filing is complete and correct.",
  },
  {
    q: "How long is a NYC carry license valid?",
    a: "A NYC carry license is issued for a three-year term, and New York requires firearms recertification on the State's schedule to keep it from lapsing. We track your renewal and recertification dates so nothing expires by surprise.",
  },
  {
    q: "Can you promise I'll be approved?",
    a: "No. Gun License NYC assists with and guides your application — we do not issue licenses and cannot promise a specific outcome. The NYPD retains full investigative discretion over the decision.",
  },
  {
    q: "I don't live in NYC. Can you still help?",
    a: "Yes. Non-residents with a NYC place of business, or those who need a Special Carry license, are handled on a dedicated track.",
  },
]

export default async function Faq() {
  const fees = await getPublicFees()
  const FAQS = buildFaqs(fees)
  return (
    <>
      <JsonLd data={faqSchema(FAQS)} />
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "FAQ", path: "/faq" }]} />
      <PageHero
        eyebrow="FAQ"
        title="Questions, answered"
        subtitle="Straight answers to what people ask us most — no jargon, no sales pitch."
      />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="space-y-3">
          {FAQS.map((f) => (
            <details
              key={f.q}
              className="group rounded-lg border border-hairline bg-card p-5 [&_summary::-webkit-details-marker]:hidden"
            >
              <summary className="flex cursor-pointer items-center justify-between font-display text-base font-medium">
                {f.q}
                <span className="font-mono text-signal transition-transform group-open:rotate-45">
                  +
                </span>
              </summary>
              <p className="mt-3 text-sm leading-relaxed text-text-mid">{f.a}</p>
            </details>
          ))}
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "What it costs, all-in", href: "/cost" },
          { label: "How long it takes", href: "/timeline" },
          { label: "Find your borough's page", href: "/gun-license" },
        ]}
      />
    </>
  )
}
