import Link from "next/link"
import Image from "next/image"
import { ExternalLink } from "lucide-react"
import { brand } from "@/config/brand"
import type { TrainingPartner } from "@/config/training-partners"
import { trainingPartnerPath } from "@/config/training-partners"
import { Button } from "@/components/ui/button"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { JsonLd } from "@/components/marketing/json-ld"
import { FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"
import { TRAINING_INDEPENDENCE_DISCLAIMER } from "@/components/marketing/training-partner-card"
import { canonical } from "@/lib/seo"

export function TrainingPartnerProfile({ partner }: { partner: TrainingPartner }) {
  const phoneDigits = partner.phone.replace(/\D/g, "")
  const displayPhone = phoneDigits.length === 10
    ? `(${phoneDigits.slice(0, 3)}) ${phoneDigits.slice(3, 6)}-${phoneDigits.slice(6)}`
    : partner.phone

  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Partners", path: "/partners" }, { name: partner.name, path: trainingPartnerPath(partner) }]} />
      <JsonLd data={trainingPartnerSchema(partner)} />

      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_22rem] lg:py-16">
          <div>
            <SectionEyebrow>Independent training provider</SectionEyebrow>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight text-text-hi sm:text-5xl">{partner.name}</h1>
            <p className="mt-2 text-brass">{partner.firm} · {partner.role}</p>
            <p className="mt-4 max-w-xl text-lg text-text-mid">{partner.headline}</p>
            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg"><Link href={partner.signupHref}>Register for the class</Link></Button>
              <Button asChild variant="outline" size="lg"><a href={`mailto:${partner.email}`}>Email Yariv</a></Button>
            </div>
          </div>

          <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-md border border-hairline bg-surface-2 lg:mx-0">
            <Image src={partner.photo.src} alt={partner.photo.alt} fill priority sizes="(min-width: 1024px) 22rem, 90vw" className="object-cover object-top" />
            <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-brass/30" aria-hidden />
            <div className="absolute bottom-3 left-3 max-w-[80%] rounded-md border border-hairline bg-card/90 px-3 py-2 backdrop-blur">
              <p className="font-display text-sm font-semibold text-text-hi">{partner.name}</p>
              <p className="mt-0.5 text-xs text-text-low">{partner.firm}</p>
            </div>
          </div>
        </div>
      </section>

      <section className="border-b border-hairline bg-surface-2/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-hairline sm:grid-cols-4 sm:divide-y-0">
          {partner.highlights.map((highlight) => (
            <div key={highlight.label} className="px-5 py-6">
              <div className="font-display text-2xl font-semibold tabular-nums tracking-tight text-text-hi sm:text-[27px]">{highlight.figure}</div>
              <div className="engraved mt-1.5 text-text-low">{highlight.label}</div>
            </div>
          ))}
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <section className="py-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Background</h2>
          <div className="mt-3 max-w-[65ch] space-y-4 text-text-mid">
            {partner.bio.map((paragraph) => <p key={paragraph}>{paragraph}</p>)}
          </div>
        </section>

        <section className="border-t border-hairline py-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Training profile</h2>
          <dl className="mt-5 divide-y divide-hairline">
            {partner.credentials.map((credential) => (
              <div key={credential.label} className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
                <dt className="engraved text-text-low">{credential.label}</dt>
                <dd className="text-text-hi">
                  {credential.href ? (
                    credential.href.startsWith("/") ? (
                      <Link className="inline-flex items-center gap-1.5 text-signal hover:underline" href={credential.href}>{credential.value}</Link>
                    ) : (
                      <a className="inline-flex items-center gap-1.5 text-signal hover:underline" href={credential.href} target="_blank" rel="noreferrer">{credential.value} <ExternalLink className="size-3.5 shrink-0" aria-hidden /></a>
                    )
                  ) : credential.value}
                </dd>
              </div>
            ))}
          </dl>
        </section>

        <section className="py-8">
          <div className="rounded-xl border border-hairline bg-surface-2 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight">What you can speak about</h2>
            <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {partner.services.map((service) => (
                <li key={service.title} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-[1px] bg-brass" aria-hidden />
                  <div><p className="font-medium text-text-hi">{service.title}</p><p className="mt-0.5 text-sm text-text-mid">{service.detail}</p></div>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      <section className="border-y border-hairline bg-surface-2/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { number: "1", title: "Review the class", detail: "See the current dates, location area and all-in price on our redesigned registration section." },
              { number: "2", title: "Reserve your seat", detail: "Complete the class registration and payment securely on Gun License NYC." },
              { number: "3", title: "Complete your training", detail: "50B provides the instruction and confirms the completion documentation directly with you." },
            ].map((step) => (
              <li key={step.number} className="rounded-xl border border-hairline bg-card p-5">
                <p className="font-mono text-signal">{step.number}</p><p className="mt-2 font-display font-semibold text-text-hi">{step.title}</p><p className="mt-1 text-sm text-text-mid">{step.detail}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      <FaqBlock faqs={partner.faqs} />

      <section className="border-y border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="text-text-mid">Register and pay through Gun License NYC; 50B provides the independent instruction.</p>
          <div className="mt-4 flex flex-wrap justify-center gap-3">
            <Button asChild size="lg"><Link href={partner.signupHref}>Register for the class</Link></Button>
            <Button asChild variant="outline" size="lg"><a href={`mailto:${partner.email}`}>Email Yariv</a></Button>
          </div>
        </div>
      </section>

      <section className="border-b border-hairline">
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-10 sm:px-6">
          <p className="text-xs leading-relaxed text-text-low">{TRAINING_INDEPENDENCE_DISCLAIMER}</p>
          <p className="text-xs leading-relaxed text-text-low">{brand.disclaimer}</p>
          <div className="border-t border-hairline pt-5 text-xs text-text-low">
            <p className="font-medium text-text-mid">{partner.firm}</p>
            <p className="mt-1"><a className="hover:text-text-mid hover:underline" href={`tel:+1${phoneDigits}`}>{displayPhone}</a> · <a className="hover:text-text-mid hover:underline" href={`mailto:${partner.email}`}>{partner.email}</a></p>
          </div>
        </div>
      </section>

      <RelatedLinks links={[{ label: "Our partners", href: "/partners" }, { label: "NYC training requirements", href: "/requirements" }, { label: "Contact our team", href: "/contact" }]} />
    </>
  )
}

function trainingPartnerSchema(partner: TrainingPartner) {
  const url = canonical(trainingPartnerPath(partner))
  const companyId = `${url}#company`
  return {
    "@context": "https://schema.org",
    "@graph": [
      { "@type": "Organization", "@id": companyId, name: partner.firm, url, email: partner.email, telephone: partner.phone, areaServed: partner.location },
      { "@type": "Person", "@id": `${url}#person`, name: partner.name, jobTitle: partner.role, url, worksFor: { "@id": companyId }, description: partner.headline },
    ],
  }
}
