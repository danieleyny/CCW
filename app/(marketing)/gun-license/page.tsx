import Link from "next/link"
import { ArrowRight } from "lucide-react"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

export const metadata = buildMetadata({
  title: "NYC Gun License by Borough",
  description:
    "Applying for a gun license in Manhattan, Brooklyn, Queens, the Bronx, or Staten Island? The NYPD process is identical citywide — here's the one standard, and the questions each borough raises.",
  path: "/gun-license",
})

/**
 * THE BOROUGH HUB — the pillar the five borough spokes were missing.
 *
 * The honest framing (same as the spokes): the NYPD License Division runs ONE
 * centralized process for all five boroughs. There is no borough-specific rule,
 * and inventing one would be both false and a legal problem. This page captures
 * the borough-agnostic head term ("NYC gun license by borough"), states the
 * single citywide standard, and routes to each borough's page for the practical
 * questions that borough actually raises. Every legal claim renders from the
 * sourced fact base (content/facts.ts) — nothing is asserted freehand.
 */

const BOROUGHS: { name: string; path: string; angle: string }[] = [
  { name: "Manhattan", path: "/gun-license/manhattan", angle: "Proximity to the License Division buys nothing — plus small-apartment storage and household questions." },
  { name: "Brooklyn", path: "/gun-license/brooklyn", angle: "Multi-adult households and getting every cohabitant affidavit notarized on time." },
  { name: "Queens", path: "/gun-license/queens", angle: "Fitting the full 18 hours of training around a working schedule." },
  { name: "The Bronx", path: "/gun-license/bronx", angle: "Lining up and coordinating your four notarized references." },
  { name: "Staten Island", path: "/gun-license/staten-island", angle: "Distance to appointments, and planning the in-person steps." },
]

const FAQS = [
  {
    q: "Is the gun license process different in each NYC borough?",
    a: "No. The NYPD License Division runs one centralized handgun-licensing process for all five boroughs. The same forms, the same 18 hours of training, the same four notarized references, the same investigation, and the same standard apply whether you live in Manhattan, Brooklyn, Queens, the Bronx, or Staten Island. Your borough is an address on the application, not a separate category or queue.",
  },
  {
    q: "Does my borough affect how long the process takes?",
    a: "No. Roughly six months from a complete submission is typical citywide, and the NYPD keeps full investigative discretion over both the decision and its timing. No borough address moves you up a queue. The only part of the calendar anyone can influence is the part before you file — assembling a complete, correct application.",
  },
  {
    q: "Why have a page for each borough if the rules are the same?",
    a: "Because the practical questions differ even when the rules don't. A studio raises different storage questions than a house; a shared apartment raises different household-affidavit questions than living alone. Each borough page covers the questions applicants there actually ask — the standard itself is identical everywhere.",
  },
  {
    q: "Do I have to live in the borough to apply through the NYPD?",
    a: "NYC handgun licensing goes through the NYPD License Division for residents of the five boroughs. Non-residents who have a place of business in NYC, or who need a Special Carry license, are handled on a dedicated track rather than the standard resident process.",
  },
]

export default function GunLicenseHubPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Gun license by borough", path: "/gun-license" },
        ]}
      />
      <PageHero
        eyebrow="By borough"
        title="NYC gun license, by borough"
        subtitle="One process, one standard, all five boroughs. Here's the citywide answer — and where each borough's practical questions get answered."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          Getting a gun license in New York City works the same way in every borough. The{" "}
          <strong>NYPD License Division handles handgun licensing centrally</strong>{" "}
          for Manhattan, Brooklyn, Queens, the Bronx, and Staten Island — one set of forms, the same 18 hours of
          training, the same four notarized references, the same investigation, and the same roughly
          six-month wait from a complete submission. There is no borough-specific rule, no local desk,
          and no queue your address moves you up or down. What changes borough to borough isn&apos;t
          the standard — it&apos;s the practical questions your housing and household raise.
        </DirectAnswer>
      </section>

      {/* Borough spokes */}
      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <SectionEyebrow>Your borough</SectionEyebrow>
        <h2 className="mt-3 font-display text-2xl font-semibold tracking-tight">
          Same rules everywhere — different questions
        </h2>
        <ul className="mt-6 grid gap-3">
          {BOROUGHS.map((b) => (
            <li key={b.path}>
              <Link
                href={b.path}
                className="group flex items-start justify-between gap-4 rounded-xl border border-hairline bg-card px-5 py-4 transition-colors hover:border-hairline-strong"
              >
                <span>
                  <span className="font-display text-lg font-semibold text-text-hi">
                    Gun license in {b.name}
                  </span>
                  <span className="mt-1 block text-sm text-text-mid">{b.angle}</span>
                </span>
                <ArrowRight className="mt-1 size-4 shrink-0 text-signal transition-transform group-hover:translate-x-0.5" />
              </Link>
            </li>
          ))}
        </ul>
      </section>

      {/* The one citywide standard, sourced */}
      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">The one citywide standard</h2>
        <p className="mt-3 text-text-mid">
          These are the rules that apply the same in every borough. Each is set by an agency other
          than us, with the primary source attached:
        </p>
        <FactList
          facts={[
            FACTS.age,
            FACTS.training,
            FACTS.references,
            FACTS.cohabitants,
            FACTS.timeline,
            FACTS.youFile,
          ]}
        />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">Your borough doesn&apos;t decide where you stand. Your file does.</p>
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "What a NYC gun license costs", href: "/cost" },
          { label: "How long a NYC gun license takes", href: "/timeline" },
          { label: "How the whole process works", href: "/how-it-works" },
        ]}
      />
    </>
  )
}
