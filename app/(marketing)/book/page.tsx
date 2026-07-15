import { PageHero } from "@/components/marketing/page-hero"
import { LeadForm } from "@/components/marketing/lead-form"

export const metadata = {
  title: "Book a consultation",
  description:
    "Book a free consultation with Gun License NYC to map out your NYC concealed carry application.",
}

export default function Book() {
  return (
    <>
      <PageHero
        eyebrow="Consultation"
        title="Book a free consultation"
        subtitle="A 20-minute call to assess your eligibility and lay out your timeline. No payment, no obligation."
      />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="rounded-lg border border-hairline bg-card p-6">
          <LeadForm
            source="book"
            datetime
            submitLabel="Request consultation"
            successTitle="Consultation requested."
            successBody="We'll confirm your time by email shortly."
          />
        </div>
      </section>
    </>
  )
}
