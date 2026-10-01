import { redirect } from "next/navigation"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { ConsentScreen } from "@/components/portal/sponsor/consent-screen"
import { WhoCanSee } from "@/components/portal/sponsor/who-can-see"
import { decideSponsorPage } from "@/lib/portal/sponsor-routing"

export const metadata = { title: "Who can see your file", robots: { index: false, follow: false } }

/**
 * The applicant's control over a sponsor's access. A sponsored case surfaces this;
 * every other case shows nothing (redirect home). The rep's name lives on
 * case_sponsorships.invited_name because profiles RLS hides other people's names.
 */
export default async function PortalSponsorPage() {
  const myCase = await getMyCase()
  if (!myCase) redirect("/portal")

  const db = await createClient()
  // No `.order("created_at")` here: the applicant-side banner runs the same RLS-scoped
  // read WITHOUT it and works, so ordering was the one difference that could null the
  // result (a bad order/embed makes PostgREST return `data: null`). There is at most a
  // handful of sponsorships per case, so ordering buys nothing.
  const { data: sponsorships, error } = await db
    .from("case_sponsorships")
    .select("id, status, scope, applicant_consented_at, invited_email, invited_name, revoked_at, sponsor:sponsors(legal_name)")
    .eq("case_id", myCase.id)

  // NEVER silently bounce from a route the UI just linked to. A query ERROR is not the
  // same as "no sponsorship" — treating it as such is exactly why this survived to
  // production. Surface it; the applicant can retry rather than be dumped back home.
  const rows = sponsorships ?? []
  const outcome = decideSponsorPage({ hasError: !!error, rowCount: rows.length })
  if (outcome === "error") {
    console.error(`[portal/sponsor] sponsorship query failed for case ${myCase.id}:`, error?.message)
    return (
      <div className="space-y-4">
        <div>
          <SectionEyebrow>Your sponsor</SectionEyebrow>
          <h1 className="mt-2 text-2xl font-semibold tracking-tight">Who can see your file</h1>
        </div>
        <div className="rounded-lg border border-hairline bg-card p-5 text-sm text-text-mid">
          We couldn&apos;t load your sponsor details just now. Please refresh — if it keeps happening,
          reach out to your Gun License NYC contact.
        </div>
      </div>
    )
  }

  if (outcome === "redirect") {
    console.warn(`[portal/sponsor] no sponsorship on case ${myCase.id} — redirecting home`)
    redirect("/portal")
  }

  // Read trail — every sensitive read a rep has made, newest first.
  const { data: trail } = await db
    .from("document_access_log")
    .select("id, req_code, action, created_at, viewer_role")
    .eq("case_id", myCase.id)
    .order("created_at", { ascending: false })
    .limit(50)

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Your sponsor</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Who can see your file</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          A company is sponsoring your armed-guard licence. You decide what their representative can see,
          and you can withdraw it at any time.
        </p>
      </div>

      {rows.map((s) => {
        const company = (s.sponsor as unknown as { legal_name: string } | null)?.legal_name ?? "your sponsor"
        const rep = s.invited_name ?? s.invited_email
        const consented = !!s.applicant_consented_at && !s.revoked_at && s.status === "active"
        return consented ? (
          <WhoCanSee
            key={s.id}
            sponsorshipId={s.id}
            company={company}
            rep={rep}
            scope={s.scope}
            consentedAt={s.applicant_consented_at as string}
            trail={(trail ?? []).map((t) => ({
              id: t.id,
              reqCode: t.req_code,
              action: t.action,
              at: t.created_at,
            }))}
          />
        ) : (
          <ConsentScreen key={s.id} sponsorshipId={s.id} company={company} rep={rep} />
        )
      })}
    </div>
  )
}
