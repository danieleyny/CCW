import Link from "next/link"
import { notFound } from "next/navigation"
import type { Metadata } from "next"
import { getPublicInstructors } from "@/lib/public-data"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { JsonLd, instructorProfileSchema } from "@/components/marketing/json-ld"
import { RelatedLinks } from "@/components/marketing/page-blocks"
import { classFormatLabel } from "@/lib/instructors/public"

/** Pre-render the opted-in profiles; new opt-ins render on-demand (ISR). */
export async function generateStaticParams() {
  const instructors = await getPublicInstructors()
  return instructors.map((i) => ({ slug: i.slug }))
}

async function findBySlug(slug: string) {
  const instructors = await getPublicInstructors()
  return instructors.find((i) => i.slug === slug) ?? null
}

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>
}): Promise<Metadata> {
  const { slug } = await params
  const instructor = await findBySlug(slug)
  if (!instructor)
    return buildMetadata({
      title: "Instructor not found",
      description: "This instructor profile is not available.",
      path: `/instructors/${slug}`,
      noIndex: true,
    })
  const where = instructor.boroughs.length ? ` in ${instructor.boroughs.join(", ")}` : ""
  return buildMetadata({
    title: `${instructor.name} — Firearms Instructor`,
    description: `${instructor.name} is a DCJS-approved firearms instructor${where} teaching New York's required 18-hour concealed-carry course.`.slice(0, 155),
    path: `/instructors/${slug}`,
  })
}

export default async function InstructorProfilePage({
  params,
}: {
  params: Promise<{ slug: string }>
}) {
  const { slug } = await params
  const instructor = await findBySlug(slug)
  if (!instructor) notFound()

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Instructors", path: "/instructors" },
          { name: instructor.name, path: `/instructors/${slug}` },
        ]}
      />
      <JsonLd data={instructorProfileSchema(instructor)} />
      <PageHero
        eyebrow="DCJS-approved instructor"
        title={instructor.name}
        subtitle={
          instructor.boroughs.length ? `Teaching in ${instructor.boroughs.join(", ")}` : undefined
        }
      />

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <div className="rounded-xl border border-hairline bg-card p-6">
          <p className="engraved text-brass">The course</p>
          <p className="mt-2 text-text-mid">
            {instructor.name} is a DCJS-approved instructor for New York&apos;s required 18-hour
            concealed-carry course — 16 hours of classroom instruction plus 2 hours of live-fire,
            taught in person, with the written test the state requires.
          </p>
          <dl className="mt-5 grid gap-4 sm:grid-cols-3">
            {instructor.boroughs.length > 0 && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-text-low">Boroughs served</dt>
                <dd className="mt-1 text-sm text-text-hi">{instructor.boroughs.join(", ")}</dd>
              </div>
            )}
            {instructor.classFormat && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-text-low">Class format</dt>
                <dd className="mt-1 text-sm text-text-hi">{classFormatLabel(instructor.classFormat)}</dd>
              </div>
            )}
            {instructor.languages.length > 0 && (
              <div>
                <dt className="text-xs uppercase tracking-wide text-text-low">Languages</dt>
                <dd className="mt-1 text-sm text-text-hi">{instructor.languages.join(", ")}</dd>
              </div>
            )}
          </dl>
        </div>

        {instructor.bio && (
          <div className="mt-6">
            <h2 className="font-display text-xl font-semibold tracking-tight">About {instructor.name}</h2>
            <p className="mt-2 whitespace-pre-line text-text-mid">{instructor.bio}</p>
          </div>
        )}

        <p className="mt-6 text-xs text-text-low">
          The 18-hour course is one requirement among several. Training with any state-approved
          instructor satisfies it; this listing is a starting point, not an endorsement of a specific
          outcome.
        </p>
      </section>

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "All NYC firearms instructors", href: "/instructors" },
          { label: "The 18-hour CCIA course, explained", href: "/18-hour-ccia-course-nyc" },
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "How the whole process works", href: "/how-it-works" },
        ]}
      />
    </>
  )
}
