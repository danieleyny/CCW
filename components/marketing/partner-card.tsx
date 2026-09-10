import Link from "next/link"
import Image from "next/image"
import { type Partner, partnerPath, partnerFullName, partnerConsultationPath } from "@/config/partners"

/**
 * The reusable partner card — directory today, anywhere a partner is surfaced later.
 * The independence disclaimer is PART OF THIS COMPONENT (not the page) so it can never
 * be forgotten anywhere the card is reused.
 */

/** Verbatim, non-negotiable. Renders under every card. */
export const INDEPENDENCE_DISCLAIMER =
  "Independent attorney — not an employee or agent of Gun License NYC. Retaining him creates an attorney–client relationship with his firm alone. We receive no share of his fees. Nothing here is legal advice."

/** Two-tier credential badge — electric-tinted lead vs quiet outline; small radius, not a pill. */
export function CredentialBadge({ children, primary }: { children: React.ReactNode; primary?: boolean }) {
  return (
    <li
      className={
        primary
          ? "rounded-sm border border-[var(--electric)]/40 bg-[var(--electric)]/10 px-2.5 py-1 text-xs font-medium text-[var(--electric-deep)]"
          : "rounded-sm border border-[var(--rule)] bg-[var(--ivory)] px-2.5 py-1 text-xs text-[var(--ink-soft)]"
      }
    >
      {children}
    </li>
  )
}

export function PartnerCard({ partner }: { partner: Partner }) {
  const rate = `$${partner.rate.amount}/${partner.rate.unit}`

  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-[var(--rule)] bg-[var(--paper)] shadow-[0_18px_48px_rgba(7,17,31,0.09)]">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,13rem)_1fr]">
          {/* LEFT — portrait + compact credentials */}
          <div>
            <div className="overflow-hidden rounded-md border border-[var(--rule)] bg-[var(--ivory)]">
              <Image
                src={partner.photo.src}
                alt={partner.photo.alt}
                width={280}
                height={350}
                sizes="(min-width: 768px) 13rem, 100vw"
                className="h-auto w-full object-cover"
              />
            </div>
            <dl className="mt-4 space-y-2.5 text-sm">
              <div>
                <dt
                  style={{ fontFamily: "var(--mono)" }}
                  className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]"
                >
                  Admitted
                </dt>
                <dd className="mt-0.5 text-[var(--ink)]">{partner.admissions.join(", ")}</dd>
              </div>
              {partner.education.map((e) => (
                <div key={e.term}>
                  <dt
                    style={{ fontFamily: "var(--mono)" }}
                    className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]"
                  >
                    {e.term}
                  </dt>
                  <dd className="mt-0.5 text-[var(--ink)]">
                    {e.value}
                    {e.detail ? ` · ${e.detail}` : ""}
                  </dd>
                </div>
              ))}
              <div>
                <dt
                  style={{ fontFamily: "var(--mono)" }}
                  className="text-[10px] uppercase tracking-[0.12em] text-[var(--ink-muted)]"
                >
                  Serves
                </dt>
                <dd className="mt-0.5 text-[var(--ink)]">{partner.serves.join(", ")}</dd>
              </div>
            </dl>
          </div>

          {/* RIGHT — identity, badges, bio, services */}
          <div className="min-w-0">
            <h2
              style={{ fontFamily: "var(--display)" }}
              className="text-2xl font-semibold tracking-tight text-[var(--ink)]"
            >
              {partnerFullName(partner)}
            </h2>
            <p className="mt-1 text-sm text-[var(--electric-deep)]">
              {partner.firm} · {partner.role}
            </p>
            <p className="mt-1 text-sm text-[var(--ink-muted)]">
              {partner.address.street}, {partner.address.city}, {partner.address.state} {partner.address.zip}
            </p>

            <ul className="mt-4 flex flex-wrap gap-2">
              <CredentialBadge primary>{partner.yearsInPractice} years in practice</CredentialBadge>
              {partner.honors.map((h) => (
                <CredentialBadge key={h.label} primary={h.tier === "primary"}>
                  {h.label}
                </CredentialBadge>
              ))}
            </ul>

            {partner.bio[0] && <p className="mt-4 text-[var(--ink-soft)]">{partner.bio[0]}</p>}

            <p
              style={{ fontFamily: "var(--mono)" }}
              className="mt-5 text-[10px] uppercase tracking-[0.12em] text-[var(--electric-deep)]"
            >
              What he handles for our applicants
            </p>
            <ul className="mt-2 grid gap-x-6 gap-y-1.5 text-sm text-[var(--ink-soft)] sm:grid-cols-2">
              {partner.services.map((s) => (
                <li key={s.title} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-[1px] bg-[var(--electric)]" aria-hidden />
                  <span>{s.title}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[var(--rule)] pt-4">
              <p className="text-sm text-[var(--ink-muted)]">
                <span className="font-medium text-[var(--ink)]">{rate}</span> · billed by his office
              </p>
              <div className="flex flex-wrap gap-2">
                <Link className="button button-outline" href={partnerPath(partner)}>
                  Read his background
                </Link>
                <Link className="button" href={partnerConsultationPath(partner)}>
                  Request a consultation
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>

      <p className="mt-2 px-1 text-xs leading-relaxed text-[var(--ink-muted)]">{INDEPENDENCE_DISCLAIMER}</p>
    </div>
  )
}
