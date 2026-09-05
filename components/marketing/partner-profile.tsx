import Image from "next/image"
import { brand } from "@/config/brand"
import { type Partner, partnerPath, partnerFullName, partnerSchedule } from "@/config/partners"
import { Button } from "@/components/ui/button"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { JsonLd, attorneyProfileSchema } from "@/components/marketing/json-ld"
import { FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"
import { INDEPENDENCE_DISCLAIMER } from "@/components/marketing/partner-card"

/**
 * The full attorney-referral profile body — rendered by BOTH the vanity route
 * (/{slug}) and the general /partners/[slug] route, from config only. Internal-facing
 * copy never implies he is our employee, our counsel, or that hiring him improves odds;
 * the independence disclaimer + the standing brand disclaimer both render at the foot.
 */
export function PartnerProfile({ partner }: { partner: Partner }) {
  const schedule = partnerSchedule(partner)
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

      {/* 2 — PROFILE HERO */}
      <section className="relative overflow-hidden border-b border-hairline">
        <div className="mx-auto grid max-w-6xl gap-10 px-4 py-14 sm:px-6 lg:grid-cols-[1fr_20rem] lg:py-20">
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
              <li className="rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-xs text-text-mid">
                {partner.yearsInPractice} years in practice
              </li>
              {partner.honors.map((h) => (
                <li key={h.label} className="rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-xs text-text-mid">
                  {h.label}
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap gap-3">
              <Button asChild size="lg">
                {schedule.external ? (
                  <a href={schedule.href} target="_blank" rel="noreferrer">
                    {schedule.label} · {rate}
                  </a>
                ) : (
                  <a href={schedule.href}>{schedule.label} · {rate}</a>
                )}
              </Button>
              <Button asChild variant="outline" size="lg">
                <a href={partner.website} target="_blank" rel="noreferrer">
                  Visit his firm&apos;s site
                </a>
              </Button>
            </div>
          </div>

          <div className="lg:pt-1">
            <div className="rounded-2xl border border-hairline bg-gradient-to-br from-surface-2 to-surface-1 p-3">
              <Image
                src={partner.photo.src}
                alt={partner.photo.alt}
                width={320}
                height={400}
                sizes="(min-width: 1024px) 20rem, 100vw"
                priority
                className="h-auto w-full rounded-xl object-cover"
              />
            </div>
          </div>
        </div>
      </section>

      <div className="mx-auto max-w-3xl px-4 sm:px-6">
        {/* 3 — BACKGROUND */}
        <section className="py-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Background</h2>
          <div className="mt-3 max-w-[65ch] space-y-4 text-text-mid">
            {partner.bio.map((para, i) => (
              <p key={i}>{para}</p>
            ))}
          </div>
        </section>

        {/* 4 — CREDENTIALS */}
        <section className="border-t border-hairline py-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">Credentials</h2>
          <dl className="mt-5 divide-y divide-hairline">
            <CredRow label="Admissions" value={partner.admissions.join(", ")} />
            <CredRow
              label="Education"
              value={partner.education.map((e) => `${e.label}${e.detail ? ` (${e.detail})` : ""}`).join(" · ")}
            />
            <CredRow
              label="Honors"
              value={partner.honors.map((h) => `${h.label}${h.detail ? ` (${h.detail})` : ""}`).join(" · ")}
            />
            <CredRow label="Serves" value={partner.serves.join(", ")} />
            <CredRow label="Years in practice" value={String(partner.yearsInPractice)} />
          </dl>
        </section>

        {/* 5 — WHAT HE HANDLES */}
        <section className="border-t border-hairline py-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">What he handles for our applicants</h2>
          <ul className="mt-5 space-y-3">
            {partner.services.map((s) => (
              <li key={s.title} className="rounded-lg border border-hairline bg-card p-4">
                <p className="font-medium text-text-hi">{s.title}</p>
                {s.detail && <p className="mt-1 text-sm text-text-mid">{s.detail}</p>}
              </li>
            ))}
          </ul>
        </section>

        {/* 6 — WHEN TO CALL HIM */}
        <section className="border-t border-hairline py-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">When to call him</h2>
          <p className="mt-2 text-text-mid">
            These are the questions he can answer and we cannot — the ones that turn on your specific
            facts, where an answer is legal advice:
          </p>
          <ul className="mt-4 space-y-2">
            {partner.qualifyingQuestions.map((q) => (
              <li key={q} className="flex gap-3 text-text-mid">
                <span className="mt-1 shrink-0 text-signal">&bull;</span>
                <span>{q}</span>
              </li>
            ))}
          </ul>
        </section>

        {/* 7 — HOW IT WORKS */}
        <section className="border-t border-hairline py-10">
          <h2 className="font-display text-2xl font-semibold tracking-tight">How it works</h2>
          <ol className="mt-5 grid gap-4 sm:grid-cols-3">
            {[
              { n: "1", t: "Reach out to his office", d: `${schedule.external ? "Book on his calendar" : "Call his office"} directly — the conversation is between you and his firm.` },
              { n: "2", t: "He runs his own intake", d: "He performs his own conflicts check and intake. We are not in the middle and never see his file." },
              { n: "3", t: "He bills you directly", d: `You pay his office at his own rate (${rate}). We receive no share of his fees and no referral fee.` },
            ].map((step) => (
              <li key={step.n} className="rounded-xl border border-hairline bg-card p-5">
                <p className="font-mono text-signal">{step.n}</p>
                <p className="mt-2 font-display font-semibold text-text-hi">{step.t}</p>
                <p className="mt-1 text-sm text-text-mid">{step.d}</p>
              </li>
            ))}
          </ol>
        </section>
      </div>

      {/* 8 — FAQ */}
      {partner.faqs.length > 0 && <FaqBlock faqs={partner.faqs.map((f) => ({ q: f.q, a: f.a }))} />}

      {/* 9 — CTA BAND */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="text-text-mid">
            <span className="font-medium text-text-hi">{rate}</span> · billed by his office
          </p>
          <div className="mt-4 flex justify-center">
            <Button asChild size="lg">
              {schedule.external ? (
                <a href={schedule.href} target="_blank" rel="noreferrer">{schedule.label}</a>
              ) : (
                <a href={schedule.href}>{schedule.label}</a>
              )}
            </Button>
          </div>
          <p className="mt-4 text-sm text-text-low">
            <a href={`tel:${partner.phone.replace(/[^0-9+]/g, "")}`} className="text-signal hover:underline">{partner.phone}</a>
            {" · "}
            <a href={`mailto:${partner.email}`} className="text-signal hover:underline">{partner.email}</a>
          </p>
        </div>
      </section>

      {/* 10 — DISCLAIMERS */}
      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl space-y-3 px-4 py-10 sm:px-6">
          <p className="text-xs leading-relaxed text-text-low">{INDEPENDENCE_DISCLAIMER}</p>
          <p className="text-xs leading-relaxed text-text-low">{brand.disclaimer}</p>
        </div>
      </section>

      {/* 11 — RELATED LINKS */}
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

function CredRow({ label, value }: { label: string; value: string }) {
  return (
    <div className="grid gap-1 py-3 sm:grid-cols-[10rem_1fr]">
      <dt className="engraved text-text-low">{label}</dt>
      <dd className="text-text-hi">{value}</dd>
    </div>
  )
}
