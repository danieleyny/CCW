import Link from "next/link"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { type Partner, partnerPath, partnerFullName, partnerSchedule } from "@/config/partners"

/**
 * The reusable partner card — directory today, anywhere a partner is surfaced later.
 * The independence disclaimer is PART OF THIS COMPONENT (not the page) so it can never
 * be forgotten anywhere the card is reused.
 */

/** Verbatim, non-negotiable. Renders under every card. */
export const INDEPENDENCE_DISCLAIMER =
  "Independent attorney — not an employee or agent of Gun License NYC. Retaining him creates an attorney–client relationship with his firm alone. We receive no share of his fees. Nothing here is legal advice."

export function PartnerCard({ partner }: { partner: Partner }) {
  const schedule = partnerSchedule(partner)
  const rate = `$${partner.rate.amount}/${partner.rate.unit}`

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-hairline bg-card">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,14rem)_1fr]">
          {/* LEFT — portrait + compact credentials */}
          <div>
            <div className="overflow-hidden rounded-xl border border-hairline bg-surface-2">
              <Image
                src={partner.photo.src}
                alt={partner.photo.alt}
                width={280}
                height={350}
                sizes="(min-width: 768px) 14rem, 100vw"
                className="h-auto w-full object-cover"
              />
            </div>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div>
                <dt className="engraved text-text-low">Admitted</dt>
                <dd className="mt-0.5 text-text-hi">{partner.admissions.join(", ")}</dd>
              </div>
              {partner.education.map((e) => (
                <div key={e.label}>
                  <dt className="engraved text-text-low">{e.label.split(",")[0]}</dt>
                  <dd className="mt-0.5 text-text-hi">
                    {e.label.split(",").slice(1).join(",").trim()}
                    {e.detail ? ` · ${e.detail}` : ""}
                  </dd>
                </div>
              ))}
              <div>
                <dt className="engraved text-text-low">Serves</dt>
                <dd className="mt-0.5 text-text-hi">{partner.serves.join(", ")}</dd>
              </div>
            </dl>
          </div>

          {/* RIGHT — identity, badges, bio, services */}
          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-text-hi">
              {partnerFullName(partner)}
            </h2>
            <p className="mt-1 text-sm text-brass">
              {partner.firm} · {partner.role}
            </p>
            <p className="mt-1 text-sm text-text-low">
              {partner.address.street}, {partner.address.city}, {partner.address.state} {partner.address.zip}
            </p>

            <ul className="mt-4 flex flex-wrap gap-2">
              <li className="rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-xs text-text-mid">
                {partner.yearsInPractice} years in practice
              </li>
              {partner.honors.map((h) => (
                <li key={h.label} className="rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-xs text-text-mid">
                  {h.label}
                </li>
              ))}
            </ul>

            {partner.bio[0] && <p className="mt-4 text-text-mid">{partner.bio[0]}</p>}

            <p className="mt-5 engraved text-brass">What he handles for our applicants</p>
            <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-sm text-text-mid sm:grid-cols-2">
              {partner.services.map((s) => (
                <li key={s.title} className="flex gap-2">
                  <span className="text-signal">·</span>
                  <span>{s.title}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
              <p className="text-sm text-text-low">
                <span className="font-medium text-text-hi">{rate}</span> · billed by his office
              </p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={partnerPath(partner)}>Read his background</Link>
                </Button>
                <Button asChild size="sm">
                  {schedule.external ? (
                    <a href={schedule.href} target="_blank" rel="noreferrer">
                      {schedule.label}
                    </a>
                  ) : (
                    <a href={schedule.href}>{schedule.label}</a>
                  )}
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 px-1 text-xs leading-relaxed text-text-low">{INDEPENDENCE_DISCLAIMER}</p>
    </div>
  )
}
