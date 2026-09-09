import Image from "next/image"
import Link from "next/link"
import { brand } from "@/config/brand"
import { type Partner, partnerPath, partnerFullName, partnerConsultationPath } from "@/config/partners"
import { Button } from "@/components/ui/button"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { JsonLd, attorneyProfileSchema } from "@/components/marketing/json-ld"
import { FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"
import { INDEPENDENCE_DISCLAIMER, CredentialBadge } from "@/components/marketing/partner-card"

/**
 * The full attorney-referral profile body — rendered by BOTH the vanity route (/{slug})
 * and the general /partners/[slug] route, from config only. Never implies he is our
 * employee, our counsel, or that hiring him improves odds; the independence disclaimer +
 * the standing brand disclaimer both render at the foot.
 */
export function PartnerProfile({ partner }: { partner: Partner }) {
  const consult = partnerConsultationPath(partner)
  const rate = `$${partner.rate.amount}/${partner.rate.unit}`

  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Partners", path: "/partners" },
          { name: partnerFullName(partner), path: partnerPath(partner) },
        ]}
      />
      <JsonLd data={attorneyProfileSchema(partner)} />

      {/* HERO */}
      <section className="border-b border-hairline">
        <div className="mx-auto grid max-w-6xl items-center gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_22rem] lg:py-16">
          <div>
            <SectionEyebrow>Independent legal counsel</SectionEyebrow>
            <h1 className="mt-3 font-display text-4xl font-semibold tracking-tight sm:text-5xl">
              {partnerFullName(partner)}
            </h1>
            <p className="mt-2 text-brass">
              {partner.firm} · {partner.role}
            </p>
            <p className="mt-4 max-w-xl text-lg text-text-mid">{partner.headline}</p>

            <ul className="mt-5 flex flex-wrap gap-2">
              <CredentialBadge primary>{partner.yearsInPractice} years in practice</CredentialBadge>
              {partner.honors.map((h) => (
                <CredentialBadge key={h.label} primary={h.tier === "primary"}>
                  {h.label}
                </CredentialBadge>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                <Link href={consult}>Request a consultation · {rate}</Link>
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={partner.website} target="_blank" rel="noreferrer">Visit his firm&apos;s site</a>
              </Button>
            </div>
          </div>

          <HeroPortrait partner={partner} />
        </div>
      </section>

      {/* CREDENTIAL BAND — full-bleed, 6 / 3 / 2 */}
      <section className="border-b border-hairline bg-surface-2/40">
        <div className="mx-auto grid max-w-6xl grid-cols-2 divide-x divide-y divide-hairline sm:grid-cols-3 sm:divide-y-0 lg:grid-cols-6">
          {partner.highlights.map((h) => (
            <div key={h.label} className="px-5 py-6">
              <div className="font-display text-2xl font-semibold tabular-nums tracking-tight text-text-hi sm:text-[27px]">
                {h.figure}
              </div>
              <div className="engraved mt-1.5 text-text-low">{h.label}</div>
            </div>
          ))}
        </div>
      </section>

      {/* BACKGROUND — single prose measure */}
      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        <section className="py-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Background</h2>
          <div className="mt-3 max-w-[65ch] space-y-4 text-text-mid">
            {partner.bio.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>

        {/* CREDENTIALS — reference data, hairline rules */}
        <section className="border-t border-hairline py-12">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Credentials</h2>
          <dl className="mt-5 divide-y divide-hairline">
            <CredRow label="Admissions" value={partner.admissions.join(", ")} />
            {partner.education.map((e) => (
              <CredRow key={e.term} label={e.term} value={`${e.value}${e.detail ? ` · ${e.detail}` : ""}`} />
            ))}
            <CredRow label="Serves" value={partner.serves.join(", ")} />
            <CredRow label="Years in practice" value={String(partner.yearsInPractice)} />
          </dl>
        </section>

        {/* WHAT HE HANDLES — a section that matters: raised surface */}
        <section className="py-8">
          <div className="rounded-xl border border-hairline bg-surface-2 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight">What he handles for our applicants</h2>
            <ul className="mt-5 grid gap-x-8 gap-y-4 sm:grid-cols-2">
              {partner.services.map((s) => (
                <li key={s.title} className="flex gap-3">
                  <span className="mt-2 size-1.5 shrink-0 rounded-[1px] bg-brass" aria-hidden />
                  <div>
                    <p className="font-medium text-text-hi">{s.title}</p>
                    {s.detail && <p className="mt-0.5 text-sm text-text-mid">{s.detail}</p>}
                  </div>
                </li>
              ))}
            </ul>
          </div>
        </section>

        {/* WHEN TO CALL HIM — highest-converting: ruled rows, raised */}
        <section className="py-8">
          <div className="rounded-xl border border-hairline bg-surface-2 p-6 sm:p-8">
            <h2 className="font-display text-2xl font-semibold tracking-tight">When to call him</h2>
            <p className="mt-2 text-text-mid">
              These are the questions he can answer and we cannot — the ones that turn on your specific
              facts, where an answer is legal advice:
            </p>
            <ul className="mt-4 divide-y divide-hairline border-y border-hairline">
              {partner.qualifyingQuestions.map((q) => (
                <li key={q} className="flex gap-3 py-3 text-text-mid">
                  <span className="mt-1 shrink-0 font-mono text-sm text-brass" aria-hidden>?</span>
                  <span>{q}</span>
                </li>
              ))}
            </ul>
          </div>
        </section>
      </div>

      {/* HOW IT WORKS — full-bleed strip */}
      <section className="border-y border-hairline bg-surface-2/40">
        <div className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
          <h2 className="font-display text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-6 grid gap-4 sm:grid-cols-3">
            {[
              { n: "1", t: "Send a brief request", d: "Tell us what you need to discuss. We forward it to him — nothing you send is privileged, so leave documents for the call." },
              { n: "2", t: "He runs his own intake", d: "He reviews each request personally, then performs his own conflicts check and intake. We are not in the middle and never see his file." },
              { n: "3", t: "He bills you directly", d: `You pay his office at his own rate (${rate}). We receive no share of his fees and no referral fee.` },
            ].map((step) => (
              <li key={step.n} className="rounded-xl border border-hairline bg-card p-5">
                <p className="font-mono text-signal">{step.n}</p>
                <p className="mt-2 font-display font-semibold text-text-hi">{step.t}</p>
                <p className="mt-1 text-sm text-text-mid">{step.d}</p>
              </li>
            ))}
          </ol>
        </div>
      </section>

      {/* FAQ */}
      {partner.faqs.length > 0 && <FaqBlock faqs={partner.faqs.map((f) => ({ q: f.q, a: f.a }))} />}

      {/* CTA BAND — full-bleed */}
      <section className="border-y border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="text-text-mid">
            <span className="font-medium text-text-hi">{rate}</span> · billed by his office
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild size="lg">
              <Link href={consult}>Request a consultation</Link>
            </Button>
          </div>
          <p className="mt-4 text-sm text-text-low">
            Every request reaches him through us and is not privileged — leave documents and
            anything confidential for the call.
          </p>
        </div>
      </section>

      {/* DISCLAIMERS */}
      <section className="border-b border-hairline">
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-10 sm:px-6">
          <p className="text-xs leading-relaxed text-text-low">{INDEPENDENCE_DISCLAIMER}</p>
          <p className="text-xs leading-relaxed text-text-low">{brand.disclaimer}</p>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Do I need a lawyer?", href: "/do-i-need-a-lawyer" },
          { label: "If your NYC gun license is denied", href: "/denied-appeal" },
          { label: "Attorneys we refer you to", href: "/partners" },
          { label: "Contact our team", href: "/contact" },
        ]}
      />
    </>
  )
}

/**
 * The hero portrait: the tonal wash as the panel background, a hairline border + a thin
 * brass keyline, the cut-out figure seated (bottom-aligned) inside it, and a caption
 * card overlapping the inner edge — so the composition reads as built, not placed.
 * Falls back to the plain portrait when the cutout/panel assets aren't set.
 */
function HeroPortrait({ partner }: { partner: Partner }) {
  const figure = partner.photo.cutout ?? partner.photo.src
  return (
    <div className="relative mx-auto aspect-[4/5] w-full max-w-sm overflow-hidden rounded-md border border-hairline bg-gradient-to-br from-surface-2 to-surface-1 lg:mx-0">
      {partner.photo.panel && (
        <Image src={partner.photo.panel} alt="" fill sizes="(min-width: 1024px) 22rem, 90vw" className="object-cover" />
      )}
      <div className="pointer-events-none absolute inset-0 rounded-md ring-1 ring-inset ring-brass/30" aria-hidden />
      <div className="absolute inset-x-0 bottom-0 flex justify-center">
        <Image
          src={figure}
          alt={partner.photo.alt}
          width={760}
          height={905}
          priority
          sizes="(min-width: 1024px) 22rem, 90vw"
          className="h-auto w-[88%] self-end object-contain"
        />
      </div>
      <div className="absolute bottom-3 left-3 max-w-[80%] rounded-md border border-hairline bg-card/90 px-3 py-2 backdrop-blur">
        <p className="font-display text-sm font-semibold leading-tight text-text-hi">{partnerFullName(partner)}</p>
        <p className="mt-0.5 text-xs text-text-low">{partner.firm}</p>
      </div>
    </div>
  )
}

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="engraved text-text-low">{label}</dt>
      <dd className="text-text-hi">{value}</dd>
    </div>
  )
}
