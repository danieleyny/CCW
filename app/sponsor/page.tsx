import Link from "next/link"
import { ArrowRight, FolderOpen } from "lucide-react"
import { loadSponsorCases } from "@/lib/sponsor/queries"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

export const metadata = { title: "Your sponsored files", robots: { index: false, follow: false } }

const TRACK_LABEL: Record<string, string> = {
  carry_guard: "NYPD Carry Guard",
  special_carry_guard: "NYPD Special Carry Guard",
  sponsored_unresolved: "NYPD armed guard (category being confirmed)",
  concealed_carry: "NYPD licence",
}

/**
 * The rep's case list. A neutral empty state that neither confirms nor denies any
 * case exists for an email — a sponsor with no active, consented binding sees the
 * same thing whether or not a case is out there.
 */
export default async function SponsorHome() {
  const cases = await loadSponsorCases()

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Sponsor portal</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your sponsored files</h1>
      </div>

      {cases.length === 0 ? (
        <div className="rounded-lg border border-hairline bg-card p-6 text-sm text-text-mid">
          <FolderOpen className="mb-2 size-5 text-text-low" />
          You don&apos;t have any active files right now. A file appears here once the applicant has
          consented to your access. If you&apos;re expecting one, check with your Gun License NYC contact.
        </div>
      ) : (
        <ul className="space-y-3">
          {cases.map((c) => (
            <li key={c.case_id}>
              <Link
                href={`/sponsor/${c.case_id}`}
                className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-card p-4 transition-colors hover:border-brass/40"
              >
                <div className="min-w-0">
                  <div className="font-medium">{c.applicant_name}</div>
                  <div className="mt-0.5 text-sm text-text-mid">{TRACK_LABEL[c.license_track] ?? c.license_track}</div>
                </div>
                <ArrowRight className="size-4 shrink-0 text-text-low" />
              </Link>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
