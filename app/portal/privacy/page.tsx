import { CircleDollarSign, EyeOff, FileDown, LockKeyhole, PencilLine, ShieldCheck, Trash2 } from "lucide-react"
import { brand } from "@/config/brand"
import { DataRequestForm } from "@/components/portal/data-request-form"
import { requireRole } from "@/lib/auth"
import { formatDate } from "@/lib/format"
import { getLocale, getMessages } from "@/lib/i18n"
import { interpolate } from "@/lib/i18n/interpolate"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"

export async function generateMetadata() {
  const messages = await getMessages()
  return { title: messages.ui.privacyTitle }
}

type RequestStatus = "open" | "acknowledged" | "fulfilled" | "refused"
type RequestKind = "access" | "correction" | "deletion"

export default async function PortalPrivacyPage() {
  const [, myCase, messages, locale] = await Promise.all([
    requireRole(["client"]),
    getMyCase(),
    getMessages(),
    getLocale(),
  ])
  const t = messages.ui
  const supabase = await createClient()
  const { data: requests } = myCase
    ? await supabase
        .from("data_requests")
        .select("id, kind, status, requested_at, resolution_note")
        .eq("case_id", myCase.id)
        .order("requested_at", { ascending: false })
    : { data: [] }

  const requestRows = (requests ?? []) as {
    id: string
    kind: RequestKind
    status: RequestStatus
    requested_at: string
    resolution_note: string | null
  }[]
  const openRequests = requestRows
    .filter((request) => request.status === "open" || request.status === "acknowledged")
    .map((request) => ({ kind: request.kind, status: request.status }))
  const kindMeta = {
    access: { label: t.dataCopy, icon: FileDown },
    correction: { label: t.dataCorrection, icon: PencilLine },
    deletion: { label: t.dataDeletion, icon: Trash2 },
  } as const

  return (
    <div className="privacy-v2-page">
      <section className="privacy-v2-hero" aria-labelledby="privacy-title">
        <div className="privacy-v2-hero-copy">
          <p className="portal-t-eyebrow">{t.privacyHeroEyebrow}</p>
          <h1 id="privacy-title">{t.privacyHeroTitle}</h1>
          <p>{t.privacyDescription}</p>
        </div>
        <div className="privacy-v2-promises" role="list" aria-label={t.recordsHeld}>
          <PrivacyPromise icon={EyeOff}>{t.recordsRuleOne}</PrivacyPromise>
          <PrivacyPromise icon={LockKeyhole}>{t.recordsRuleTwo}</PrivacyPromise>
          <PrivacyPromise icon={CircleDollarSign}>{t.recordsRuleThree}</PrivacyPromise>
        </div>
      </section>

      <div className="privacy-v2-layout">
        <div className="privacy-v2-main">
          <section className="privacy-v2-ask" aria-labelledby="privacy-ask-title">
            <h2 id="privacy-ask-title">{t.askSomething}</h2>
            <DataRequestForm openRequests={openRequests} />
          </section>

          <section className="privacy-v2-deletion" id="privacy-deletion" aria-labelledby="privacy-deletion-title">
            <header>
              <p className="portal-t-eyebrow">{t.privacyHeroEyebrow}</p>
              <h2 id="privacy-deletion-title">{t.deletionTitle}</h2>
            </header>
            <div className="privacy-v2-deletion-panels">
              <article className="privacy-v2-removed">
                <span><Trash2 aria-hidden="true" /></span>
                <div><h3>{t.deletionRemoved}</h3><p>{t.deletionBody}</p></div>
              </article>
              <article className="privacy-v2-kept">
                <span><LockKeyhole aria-hidden="true" /></span>
                <div>
                  <h3>{t.deletionKeepTitle}</h3>
                  <KeepList t={t} className="privacy-v2-keep-desktop" />
                  <details className="privacy-v2-keep-mobile">
                    <div className="privacy-v2-keep-preview"><KeepList t={t} /></div>
                    <summary>{t.deletionReadAll}</summary>
                    <KeepList t={t} className="privacy-v2-keep-full" />
                  </details>
                </div>
              </article>
            </div>
            <p className="privacy-v2-honesty">
              <Honesty text={interpolate(t.deletionHonesty, { email: brand.contact.email })} email={brand.contact.email} />
            </p>
          </section>
        </div>

        <aside className="privacy-v2-history" aria-labelledby="privacy-history-title">
          <h2 id="privacy-history-title">{t.yourRequests}</h2>
          {requestRows.length ? (
            <ol className="privacy-v2-request-list">
              {requestRows.map((request) => {
                const meta = kindMeta[request.kind]
                const Icon = meta?.icon ?? FileDown
                const status = requestStatus(request.status, t)
                const current = request.status === "open" ? 0 : request.status === "acknowledged" ? 1 : 2
                return (
                  <li key={request.id} className="privacy-v2-history-item">
                    <header>
                      <span className="privacy-v2-history-icon"><Icon aria-hidden="true" /></span>
                      <div><h3>{meta?.label ?? request.kind}</h3><p>{interpolate(t.filedDate, { date: formatDate(request.requested_at, locale === "es" ? "es-US" : "en-US") })}</p></div>
                      <span className="privacy-v2-status" data-status={request.status}>{status}</span>
                    </header>
                    <ol className="privacy-v2-track" aria-label={t.privacyTrackLabel}>
                      {[t.privacyStatusReceived, t.privacyStatusAcknowledged, request.status === "refused" ? t.privacyStatusNotDone : t.privacyStatusDone].map((label, index) => (
                        <li key={label} data-reached={index <= current} data-refused={request.status === "refused" && index === 2} aria-current={index === current ? "step" : undefined}>
                          <span aria-hidden="true">{index < current || (index === 2 && request.status === "fulfilled") ? <ShieldCheck /> : ""}</span>
                          <small>{label}</small>
                        </li>
                      ))}
                    </ol>
                    {request.resolution_note ? <div className="privacy-v2-resolution"><strong>{t.privacyOurNote}</strong><p>{request.resolution_note}</p></div> : null}
                  </li>
                )
              })}
            </ol>
          ) : <p className="privacy-v2-empty">{t.privacyNoRequests}</p>}
        </aside>
      </div>
    </div>
  )
}

function PrivacyPromise({ icon: Icon, children }: { icon: typeof EyeOff; children: string }) {
  return <article role="listitem"><span><Icon aria-hidden="true" /></span><p>{children}</p></article>
}

function Honesty({ text, email }: { text: string; email: string }) {
  const [before, after = ""] = text.split(email)
  return <>{before}<a href={`mailto:${email}`}>{email}</a>{after}</>
}

function KeepList({ t, className }: { t: Record<string, string>; className?: string }) {
  const rows = [
    [t.deletionKeepSigningTitle, t.deletionKeepBody],
    [t.deletionKeepPaymentTitle, t.deletionKeepPaymentBody],
    [t.deletionKeepRequestTitle, t.deletionKeepRequestBody],
    [t.deletionKeepCaseTitle, t.deletionKeepCaseBody],
  ]
  return <ul className={className}>{rows.map(([title, body]) => <li key={title}><strong>{title}:</strong> {body}</li>)}</ul>
}

function requestStatus(status: RequestStatus, t: Record<string, string>) {
  if (status === "acknowledged") return t.privacyStatusAcknowledged
  if (status === "fulfilled") return t.privacyStatusDone
  if (status === "refused") return t.privacyStatusNotDone
  return t.privacyStatusReceived
}
