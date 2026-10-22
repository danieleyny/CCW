import Link from "next/link"
import type { TrainingPartner } from "@/config/training-partners"
import { trainingPartnerPath } from "@/config/training-partners"
import { Button } from "@/components/ui/button"

export const TRAINING_INDEPENDENCE_DISCLAIMER =
  "Independent training provider — not an employee or agent of Gun License NYC. Training is arranged and paid for directly with 50B. Completion of training does not determine a license outcome."

export function TrainingPartnerCard({ partner }: { partner: TrainingPartner }) {
  return (
    <div>
      <div className="overflow-hidden rounded-xl border border-hairline bg-card shadow-[0_18px_50px_-32px_rgba(0,0,0,0.45)]">
        <div className="grid gap-6 p-6 md:grid-cols-[minmax(0,13rem)_1fr]">
          <div className="flex min-h-52 flex-col justify-between rounded-md border border-hairline bg-[radial-gradient(circle_at_25%_25%,rgba(208,167,76,0.22),transparent_38%),linear-gradient(135deg,var(--surface-2),var(--surface-1))] p-5">
            <span className="engraved text-text-low">Independent training provider</span>
            <div>
              <p className="font-display text-5xl font-semibold tracking-tight text-text-hi">{partner.initials}</p>
              <p className="mt-2 text-sm text-text-mid">{partner.location}</p>
            </div>
          </div>

          <div className="min-w-0">
            <h2 className="font-display text-2xl font-semibold tracking-tight text-text-hi">{partner.name}</h2>
            <p className="mt-1 text-sm text-brass">{partner.firm} · {partner.role}</p>
            <p className="mt-4 text-text-mid">{partner.headline}</p>

            <ul className="mt-5 grid gap-x-6 gap-y-2 text-sm text-text-mid sm:grid-cols-2">
              {partner.services.map((service) => (
                <li key={service.title} className="flex gap-2">
                  <span className="mt-1.5 size-1.5 shrink-0 rounded-[1px] bg-brass" aria-hidden />
                  <span>{service.title}</span>
                </li>
              ))}
            </ul>

            <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-hairline pt-4">
              <p className="text-sm text-text-low">Independent instruction · direct enrollment with 50B</p>
              <div className="flex flex-wrap gap-2">
                <Button asChild variant="outline" size="sm">
                  <Link href={trainingPartnerPath(partner)}>View training profile</Link>
                </Button>
                <Button asChild size="sm">
                  <a href={partner.website} target="_blank" rel="noreferrer">View 50B classes ↗</a>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
      <p className="mt-2 px-1 text-xs leading-relaxed text-text-low">{TRAINING_INDEPENDENCE_DISCLAIMER}</p>
    </div>
  )
}
