import { PageHero } from "@/components/marketing/page-hero"
import { JsonLd, faqSchema } from "@/components/marketing/json-ld"
import { createClient } from "@/lib/supabase/server"
import { getFees, type Fees } from "@/lib/fees"

export const metadata = {
  title: "FAQ",
  description: "Common questions about getting a NYC concealed carry license with CARRY.",
}

const buildFaqs = (fees: Fees) => [
  {
    q: "How long does the NYC concealed carry process take?",
    a: "Roughly six months from a complete submission to the decision letter. The NYPD conducts an in-person interview, fingerprinting, an FBI background check, and a good-moral-character investigation.",
  },
  {
    q: "What are the fees?",
    a: `The NYPD charges a ${fees.applicationFee} handgun license fee plus the ${fees.fingerprintFee} DCJS fingerprinting fee, paid directly to the government. CARRY's service fees are separate and depend on your chosen membership tier.`,
  },
  {
    q: "What training is required?",
    a: "New York's CCIA requires 18 hours total — 16 hours of in-person classroom instruction plus 2 hours of live-fire range training with a DCJS-approved instructor, and a written test passed at 80% or higher.",
  },
  {
    q: "What documents do I need?",
    a: "A government photo ID, four notarized character references, a notarized cohabitant affidavit for every adult in your home, a 3-year social media account list, proof of training, two photos of your gun safe (door open and closed), and proof of residence or business.",
  },
  {
    q: "Can you promise I'll be approved?",
    a: "No. CARRY assists with and guides your application — we do not issue licenses and cannot promise a specific outcome. The NYPD retains full investigative discretion.",
  },
  {
    q: "I don't live in NYC. Can you still help?",
    a: "Yes. Non-residents with a NYC place of business, or those who need a Special Carry license, are handled on a dedicated track.",
  },
]

export default async function Faq() {
  const fees = await getFees(await createClient())
  const FAQS = buildFaqs(fees)
  return (
    <>
      <JsonLd data={faqSchema(FAQS)} />
      <PageHero
        eyebrow="FAQ"
        title="Questions, answered"
        subtitle="The essentials of getting a NYC concealed carry license."
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
    </>
  )
}
