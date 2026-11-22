import Link from "next/link"
import { ArrowRight, Check, Download, FileX2, Scale, Stamp, X } from "lucide-react"
import type { LucideIcon } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { AppealReferralButton } from "@/components/portal/appeal-referral"
import { formatDate, daysSince } from "@/lib/format"
import { getLocale, getMessages } from "@/lib/i18n"
import { interpolate } from "@/lib/i18n/interpolate"
import type { Messages } from "@/lib/i18n/messages"

const APPEAL_WINDOW_DAYS = 90
const DIAL_RADIUS = 66
const DIAL_CIRCUMFERENCE = 2 * Math.PI * DIAL_RADIUS

type AppealCopy = Messages["ui"]

export async function generateMetadata() {
  const t = (await getMessages()).ui
  return { title: t.appealPageTitle }
}

/**
 * V3-P3.3 — the appeal seam, stated honestly: only the applicant or a
 * NY-licensed attorney may submit an appeal; no new documents are considered.
 * We assemble the record and make the attorney hand-off.
 */
export default async function AppealPage() {
  const [myCase, messages, locale] = await Promise.all([getMyCase(), getMessages(), getLocale()])
  const t = messages.ui

  if (!myCase) {
    return <p className="appeal-v2-no-case">{t.appealNoCase}</p>
  }

  const supabase = await createClient()
  const { data: kase } = await supabase
    .from("cases")
    .select("status, stage, stage_entered_at")
    .eq("id", myCase.id)
    .single()

  const denied = kase?.status === "denied"
  return (
    <AppealExperience
      denied={denied}
      stageEnteredAt={kase?.stage_entered_at ?? null}
      locale={locale === "es" ? "es-US" : "en-US"}
      t={t}
    />
  )
}

function AppealExperience({
  denied,
  stageEnteredAt,
  locale,
  t,
}: {
  denied: boolean
  stageEnteredAt: string | null
  locale: string
  t: AppealCopy
}) {
  const rules = appealRules(t)

  if (!denied) {
    return (
      <div className="appeal-v2-page appeal-v2-inactive-page">
        <section className="appeal-v2-inactive-hero" aria-labelledby="appeal-inactive-title">
          <p className="portal-t-eyebrow">{t.appealEyebrow}</p>
          <h1 id="appeal-inactive-title">{t.appealInactiveTitle}</h1>
          <p className="appeal-v2-inactive-copy">
            {t.appealInactiveLead} <strong>{t.appealWindowPhrase}</strong> {t.appealInactiveMiddle}{" "}
            <strong>{t.appealOnlyApplicantAttorney}</strong> {t.appealInactiveTail}
          </p>
        </section>

        <RuleCards rules={rules} label={t.appealRulesLabel} />

        <section className="appeal-v2-file-card" aria-labelledby="appeal-file-title">
          <span className="appeal-v2-file-icon"><Download aria-hidden="true" /></span>
          <div>
            <h2 id="appeal-file-title">{t.appealCompleteFileTitle}</h2>
            <p>{t.appealCompleteFileBody}</p>
          </div>
          <Link href="/portal/forms" className="appeal-v2-file-link">
            {t.appealOpenDocuments} <ArrowRight aria-hidden="true" />
          </Link>
        </section>
      </div>
    )
  }

  const deniedSince = daysSince(stageEnteredAt) ?? 0
  const daysLeft = Math.max(0, APPEAL_WINDOW_DAYS - deniedSince)
  const passed = daysLeft === 0
  const urgent = daysLeft > 0 && daysLeft < 15

  return (
    <div className="appeal-v2-page appeal-v2-denied-page" data-urgent={urgent || undefined} data-passed={passed || undefined}>
      <section className="appeal-v2-denied-hero" aria-labelledby="appeal-denied-title">
        <AppealDial
          daysLeft={daysLeft}
          passed={passed}
          label={interpolate(t.appealDialAria, { daysLeft })}
          caption={t.appealDialCaption}
        />
        <div className="appeal-v2-denied-copy">
          <p className="portal-t-eyebrow">{urgent ? t.appealTimeShort : t.appealDeniedEyebrow}</p>
          <div className="appeal-v2-title-row">
            <h1 id="appeal-denied-title">{passed ? t.appealPassedTitle : t.appealWindowOpenTitle}</h1>
            {urgent ? <span className="appeal-v2-urgent-pill">{interpolate(t.appealDaysLeftPill, { daysLeft })}</span> : null}
          </div>
          {passed ? (
            <p className="appeal-v2-passed-copy">{t.appealPassedBody}</p>
          ) : (
            <>
              <p className="appeal-v2-denied-lede">{t.appealDeniedLede}</p>
              <p className="appeal-v2-days-line">
                <strong>{interpolate(t.appealDaysRemain, { daysLeft })}</strong> {t.appealWindowRemainder}
                {stageEnteredAt ? ` (${interpolate(t.appealDenialRecorded, { date: formatDate(stageEnteredAt, locale) })})` : ""}.
              </p>
              <p className="appeal-v2-letter-note">{t.appealLetterDateNote}</p>
            </>
          )}
        </div>
      </section>

      <div className="appeal-v2-denied-flow">
        <RuleCards rules={rules} label={t.appealRulesLabel} />

        <ol className="appeal-v2-steps">
          <li className="appeal-v2-step">
            <span className="appeal-v2-step-number">01</span>
            <div className="appeal-v2-step-body">
              <Scale aria-hidden="true" />
              <h2>{t.appealAttorneyTitle}</h2>
              <p>{t.appealAttorneyBody}</p>
              <AppealReferralButton
                label={t.appealReferralButton}
                pendingLabel={t.appealReferralPending}
                successMessage={t.appealReferralSuccess}
                urgent={urgent}
              />
            </div>
          </li>
          <li className="appeal-v2-step">
            <span className="appeal-v2-step-number">02</span>
            <div className="appeal-v2-step-body">
              <Download aria-hidden="true" />
              <h2>{t.appealExportTitle}</h2>
              <p>{t.appealExportBody}</p>
              <a className="appeal-v2-export-button" href="/portal/filing-pack" target="_blank" rel="noreferrer">
                <Download aria-hidden="true" /> {t.appealExportButton}
                <span className="sr-only"> ({t.appealNewTab})</span>
              </a>
            </div>
          </li>
        </ol>

        <div className="appeal-v2-boundaries">
          <article className="appeal-v2-can">
            <span><Check aria-hidden="true" /></span>
            <div><h2>{t.appealWhatWeDo}</h2><p>{t.appealDoAssemble}</p><p>{t.appealDoConnect}</p></div>
          </article>
          <article className="appeal-v2-cannot">
            <span><X aria-hidden="true" /></span>
            <div><h2>{t.appealWhatWeCannotDo}</h2><p>{t.appealCannotFile}</p><p>{t.appealCannotAdvise}</p></div>
          </article>
        </div>
      </div>
    </div>
  )
}

function AppealDial({
  daysLeft,
  passed,
  label,
  caption,
}: {
  daysLeft: number
  passed: boolean
  label: string
  caption: string
}) {
  const ratio = passed ? 0 : Math.min(1, Math.max(0, daysLeft / APPEAL_WINDOW_DAYS))
  const offset = DIAL_CIRCUMFERENCE * (1 - ratio)

  return (
    <div className="appeal-v2-dial" role="img" aria-label={label}>
      <svg viewBox="0 0 176 176" aria-hidden="true">
        <circle className="appeal-v2-dial-track" cx="88" cy="88" r={DIAL_RADIUS} />
        <circle
          className="appeal-v2-dial-progress"
          cx="88"
          cy="88"
          r={DIAL_RADIUS}
          strokeDasharray={DIAL_CIRCUMFERENCE}
          strokeDashoffset={offset}
        />
      </svg>
      <span className="appeal-v2-dial-value">{passed ? "—" : daysLeft}</span>
      <span className="appeal-v2-dial-label">{passed ? "" : caption}</span>
    </div>
  )
}

function RuleCards({
  rules,
  label,
}: {
  rules: { title: string; body: string; icon: LucideIcon }[]
  label: string
}) {
  return (
    <section className="appeal-v2-rules" aria-label={label}>
      {rules.map(({ title, body, icon: Icon }) => (
        <article key={title} className="appeal-v2-rule-card">
          <span><Icon aria-hidden="true" /></span>
          <div><h2>{title}</h2><p>{body}</p></div>
        </article>
      ))}
    </section>
  )
}

function appealRules(t: AppealCopy) {
  return [
    { title: t.appealRuleSwornTitle, body: t.appealRuleSwornBody, icon: Stamp },
    { title: t.appealRuleDocumentsTitle, body: t.appealRuleDocumentsBody, icon: FileX2 },
    { title: t.appealRuleSubmitTitle, body: t.appealRuleSubmitBody, icon: Scale },
  ]
}
