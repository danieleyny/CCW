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
import { getLocale, getMessages } from "@/lib/i18n"

export const metadata = { title: "Your forms" }

export default async function FormsPage({
  searchParams,
}: {
  searchParams: Promise<{ gate?: string }>
}) {
  const [myCase, locale, t] = await Promise.all([getMyCase(), getLocale(), getMessages()])
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        {t.common.noCase}
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
        <span className="portal-t-eyebrow">{t.pages.formsEyebrow}</span>
        <h1>{t.pages.formsTitle}</h1>
        <p>{t.pages.formsLede}</p>
      </header>

      {!session?.completed_at && (
        <section className="forms-intake-reminder">
          <span aria-hidden><ClipboardList /></span>
          <p><strong>{t.pages.finishIntakeTitle}</strong><small>{t.pages.finishIntakeDetail}</small></p>
          <Button asChild><Link href="/portal/intake">{t.pages.finishIntake} <ArrowRight aria-hidden /></Link></Button>
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
          <span className="portal-t-eyebrow">{t.pages.filingPackEyebrow}</span>
          <h2>{t.pages.filingPackTitle}</h2>
          <ul>
            <li><Check aria-hidden /> {t.pages.filingPackAnswerOrder}</li>
            <li><Check aria-hidden /> {t.pages.filingPackDocumentOrder}</li>
            <li><Check aria-hidden /> {t.pages.filingPackDocuments}</li>
          </ul>
          <p>{t.pages.filingPackMode}</p>
          {locale !== "en" ? <small>{t.common.legalEnglishNotice}</small> : null}
          <div className="forms-pack-actions">
            <FilingPackDownload initialReadiness={readiness} initialOpen={query.gate === "1"} />
            <a href="/portal/packet" target="_blank" rel="noreferrer">{t.pages.documentsOnly} <ArrowRight aria-hidden /></a>
          </div>
        </div>
      </section>

      <FormsSigning docs={docs} signaturePng={sig?.png_base64 ?? null} applicantName={myCase.client.full_name} />

      <aside className="forms-people-note">
        <span aria-hidden><UsersRound /></span>
        <p>{t.pages.peopleNotePrefix} <Link href="/portal/people">{t.pages.peopleNoteLink}</Link> {t.pages.peopleNoteSuffix}</p>
      </aside>
    </div>
  )
}
