import Link from "next/link"
import { ShieldAlert, Eye, ArrowRight } from "lucide-react"
import { createClient } from "@/lib/supabase/server"

/**
 * Applicant-side surfacing of a sponsorship. An INVITED-but-not-consented
 * sponsorship gets a prominent card (consent gates all sponsor visibility, so it
 * must be reachable); an active one gets a quiet "who can see your file" link.
 * Renders nothing when there's no sponsorship. Server component — RLS scopes the
 * read to the case owner.
 */
export async function SponsorBanner({ caseId }: { caseId: string }) {
  const db = await createClient()
  const { data: rows } = await db
    .from("case_sponsorships")
    .select("status, applicant_consented_at, revoked_at, invited_name, invited_email, sponsor:sponsors(legal_name)")
    .eq("case_id", caseId)
  if (!rows || rows.length === 0) return null

  const pending = rows.find((s) => !s.applicant_consented_at && !s.revoked_at)
  const active = rows.find((s) => s.applicant_consented_at && !s.revoked_at && s.status === "active")

  if (pending) {
    const company = (pending.sponsor as unknown as { legal_name: string } | null)?.legal_name ?? "A company"
    const rep = pending.invited_name ?? pending.invited_email
    return (
      <Link
        href="/portal/sponsor"
        className="brass-edge block rounded-lg border border-brass/40 bg-brass/8 p-5 transition-colors hover:bg-brass/12"
      >
        <div className="flex items-start gap-2">
          <ShieldAlert className="mt-0.5 size-5 shrink-0 text-brass" />
          <div className="min-w-0">
            <div className="engraved text-brass">Your sponsor needs your OK</div>
            <h2 className="mt-1 text-lg font-semibold tracking-tight">
              {rep} of {company} wants to help with your file
            </h2>
            <p className="mt-1 text-sm text-text-mid">
              Review exactly what they&apos;d be able to see, then decide.{" "}
              <span className="inline-flex items-center gap-1 text-brass">
                Review &amp; decide <ArrowRight className="size-3.5" />
              </span>
            </p>
          </div>
        </div>
      </Link>
    )
  }

  if (active) {
    return (
      <Link
        href="/portal/sponsor"
        className="flex items-center gap-2 rounded-lg border border-hairline bg-card px-4 py-3 text-sm text-text-mid transition-colors hover:text-foreground"
      >
        <Eye className="size-4 text-text-low" />
        Who can see your file — manage sponsor access
        <ArrowRight className="ml-auto size-4" />
      </Link>
    )
  }

  return null
}
