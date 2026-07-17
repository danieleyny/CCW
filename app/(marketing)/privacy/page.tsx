import { brand } from "@/config/brand"
import { buildMetadata } from "@/lib/seo"
import { PageHero } from "@/components/marketing/page-hero"

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How Gun License NYC collects, uses, and protects your personal information.",
  path: "/privacy",
})

const SECTIONS = [
  {
    h: "Information we collect",
    p: "To prepare and file your application we collect identity documents, contact details, residence/business proof, character-reference and cohabitant information, your 3-year social media account list, training records, and gun-safe photos. This is sensitive personal information and we treat it as such.",
  },
  {
    h: "How we use it",
    p: "Your information is used solely to assist with, assemble, and file your NYC concealed-carry application, and to communicate with you about its status. We do not sell your personal information.",
  },
  {
    h: "How we protect it",
    p: "Access is least-privilege and role-based: you see only your own case; staff see only assigned cases. Documents are stored in access-controlled storage, every change is recorded in an immutable audit log, and data is encrypted in transit.",
  },
  {
    h: "Data retention",
    p: "We retain your records for the duration of your engagement and the license term, after which they are deleted on request or per our retention schedule.",
  },
  {
    h: "Your choices",
    p: `You may request access to or deletion of your information by contacting ${brand.contact.email}.`,
  },
]

export default function Privacy() {
  return (
    <>
      <PageHero eyebrow="Legal" title="Privacy Policy" />
      <section className="mx-auto max-w-3xl px-4 py-16 sm:px-6">
        <div className="space-y-8">
          {SECTIONS.map((s) => (
            <div key={s.h}>
              <h2 className="font-display text-xl font-semibold">{s.h}</h2>
              <p className="mt-2 text-sm leading-relaxed text-text-mid">{s.p}</p>
            </div>
          ))}
          <p className="border-t border-hairline pt-6 text-xs leading-relaxed text-text-low">
            {brand.disclaimer}
          </p>
        </div>
      </section>
    </>
  )
}
