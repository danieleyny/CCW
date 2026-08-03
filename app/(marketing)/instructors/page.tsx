import Link from "next/link"
import { getPublicInstructors } from "@/lib/public-data"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { JsonLd, instructorDirectorySchema } from "@/components/marketing/json-ld"
import { DirectAnswer, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"
import { classFormatLabel } from "@/lib/instructors/public"

export const metadata = buildMetadata({
  title: "DCJS-Approved NYC Firearms Instructors",
  description:
    "A directory of DCJS-approved NYC firearms instructors who teach the required 18-hour concealed-carry course (CCIA) — the boroughs and languages they serve.",
  path: "/instructors",
})

/**
 * PUBLIC instructor directory. Reads ONLY the opt-in projection
 * (getPublicInstructors → public_instructor_directory view). Starts empty until
 * instructors opt in; the empty state is honest rather than padded with fakes.
 */
export default async function InstructorsPage() {
  const instructors = await getPublicInstructors()

  const FAQS = [
    {
      q: "What is the 18-hour course NYC requires?",
      a: "New York's Concealed Carry Improvement Act requires 18 hours of firearms-safety training — 16 hours of classroom instruction plus 2 hours of live-fire — with a state-approved instructor, plus a written test passed at 80% or higher. It is taken in person.",
    },
    {
      q: "What does “DCJS-approved instructor” mean?",
      a: "It means the instructor is approved by the New York State Division of Criminal Justice Services to deliver the required firearms-safety training. Only instructors we have verified as credentialed appear in this directory.",
    },
    {
      q: "Do I have to use an instructor from this directory?",
      a: "No. You may train with any state-approved instructor. This directory lists instructors who chose to be listed publicly; it is a starting point, not a requirement.",
    },
  ]

  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Instructors", path: "/instructors" }]} />
      {instructors.length > 0 && (
        <JsonLd data={instructorDirectorySchema(instructors.map((i) => ({ name: i.name, slug: i.slug })))} />
      )}
      <PageHero
        eyebrow="Find an instructor"
        title="DCJS-approved NYC firearms instructors"
        subtitle="Instructors who teach New York's required 18-hour concealed-carry course — and chose to be listed publicly."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 pt-8 sm:px-6">
        <DirectAnswer>
          To get a NYC gun license you must complete New York&apos;s required 18-hour course — 16
          hours of classroom instruction plus 2 hours of live-fire — with a{" "}
          <strong>DCJS-approved instructor</strong>, in person. The instructors below are approved to
          teach it and chose to be listed; you may also train with any other state-approved
          instructor.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        {instructors.length === 0 ? (
          <div className="rounded-xl border border-dashed border-hairline bg-card p-8 text-center">
            <p className="text-text-mid">
              No instructors are listed publicly yet. In the meantime, our team can match you with a
              verified, DCJS-approved instructor near you.
            </p>
            <Button asChild className="mt-4">
              <Link href="/eligibility">Get matched with an instructor</Link>
            </Button>
          </div>
        ) : (
          <ul className="grid gap-3 sm:grid-cols-2">
            {instructors.map((i) => (
              <li key={i.slug}>
                <Link
                  href={`/instructors/${i.slug}`}
                  className="block h-full rounded-xl border border-hairline bg-card p-5 transition-colors hover:border-hairline-strong"
                >
                  <p className="font-display text-lg font-semibold text-text-hi">{i.name}</p>
                  <p className="mt-1 text-xs text-brass">DCJS-approved instructor</p>
                  {i.boroughs.length > 0 && (
                    <p className="mt-2 text-sm text-text-mid">{i.boroughs.join(" · ")}</p>
                  )}
                  {i.classFormat && (
                    <p className="mt-1 text-sm text-text-low">{classFormatLabel(i.classFormat)}</p>
                  )}
                  {i.languages.length > 0 && (
                    <p className="mt-1 text-xs text-text-low">Teaches in {i.languages.join(", ")}</p>
                  )}
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "The 18-hour CCIA course, explained", href: "/18-hour-ccia-course-nyc" },
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "How the whole process works", href: "/how-it-works" },
          { label: "What it costs", href: "/cost" },
        ]}
      />
    </>
  )
}
