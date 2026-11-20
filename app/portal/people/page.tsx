import type { ReactNode } from "react"
import Link from "next/link"
import { Ban, CheckCircle2, Eye, House, LockKeyhole, Send, ShieldCheck, UsersRound } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { cohabitantState } from "@/lib/cohabitants/process"
import {
  CohabitantCollector,
  ReferenceCollector,
  RemovePersonButton,
  type ReferenceRow,
} from "@/components/portal/collectors"
import { NotarizedUpload } from "@/components/portal/notarized-upload"
import { CopyLinkButton } from "@/components/portal/copy-link-button"
import { SafeguardInvite } from "@/components/portal/safeguard-invite"
import { Button } from "@/components/ui/button"
import { requiredReferences } from "@/lib/intake/schema"
import type { WizardAnswers } from "@/lib/intake/answers"
import { referenceComposition } from "@/lib/references/composition"
import { livesAlone } from "@/lib/requirements/roster"
import { loadSafeguardInvite } from "@/lib/safeguard/invite"
import { resolveFacts } from "@/lib/facts/resolve"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import {
  sendReferenceRequest,
  sendCohabitantRequest,
  recordReferenceUpload,
  recordCohabitantUpload,
  revokeReferenceLink,
  revokeCohabitantLink,
} from "./actions"
import { getMessages } from "@/lib/i18n"
import { interpolate } from "@/lib/i18n/interpolate"
import type { ApplicationType } from "@/lib/application-types"

type PeopleTab = "references" | "household" | "safeguard"
type JourneyState = "not_invited" | "invited" | "opened" | "responded" | "notarized" | "revoked"

interface ReferenceRequestRow {
  reference_id: string
  status: string
  token: string
  confirmed_email: string | null
  sent_at: string | null
  opened_at: string | null
  answered_at: string | null
  submitted_at: string | null
  notarized_at: string | null
  revoked_at: string | null
  document_id: string | null
}

interface CohabitantViewRow {
  id: string
  name: string
  relationship: string | null
  affidavit_status: string
  contact_email: string | null
  confirmed_email: string | null
  token: string | null
  token_revoked_at: string | null
  sent_at: string | null
  opened_at: string | null
  answered_at: string | null
  notarized_at: string | null
  document_id: string | null
}

const AVATAR_TONES = [
  "bg-[#E9F0FC] text-[#284A88]",
  "bg-[#F7EBD1] text-[#7B571B]",
  "bg-[#E5F3EC] text-[#256447]",
  "bg-[#F2E9F8] text-[#6B3B80]",
]

export async function generateMetadata() {
  const t = await getMessages()
  return { title: t.ui.peopleTitle }
}

function emailMismatch(onFile?: string | null, confirmed?: string | null): boolean {
  if (!onFile || !confirmed) return false
  return onFile.trim().toLowerCase() !== confirmed.trim().toLowerCase()
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).map((part) => part[0]).join("").slice(0, 2).toUpperCase()
}

function PersonStatus({ state, label }: { state: JourneyState; label: string }) {
  return (
    <span className={cn(
      "shrink-0 rounded-full border px-2.5 py-1 text-[11px] font-semibold",
      state === "notarized" && "border-ok/25 bg-ok/10 text-ok",
      state === "responded" && "border-signal/25 bg-signal-dim text-signal",
      (state === "opened" || state === "invited") && "border-[var(--portal-navy)]/15 bg-[var(--portal-profile-blue)] text-[var(--portal-navy)]",
      state === "not_invited" && "border-hairline bg-surface-2 text-text-mid",
      state === "revoked" && "border-warn/25 bg-warn/10 text-warn"
    )}>
      {label}
    </span>
  )
}

function StepTrack({ labels, current, ariaLabel }: { labels: string[]; current: number; ariaLabel: string }) {
  return (
    <ol className="mt-5 grid" style={{ gridTemplateColumns: `repeat(${labels.length}, minmax(0, 1fr))` }} aria-label={ariaLabel}>
      {labels.map((label, index) => {
        const done = index < current
        const active = index === current
        return (
          <li key={label} aria-current={active ? "step" : undefined} className="relative min-w-0 text-center">
            {index > 0 ? <span className={cn("absolute left-0 top-2.5 h-px w-1/2", index <= current ? "bg-[var(--portal-gold)]" : "bg-hairline")} aria-hidden /> : null}
            {index < labels.length - 1 ? <span className={cn("absolute right-0 top-2.5 h-px w-1/2", index < current ? "bg-[var(--portal-gold)]" : "bg-hairline")} aria-hidden /> : null}
            <span className={cn(
              "relative z-10 mx-auto block size-5 rounded-full border-2 bg-white",
              done && "border-[var(--portal-gold)] bg-[var(--portal-gold)]",
              active && "border-[var(--portal-navy)] bg-[var(--portal-navy)] ring-4 ring-[var(--portal-navy)]/10",
              !done && !active && "border-hairline"
            )} aria-hidden />
            <span className={cn("mt-2 hidden truncate text-[11px] font-medium text-text-low sm:block", active && "text-foreground")}>{label}</span>
            {active ? <span className="mt-2 block text-[11px] font-semibold text-foreground sm:hidden">{label}</span> : null}
          </li>
        )
      })}
    </ol>
  )
}

function PersonCard({
  index,
  name,
  meta,
  emailMissing,
  mismatch,
  state,
  statusLabel,
  stepLabels,
  currentStep,
  stepAria,
  sentence,
  actions,
  remove,
}: {
  index: number
  name: string
  meta: string
  emailMissing?: string
  mismatch?: string | null
  state: JourneyState
  statusLabel: string
  stepLabels: string[]
  currentStep: number
  stepAria: string
  sentence: string
  actions: ReactNode
  remove: ReactNode
}) {
  return (
    <article className="overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_14px_36px_rgba(10,18,34,.055)]">
      <div className="p-5 sm:p-6">
        <div className="flex items-start justify-between gap-3">
          <div className="flex min-w-0 items-center gap-3">
            <span className={cn("grid size-12 shrink-0 place-items-center rounded-full text-[14px] font-bold", AVATAR_TONES[index % AVATAR_TONES.length])}>
              {initials(name)}
            </span>
            <div className="min-w-0">
              <h2 className="truncate text-[17px] font-semibold text-foreground">{name}</h2>
              <p className="mt-0.5 truncate text-[12px] text-text-mid">
                {meta}{emailMissing ? <span className="text-warn"> · {emailMissing}</span> : null}
              </p>
              {mismatch ? <p className="mt-1 text-[12px] font-medium text-warn">{mismatch}</p> : null}
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            <PersonStatus state={state} label={statusLabel} />
            {remove}
          </div>
        </div>
        <StepTrack labels={stepLabels} current={currentStep} ariaLabel={stepAria} />
      </div>
      <footer className="flex flex-col gap-3 border-t border-hairline bg-[#FAFBFC] px-5 py-4 sm:flex-row sm:items-center sm:justify-between sm:px-6">
        <p className="text-[13px] leading-5 text-text-mid">{sentence}</p>
        {actions ? <div className="flex flex-wrap items-center gap-1.5">{actions}</div> : null}
      </footer>
    </article>
  )
}

function TabCard({
  href,
  active,
  icon,
  title,
  status,
  count,
}: {
  href: string
  active: boolean
  icon: ReactNode
  title: string
  status: string
  count: string
}) {
  return (
    <Link
      href={href}
      role="tab"
      aria-selected={active}
      className={cn(
        "flex min-w-[168px] items-center gap-3 rounded-2xl border px-4 py-3 transition md:min-w-0 md:flex-1 md:px-5 md:py-4",
        active
          ? "border-[var(--portal-navy)] bg-[var(--portal-navy)] text-white shadow-[0_16px_34px_rgba(10,18,34,.13)]"
          : "border-hairline bg-white text-foreground hover:border-[var(--portal-navy)]/20"
      )}
    >
      <span className={cn("grid size-9 shrink-0 place-items-center rounded-xl", active ? "bg-white/10 text-[var(--portal-gold-light)]" : "bg-[var(--portal-profile-blue)] text-[var(--portal-navy)]")}>{icon}</span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[14px] font-semibold">{title}</span>
        <span className={cn("mt-0.5 hidden truncate text-[11px] md:block", active ? "text-white/66" : "text-text-low")}>{status}</span>
      </span>
      <span className={cn("shrink-0 font-mono text-[12px] font-semibold", active ? "text-[var(--portal-gold-light)]" : "text-text-mid")}>{count}</span>
    </Link>
  )
}

function NotaryCard({ ready, waiting, t, compact = false }: { ready: number; waiting: number; t: Record<string, string>; compact?: boolean }) {
  return (
    <section className={cn("rounded-2xl bg-[var(--portal-navy)] text-white shadow-[0_18px_42px_rgba(10,18,34,.13)]", compact ? "flex items-center justify-between gap-4 px-4 py-3" : "p-5")}>
      <div>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[.15em] text-[var(--portal-gold-light)]">{t.peopleNotaryEyebrow}</p>
        <h2 className={cn("portal-title-font font-medium", compact ? "mt-0.5 text-[19px]" : "mt-2 text-[23px]")}>{t.peopleOneNotaryVisit}</h2>
        {!compact ? <p className="mt-2 text-[13px] leading-5 text-white/68">{t.peopleOneNotaryVisitBody}</p> : null}
      </div>
      <div className={cn("grid gap-2", compact ? "shrink-0 text-right" : "mt-5 border-t border-white/10 pt-4")}>
        <p className="text-[12px] text-white/76"><strong className="mr-1 text-[var(--portal-gold-light)]">{ready}</strong>{t.peopleReadyToNotarize}</p>
        <p className="text-[12px] text-white/76"><strong className="mr-1 text-white">{waiting}</strong>{t.peopleStillToRespond}</p>
      </div>
    </section>
  )
}

function PrivacyCards({ showMismatch, t }: { showMismatch: boolean; t: Record<string, string> }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2 xl:grid-cols-1">
      <section className="rounded-2xl border border-hairline bg-white p-5">
        <LockKeyhole className="size-5 text-[var(--portal-gold-deep)]" aria-hidden />
        <h2 className="mt-3 text-[14px] font-semibold">{t.peopleWhatTheySee}</h2>
        <p className="mt-1.5 text-[12px] leading-5 text-text-mid">{t.peopleWhatTheySeeBody}</p>
      </section>
      {showMismatch ? (
        <section className="rounded-2xl border border-warn/20 bg-warn/[0.055] p-5">
          <h2 className="text-[14px] font-semibold text-warn">{t.peopleDifferentEmailTitle}</h2>
          <p className="mt-1.5 text-[12px] leading-5 text-text-mid">{t.peopleDifferentEmailBody}</p>
        </section>
      ) : null}
    </div>
  )
}

function referenceState(reference: ReferenceRow, request?: ReferenceRequestRow): JourneyState {
  if (reference.notarized || request?.status === "notarized") return "notarized"
  if (reference.received || request?.status === "submitted") return "responded"
  if (request?.revoked_at) return "revoked"
  if (request?.status === "opened" || request?.opened_at) return "opened"
  if (request) return "invited"
  return "not_invited"
}

function householdState(person: CohabitantViewRow): JourneyState {
  const state = cohabitantState(person as Parameters<typeof cohabitantState>[0])
  if (state === "notarized") return "notarized"
  if (state === "submitted") return "responded"
  if (person.token_revoked_at) return "revoked"
  if (state === "opened") return "opened"
  if (state === "invited") return "invited"
  return "not_invited"
}

function stepIndex(state: JourneyState) {
  if (state === "notarized") return 4
  if (state === "responded") return 3
  if (state === "opened") return 2
  if (state === "invited") return 1
  return 0
}

function statusLabel(state: JourneyState, t: Record<string, string>, household = false) {
  if (state === "notarized") return t.notarized
  if (state === "responded") return household ? t.confirmed : t.responded
  if (state === "opened") return t.openedLink
  if (state === "invited") return t.invited
  if (state === "revoked") return t.peopleLinkOff
  return t.notInvited
}

function journeySentence({
  state,
  sentAt,
  openedAt,
  completedAt,
  t,
}: {
  state: JourneyState
  sentAt?: string | null
  openedAt?: string | null
  completedAt?: string | null
  t: Record<string, string>
}) {
  if (state === "notarized") return completedAt ? `${t.peopleNotarizedReceived} ${formatDate(completedAt)}.` : t.peopleNotarizedReceived
  if (state === "responded") return t.peopleReadyNotarizeSentence
  if (state === "revoked") return t.peopleLinkTurnedOff
  if (state === "opened") {
    const sent = sentAt ? `${t.peopleLinkSent} ${formatDate(sentAt)}` : t.peopleLinkSent
    const opened = openedAt ? `${t.peopleOpened} ${formatDate(openedAt)}` : t.peopleOpened
    return `${sent} · ${opened}.`
  }
  if (state === "invited") return sentAt ? `${t.peopleLinkSent} ${formatDate(sentAt)}.` : t.peopleLinkSent
  return t.peopleNotInvitedSentence
}

export default async function PeoplePage({
  searchParams,
}: {
  searchParams: Promise<{ tab?: string | string[] }>
}) {
  const [myCase, messages, query] = await Promise.all([getMyCase(), getMessages(), searchParams])
  const t = messages.ui
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        {messages.common.noCase}
      </p>
    )
  }

  const supabase = await createClient()
  const [caseResult, intakeResult, referencesResult, cohabitantsResult, requestsResult, requirementResult, cohabitantAnswerResult, safeguardInvite, safeguardFacts] = await Promise.all([
    supabase.from("cases").select("license_track, is_renewal").eq("id", myCase.id).maybeSingle(),
    supabase.from("intake_sessions").select("answers").eq("case_id", myCase.id).maybeSingle(),
    supabase.from("character_references").select("id, name, relationship, is_family, contact_email, notarized, received").eq("case_id", myCase.id).order("created_at"),
    supabase.from("cohabitants").select("id, name, relationship, affidavit_status, contact_email, confirmed_email, token, token_revoked_at, sent_at, opened_at, answered_at, notarized_at, document_id").eq("case_id", myCase.id).order("created_at"),
    supabase.from("reference_requests").select("reference_id, status, token, confirmed_email, sent_at, opened_at, answered_at, submitted_at, notarized_at, revoked_at, document_id").eq("case_id", myCase.id),
    supabase.from("case_requirements").select("req_code, status").eq("case_id", myCase.id).in("req_code", ["SFG-01", "COH-02"]),
    supabase.from("requirement_answers").select("answers").eq("case_id", myCase.id).eq("req_code", "COH-01").maybeSingle(),
    loadSafeguardInvite(supabase, myCase.id),
    resolveFacts(supabase, myCase.id, { keys: ["safeguard.firstName", "safeguard.lastName", "safeguard.email", "safeguard.relation"] }),
  ])

  const intakeAnswers = (intakeResult.data?.answers ?? {}) as WizardAnswers
  const required = requiredReferences(intakeAnswers, {
    isRenewal: caseResult.data?.is_renewal ?? false,
    licenseTrack: (caseResult.data?.license_track as "carry_guard" | "special_carry_guard" | undefined) ?? undefined,
    applicationType: myCase.application_type as ApplicationType | null,
  })
  const references = (referencesResult.data ?? []) as ReferenceRow[]
  const cohabitants = (cohabitantsResult.data ?? []) as CohabitantViewRow[]
  const requests = (requestsResult.data ?? []) as ReferenceRequestRow[]
  const requestByReference = new Map(requests.map((request) => [request.reference_id, request]))
  const requirements = requirementResult.data ?? []
  const showSafeguard = requirements.some((requirement) => requirement.req_code === "SFG-01" && requirement.status !== "na")
  const soleOccupancy = requirements.some((requirement) => requirement.req_code === "COH-02" && requirement.status !== "na")
    || livesAlone((cohabitantAnswerResult.data?.answers ?? {}) as Record<string, unknown>)

  const requestedTab = typeof query.tab === "string" ? query.tab : "references"
  const activeTab: PeopleTab = requestedTab === "household"
    ? "household"
    : requestedTab === "safeguard" && showSafeguard
      ? "safeguard"
      : "references"

  const referenceStates = references.map((reference) => referenceState(reference, requestByReference.get(reference.id)))
  const householdStates = cohabitants.map(householdState)
  const readyToNotarize = referenceStates.filter((state) => state === "responded").length + householdStates.filter((state) => state === "responded").length
  const stillToRespond = referenceStates.filter((state) => state === "invited" || state === "opened").length + householdStates.filter((state) => state === "invited" || state === "opened").length
  const mismatchPresent = references.some((reference) => emailMismatch(reference.contact_email, requestByReference.get(reference.id)?.confirmed_email))
    || cohabitants.some((cohabitant) => emailMismatch(cohabitant.contact_email, cohabitant.confirmed_email))
  const composition = referenceComposition(references, required)
  const allDone = composition.complete
    && references.filter((reference) => reference.notarized).length >= required
    && cohabitants.every((cohabitant) => cohabitant.affidavit_status === "notarized")

  const safeguardName = [safeguardFacts["safeguard.firstName"], safeguardFacts["safeguard.lastName"]].filter(Boolean).join(" ") || intakeAnswers.safeguardName || ""
  const safeguardEmail = safeguardFacts["safeguard.email"] ?? ""
  const safeguardRelationship = safeguardFacts["safeguard.relation"] || intakeAnswers.safeguardRelation || ""
  const safeguardDone = !!safeguardInvite?.completed_at || ["completed", "uploaded", "done"].includes(safeguardInvite?.status ?? "")
  const safeguardStatus = safeguardDone
    ? t.peopleSafeguardDone
    : safeguardInvite?.opened_at
      ? t.openedLink
      : safeguardInvite?.sent_at || safeguardInvite?.token
        ? t.peopleSafeguardLinkSent
        : t.notInvited

  const referenceSteps = [t.peopleStepAdded, t.invited, t.openedLink, t.responded, t.notarized]
  const householdSteps = [t.peopleStepAdded, t.invited, t.openedLink, t.confirmed, t.notarized]
  const referenceNotarized = references.filter((reference) => reference.notarized).length
  const householdNotarized = cohabitants.filter((cohabitant) => cohabitant.affidavit_status === "notarized").length
  const householdWaiting = Math.max(0, cohabitants.length - householdNotarized)
  const householdStatus = cohabitants.length === 0
    ? t.peopleNoOtherAdults
    : householdWaiting === 0
      ? t.peopleAllStatementsIn
      : interpolate(householdWaiting === 1 ? t.peopleWaitingOne : t.peopleWaitingMany, { count: householdWaiting })

  return (
    <div>
      <header className="border-b border-hairline pb-6">
        <p className="font-mono text-[11px] font-semibold uppercase tracking-[.16em] text-[var(--portal-gold-deep)]">{t.peopleEyebrow}</p>
        <h1 className="portal-title-font mt-1 text-[34px] font-medium leading-tight text-foreground sm:text-[36px]">{t.peopleHeading}</h1>
        <p className="mt-2 max-w-4xl text-[14px] leading-6 text-text-mid">
          {showSafeguard ? t.peopleSublineWithSafeguard : t.peopleSublineWithoutSafeguard}
        </p>
      </header>

      <nav role="tablist" aria-label={t.peopleTabsLabel} className="-mx-4 mt-5 flex gap-2 overflow-x-auto px-4 pb-2 sm:mx-0 sm:px-0 md:overflow-visible">
        <TabCard
          href="/portal/people?tab=references"
          active={activeTab === "references"}
          icon={<UsersRound className="size-4" aria-hidden />}
          title={t.references}
          status={interpolate(t.peopleReferencesStatus, { notarized: referenceNotarized, required })}
          count={`${references.length}/${required}`}
        />
        <TabCard
          href="/portal/people?tab=household"
          active={activeTab === "household"}
          icon={<House className="size-4" aria-hidden />}
          title={t.household}
          status={householdStatus}
          count={String(cohabitants.length)}
        />
        {showSafeguard ? (
          <TabCard
            href="/portal/people?tab=safeguard"
            active={activeTab === "safeguard"}
            icon={<ShieldCheck className="size-4" aria-hidden />}
            title={t.peopleSafeguard}
            status={safeguardStatus}
            count={safeguardDone ? "1/1" : "0/1"}
          />
        ) : null}
      </nav>

      {readyToNotarize > 0 ? <div className="mt-4 xl:hidden"><NotaryCard ready={readyToNotarize} waiting={stillToRespond} t={t} compact /></div> : null}

      <div className="mt-5 grid gap-6 xl:grid-cols-[minmax(0,1fr)_320px]">
        <section className="min-w-0 space-y-4">
          {allDone ? (
            <div className="flex items-center gap-3 rounded-2xl border border-ok/25 bg-ok/[0.07] px-4 py-3.5 text-ok">
              <CheckCircle2 className="size-5 shrink-0" aria-hidden />
              <p className="text-[14px] font-semibold">{interpolate(t.peopleEveryoneIn, { references: referenceNotarized, household: householdNotarized })}</p>
            </div>
          ) : null}

          {activeTab === "references" ? (
            <>
              <ReferenceCollector caseId={myCase.id} references={references} required={required} hideAdd />
              {references.map((reference, index) => {
                const request = requestByReference.get(reference.id)
                const state = referenceStates[index]
                const mismatch = emailMismatch(reference.contact_email, request?.confirmed_email)
                const sentence = journeySentence({
                  state,
                  sentAt: request?.sent_at,
                  openedAt: request?.opened_at,
                  completedAt: request?.notarized_at,
                  t,
                })
                let actions: ReactNode = null
                if ((state === "not_invited" || state === "revoked") && reference.contact_email) {
                  actions = (
                    <form action={sendReferenceRequest}>
                      <input type="hidden" name="referenceId" value={reference.id} />
                      <Button type="submit" size="sm" aria-label={`${state === "revoked" ? t.peopleSendNewLink : t.sendLink} — ${reference.name}`} className="min-h-9 [background:var(--portal-gold-button)] text-[var(--portal-navy)]">
                        <Send className="size-3.5" aria-hidden /> {state === "revoked" ? t.peopleSendNewLink : t.sendLink}
                      </Button>
                    </form>
                  )
                } else if ((state === "invited" || state === "opened") && request?.token) {
                  actions = (
                    <>
                      <CopyLinkButton token={request.token} basePath="/r/" personName={reference.name} />
                      <form action={sendReferenceRequest}>
                        <input type="hidden" name="referenceId" value={reference.id} />
                        <Button type="submit" size="sm" variant="outline" aria-label={`${t.resend} — ${reference.name}`} className="min-h-9"><Send className="size-3.5" aria-hidden /> {t.resend}</Button>
                      </form>
                      <form action={revokeReferenceLink}>
                        <input type="hidden" name="referenceId" value={reference.id} />
                        <Button type="submit" size="sm" variant="ghost" aria-label={`${t.revoke} — ${reference.name}`} className="min-h-9 text-text-low"><Ban className="size-3.5" aria-hidden /> {t.revoke}</Button>
                      </form>
                    </>
                  )
                } else if (state === "responded") {
                  actions = (
                    <>
                      <NotarizedUpload targetId={reference.id} clientId={myCase.client_id} record={recordReferenceUpload} personName={reference.name} />
                      {request?.token ? <CopyLinkButton token={request.token} basePath="/r/" personName={reference.name} /> : null}
                    </>
                  )
                } else if (state === "notarized" && request?.document_id) {
                  actions = <Link href="/portal/documents" aria-label={`${t.peopleViewDocument} — ${reference.name}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 text-[12px] font-semibold"><Eye className="size-3.5" aria-hidden /> {t.peopleViewDocument}</Link>
                }
                return (
                  <PersonCard
                    key={reference.id}
                    index={index}
                    name={reference.name}
                    meta={[reference.relationship || t.peopleRelationshipUnknown, reference.is_family ? t.family : t.unrelated, reference.contact_email || ""].filter(Boolean).join(" · ")}
                    emailMissing={!reference.contact_email ? t.addEmailInvite : undefined}
                    mismatch={mismatch ? interpolate(t.differentEmail, { email: request?.confirmed_email ?? "" }) : null}
                    state={state}
                    statusLabel={statusLabel(state, t)}
                    stepLabels={referenceSteps}
                    currentStep={stepIndex(state)}
                    stepAria={interpolate(t.peopleStepAria, { current: stepIndex(state) + 1, total: referenceSteps.length, label: referenceSteps[stepIndex(state)] })}
                    sentence={sentence}
                    actions={actions}
                    remove={<RemovePersonButton caseId={myCase.id} id={reference.id} kind="reference" name={reference.name} />}
                  />
                )
              })}
              <ReferenceCollector caseId={myCase.id} references={references} required={required} hideRule />
            </>
          ) : null}

          {activeTab === "household" ? (
            <>
              {cohabitants.length === 0 && soleOccupancy ? (
                <section className="rounded-2xl border border-hairline bg-white p-6 text-center">
                  <House className="mx-auto size-7 text-[var(--portal-gold-deep)]" aria-hidden />
                  <h2 className="portal-title-font mt-3 text-[25px] font-medium">{t.peopleNoOtherAdults}</h2>
                  <p className="mx-auto mt-2 max-w-lg text-[14px] leading-6 text-text-mid">{t.peopleSoleOccupancyBody}</p>
                  <Link href="/portal/checklist?item=COH-02" className="mt-4 inline-flex min-h-10 items-center rounded-lg [background:var(--portal-gold-button)] px-4 text-[13px] font-semibold text-[var(--portal-navy)]">{t.peopleOpenStatement}</Link>
                </section>
              ) : (
                <>
                  {cohabitants.map((person, index) => {
                    const state = householdStates[index]
                    const mismatch = emailMismatch(person.contact_email, person.confirmed_email)
                    let actions: ReactNode = null
                    if ((state === "not_invited" || state === "revoked") && person.contact_email) {
                      actions = (
                        <form action={sendCohabitantRequest}>
                          <input type="hidden" name="cohabitantId" value={person.id} />
                          <Button type="submit" size="sm" aria-label={`${state === "revoked" ? t.peopleSendNewLink : t.sendLink} — ${person.name}`} className="min-h-9 [background:var(--portal-gold-button)] text-[var(--portal-navy)]"><Send className="size-3.5" aria-hidden /> {state === "revoked" ? t.peopleSendNewLink : t.sendLink}</Button>
                        </form>
                      )
                    } else if ((state === "invited" || state === "opened") && person.token) {
                      actions = (
                        <>
                          <CopyLinkButton token={person.token} basePath="/c/" personName={person.name} />
                          <form action={sendCohabitantRequest}>
                            <input type="hidden" name="cohabitantId" value={person.id} />
                            <Button type="submit" size="sm" variant="outline" aria-label={`${t.resend} — ${person.name}`} className="min-h-9"><Send className="size-3.5" aria-hidden /> {t.resend}</Button>
                          </form>
                          <form action={revokeCohabitantLink}>
                            <input type="hidden" name="cohabitantId" value={person.id} />
                            <Button type="submit" size="sm" variant="ghost" aria-label={`${t.revoke} — ${person.name}`} className="min-h-9 text-text-low"><Ban className="size-3.5" aria-hidden /> {t.revoke}</Button>
                          </form>
                        </>
                      )
                    } else if (state === "responded") {
                      actions = (
                        <>
                          <NotarizedUpload targetId={person.id} clientId={myCase.client_id} record={recordCohabitantUpload} personName={person.name} />
                          {person.token ? <CopyLinkButton token={person.token} basePath="/c/" personName={person.name} /> : null}
                        </>
                      )
                    } else if (state === "notarized" && person.document_id) {
                      actions = <Link href="/portal/documents" aria-label={`${t.peopleViewDocument} — ${person.name}`} className="inline-flex min-h-9 items-center gap-1.5 rounded-lg border border-hairline bg-white px-3 text-[12px] font-semibold"><Eye className="size-3.5" aria-hidden /> {t.peopleViewDocument}</Link>
                    }
                    return (
                      <PersonCard
                        key={person.id}
                        index={index}
                        name={person.name}
                        meta={[person.relationship || t.peopleRelationshipUnknown, person.contact_email || ""].filter(Boolean).join(" · ")}
                        emailMissing={!person.contact_email ? t.addEmailInvite : undefined}
                        mismatch={mismatch ? interpolate(t.differentEmail, { email: person.confirmed_email ?? "" }) : null}
                        state={state}
                        statusLabel={statusLabel(state, t, true)}
                        stepLabels={householdSteps}
                        currentStep={stepIndex(state)}
                        stepAria={interpolate(t.peopleStepAria, { current: stepIndex(state) + 1, total: householdSteps.length, label: householdSteps[stepIndex(state)] })}
                        sentence={journeySentence({ state, sentAt: person.sent_at, openedAt: person.opened_at, completedAt: person.notarized_at, t })}
                        actions={actions}
                        remove={<RemovePersonButton caseId={myCase.id} id={person.id} kind="cohabitant" name={person.name} />}
                      />
                    )
                  })}
                  <CohabitantCollector caseId={myCase.id} count={cohabitants.length} />
                </>
              )}
            </>
          ) : null}

          {activeTab === "safeguard" && showSafeguard ? (
            <SafeguardInvite
              caseId={myCase.id}
              person={{ name: safeguardName, email: safeguardEmail, relationship: safeguardRelationship }}
              initial={safeguardInvite ? {
                token: safeguardInvite.token,
                status: safeguardInvite.status,
                sentAt: safeguardInvite.sent_at,
                openedAt: safeguardInvite.opened_at,
                completedAt: safeguardInvite.completed_at,
              } : null}
            />
          ) : null}
        </section>

        <aside className="hidden space-y-4 xl:block">
          {readyToNotarize > 0 || stillToRespond > 0 ? <NotaryCard ready={readyToNotarize} waiting={stillToRespond} t={t} /> : null}
          <PrivacyCards showMismatch={mismatchPresent} t={t} />
        </aside>
      </div>

      <div className="mt-6 xl:hidden"><PrivacyCards showMismatch={mismatchPresent} t={t} /></div>
    </div>
  )
}
