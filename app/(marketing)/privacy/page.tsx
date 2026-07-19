import { brand } from "@/config/brand"
import { buildMetadata } from "@/lib/seo"
import { PageHero } from "@/components/marketing/page-hero"

export const metadata = buildMetadata({
  title: "Privacy Policy",
  description: "How Gun License NYC collects, uses, and protects your personal information.",
  path: "/privacy",
})

/**
 * This page describes ACTUAL PRACTICE, not aspiration. Two rules for anyone
 * editing it:
 *
 *  1. Never claim we submit or represent. We prepare and review; the applicant
 *     files their own application. NYPD's published position is that consulting
 *     firms cannot represent applicants — saying otherwise here is a compliance
 *     problem, not a copy problem. (tests/copy-guard.test.ts enforces this.)
 *  2. Do not promise a retention period until counsel sets one. The mechanism
 *     lives in `retention_policies` and ships disabled; see
 *     docs/DATA_INVENTORY.md.
 */
const SECTIONS = [
  {
    h: "Information we collect",
    p: "To help you prepare your own application we collect identity and citizenship documents, date of birth, contact details, proof of residence or business, household and character-reference information, training records, and photos of your gun safe. Depending on your history we may also collect written disclosures about arrests, summonses, orders of protection, domestic incidents, and the health-related questions the application asks. After a licence is issued we may hold firearm purchase and §5-24 report details. We also record technical information when you e-sign a document — the date, your IP address and browser — and an approximate home location derived from your address so we can match you with nearby instructors. Much of this is sensitive, and some of it is criminal-history and health information. We treat it accordingly.",
  },
  {
    h: "How we use it",
    p: "Your information is used to help you assemble, check and understand your own NYC handgun-licence application, and to communicate with you about it. You submit your application yourself — we do not file it for you and we do not represent you before the NYPD License Division; only a New York-licensed attorney may do that. We do not sell your personal information.",
  },
  {
    h: "Who can see it",
    p: "Access is least-privilege and enforced by the database, not just the interface: you see only your own case, and our staff see only what their role permits. Instructors you work with can see the paperwork they are helping you with — never your disclosures, never the details of any arrest, order of protection, domestic incident or health question. Those are handled by our staff alone.",
  },
  {
    h: "How we protect it",
    p: "Documents are held in private, access-controlled storage. Data is encrypted in transit and at rest, and links to your documents are short-lived. Actions on your case are written to an audit log. We test these controls with an automated suite that tries to read your records as another applicant and as an instructor, and fails the build if it ever succeeds.",
  },
  {
    h: "Data retention",
    p: "We keep your records for the duration of your engagement and while your licence is current, because your file matters again at renewal. We have not set a fixed deletion period: records connected to a firearms licence may be subject to legal retention requirements, and we would rather tell you that plainly than publish a schedule we are not certain we can follow. You can ask us to delete your data at any time, and we will unless we are legally required to keep it — in which case we will tell you which part and why.",
  },
  {
    h: "Your choices",
    p: `Signed-in applicants can request a copy of their data, a correction, or deletion from the "Your data & privacy" page in the portal, and see the status of that request. You can also email ${brand.contact.email}. If you ask us to delete your data we remove your disclosures, intake and questionnaire answers, uploaded and generated documents (the files themselves, not just the records of them), household and reference details, and our notes. We keep one thing: the proof-of-signing record for any document you e-signed — its timestamp, a fingerprint of the document, and the consent wording — because that is the evidence a signature was validly obtained. We delete your signature image and strip the IP and device details from it.`,
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
