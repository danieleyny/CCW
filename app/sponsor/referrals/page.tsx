import { loadReferralChannel } from "@/lib/referral/queries"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { stageMeta, type CaseStageKey } from "@/config/stages"

export const metadata = { title: "Referrals", robots: { index: false, follow: false } }

/**
 * The referral CHANNEL view. A company that INTRODUCES personal-carry applicants is not
 * a sponsor: a personal application is the applicant's alone, so this shows AGGREGATE
 * counts only, and per-person status ONLY as a stage label for someone who explicitly
 * consented — never a name, a requirement, a document or a disclosure. It reads nothing
 * from the sponsored-case surface. The empty state is identical whether or not any case
 * exists for you.
 */
export default async function SponsorReferralsPage() {
  const { stats, consented } = await loadReferralChannel()

  const tiles = [
    { label: "Introduced", value: stats.introduced },
    { label: "Signed up", value: stats.signedUp },
    { label: "Completed", value: stats.completed },
  ]

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Channel · referrals</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">People you introduced</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          These are personal firearm-licence applications, which belong to the applicant alone. You see how
          many people you introduced and how they&apos;re progressing in aggregate. An individual&apos;s status
          appears only if that person chooses to share it, and only as a stage — never their documents,
          answers, or name.
        </p>
      </div>

      <div className="grid grid-cols-3 gap-3">
        {tiles.map((t) => (
          <div key={t.label} className="rounded-lg border border-hairline bg-card p-4">
            <div className="text-2xl font-semibold tabular-nums">{t.value}</div>
            <div className="engraved mt-1 text-[11px] text-text-mid">{t.label}</div>
          </div>
        ))}
      </div>

      <section className="space-y-3">
        <h2 className="text-lg font-semibold tracking-tight">Shared progress</h2>
        {consented.length === 0 ? (
          <p className="rounded-lg border border-hairline bg-card p-4 text-sm text-text-mid">
            No one has chosen to share their individual progress with you. That&apos;s the default — a personal
            application is private. You&apos;ll see a stage here only for someone who opts in.
          </p>
        ) : (
          <ul className="space-y-2">
            {consented.map((c, i) => (
              <li key={c.caseId} className="flex items-center justify-between rounded-lg border border-hairline bg-card p-4 text-sm">
                {/* Deliberately no name — an opt-in applicant is shown only by position + stage. */}
                <span className="text-text-mid">Applicant {i + 1}</span>
                <span className="rounded-full bg-brass/10 px-2 py-0.5 text-[11px] text-brass">
                  {stageMeta(c.stage as CaseStageKey)?.label ?? c.stage}
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  )
}
