import Link from "next/link"
import { ArrowRight, Check, ClipboardList, UsersRound } from "lucide-react"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import type { WizardAnswers } from "@/lib/intake/answers"
import { Button } from "@/components/ui/button"
import { FormsSigning } from "@/components/portal/forms-signing"
import { FilingPackDownload } from "@/components/portal/filing-pack-download"
import { DeepLinkHighlight } from "@/components/portal/concierge/deep-link-highlight"
import { buildPortalForms } from "@/lib/forms/portal-forms"
import { getFilingPackOutstanding } from "@/lib/filing-pack/readiness-server"

export const metadata = { title: "Your forms" }

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ gate?: string }>
}) {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const db = await createClient()
  const [{ data: session }, { data: sig }, { data: requirements }, readiness, query] = await Promise.all([
    db.from("intake_sessions").select("answers, completed_at").eq("case_id", myCase.id).maybeSingle(),
    db.from("signatures").select("png_base64").eq("case_id", myCase.id).eq("signer_key", "applicant").maybeSingle(),
    db.from("case_requirements").select("req_code, status").eq("case_id", myCase.id),
    getFilingPackOutstanding(db, myCase),
    searchParams,
  ])
  const answers = (session?.answers ?? {}) as WizardAnswers
  const statusByRequirement = new Map((requirements ?? []).map((row) => [row.req_code, row.status]))
  const docs = buildPortalForms(answers, statusByRequirement)

  return (
    <div className="forms-page">
      <DeepLinkHighlight />
      <header className="forms-page-header">
        <span className="portal-t-eyebrow">Prepared for you</span>
        <h1>Your forms</h1>
        <p>Pre-filled from your answers. Your signature goes on automatically — sign &amp; file in one tap, or download the ones that need a notary or witness.</p>
      </header>

      {!session?.completed_at && (
        <section className="forms-intake-reminder">
          <span aria-hidden><ClipboardList /></span>
          <p><strong>Finish your intake first</strong><small>so every form comes out fully pre-filled.</small></p>
          <Button asChild><Link href="/portal/intake">Finish intake <ArrowRight aria-hidden /></Link></Button>
        </section>
      )}

      <section className="forms-pack-hero">
        <div className="forms-pack-illustration" aria-hidden>
          <span className="forms-pack-page forms-pack-page-back" />
          <span className="forms-pack-page forms-pack-page-middle" />
          <span className="forms-pack-page forms-pack-page-front">
            <i /><i /><i /><i /><b>PDF</b>
          </span>
        </div>
        <div className="forms-pack-content">
          <span className="portal-t-eyebrow">Your filing pack</span>
          <h2>Everything for the NYPD portal, in one PDF</h2>
          <ul>
            <li><Check aria-hidden /> The answers in the portal&apos;s own order</li>
            <li><Check aria-hidden /> Which document goes where</li>
            <li><Check aria-hidden /> All your assembled documents</li>
          </ul>
          <p>On Self-Guided you prepare and submit it yourself; with Full Concierge we prepare and organize it — you review and submit your own application.</p>
          <div className="forms-pack-actions">
            <FilingPackDownload initialReadiness={readiness} initialOpen={query.gate === "1"} />
            <a href="/portal/packet" target="_blank" rel="noreferrer">Just the documents <ArrowRight aria-hidden /></a>
          </div>
        </div>
      </section>

      <FormsSigning docs={docs} signaturePng={sig?.png_base64 ?? null} applicantName={myCase.client.full_name} />

      <aside className="forms-people-note">
        <span aria-hidden><UsersRound /></span>
        <p>Character references and household affidavits are on the <Link href="/portal/people">People</Link> page — each person gets their own private link, so you don&apos;t prepare those.</p>
      </aside>
    </div>
  )
}
