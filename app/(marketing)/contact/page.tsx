import { brand } from "@/config/brand"
import { buildMetadata } from "@/lib/seo"
import { PageHero } from "@/components/marketing/page-hero"
import { LeadForm } from "@/components/marketing/lead-form"

export const metadata = buildMetadata({
  title: "Contact Us — NYC Gun License Help",
  description:
    "Talk to the Gun License NYC team about your application. Call (929) 352-5961 or email gunlicensenyc@gmail.com — we answer real questions honestly.",
  path: "/contact",
})

export default function Contact() {
  return (
    <>
      <PageHero
        eyebrow="Contact"
        title="Not sure where to start?"
        subtitle="Tell us your situation and we'll show you the path — no pressure, no commitment. We reply within one business day."
      />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="mb-8 flex flex-col gap-1 font-mono text-sm text-text-mid">
          <span>{brand.contact.email}</span>
          <span>{brand.contact.phone}</span>
        </div>
        <div className="rounded-lg border border-hairline bg-card p-6">
          <LeadForm source="contact" submitLabel="Send message" />
        </div>
      </section>
    </>
  )
}
