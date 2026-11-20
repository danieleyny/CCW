"use client"

import { useState } from "react"
import Link from "next/link"
import {
  ShieldCheck,
  MessageSquareWarning,
  Check,
  Gavel,
  Fingerprint,
  Users,
  GraduationCap,
  Scale,
  Lock,
  Receipt,
  Medal,
  FileText,
  IdCard,
  BadgeCheck,
  Globe,
  Camera,
  House,
  PenLine,
  UserCheck,
  RefreshCw,
  ClipboardList,
  ShieldAlert,
  FileWarning,
  Car,
  AtSign,
  FileSignature,
  PackageCheck,
  Plane,
  Building2,
  Star,
  CircleHelp,
  MessageCircle,
  MapPin,
  ArrowLeft,
  type LucideIcon,
} from "lucide-react"
import { categoryKeyFor } from "@/lib/requirements/categories"
import { RequirementAction, type GeneratedDoc, type ReferenceProgress } from "@/components/portal/requirement-action"
import type { DmvApplicant } from "@/lib/portal/requirement-view"
import type { CurrentDoc } from "@/components/portal/document-uploader"
import { actionFor } from "@/lib/requirements/actions"
import type { FeeSummary } from "@/lib/fees"
import type { FeeReceipts } from "@/components/portal/fee-panel"
import { cn } from "@/lib/utils"
import { LADDER_COPY, reviewerLabel, type LadderState } from "@/lib/requirements/ladder"
import { isUnenforced } from "@/lib/legal-status"
import { DocumentExample } from "@/components/portal/document-example"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"

/**
 * ONE requirement, ONE card — the single presentation of a requirement, rendered by
 * BOTH the self-guided checklist and the concierge vault (ONE_SURFACE_AND_LON_FIXES
 * Part A). It owns the title, the status pill, the destination badge, every review /
 * status note, and the action control (upload / questionnaire / how-to / helpers).
 * A requirement's look is defined here, once; any improvement lands on both surfaces.
 */
export interface ReqChecklistItem {
  id: string
  reqCode: string
  status: string // na | pending | satisfied | rejected
  title: string
  description: string | null
  authority: string | null
  severity: string
  documentType: string | null
  ladder: LadderState
  reviewNote: string | null
  reviewerKind: string | null
  legalStatus: string
  legalCitation: string | null
  parts?: { have: number; need: number }
  sponsorManaged?: boolean
  preparedBySponsor?: boolean
  destination?: "portal_upload" | "interview" | "internal"
}

/** Everything a card's action control needs — assembled once per surface. */
export interface RequirementCardCtx {
  caseId: string
  clientId: string
  prefills: Record<string, Record<string, unknown>>
  generated: Record<string, GeneratedDoc>
  currentByReq: Record<string, CurrentDoc>
  referenceProgress: ReferenceProgress | null
  cohabitantProgress: ReferenceProgress | null
  signatureOnFile: string | null
  feeSummary: FeeSummary
  feeReceipts: FeeReceipts
  dmvApplicant: DmvApplicant
  caseSponsored: boolean
  licenseTrack: string | null
  isConcierge: boolean
}

const DESTINATION_COPY: Record<string, { label: string; cls: string }> = {
  portal_upload: { label: "Upload to NYPD portal", cls: "border-signal/40 bg-signal/10 text-signal" },
  interview: { label: "Bring to your interview", cls: "border-brass/40 bg-brass/10 text-brass" },
  internal: { label: "We handle this", cls: "border-hairline bg-surface-3 text-text-low" },
}

const LADDER_TONE: Record<string, string> = {
  muted: "bg-surface-2 text-text-mid",
  signal: "bg-signal-dim text-signal",
  brass: "bg-brass/12 text-brass-bright",
  ok: "bg-ok/10 text-ok",
  warn: "bg-warn/10 text-warn",
}

function LadderBadge({ item }: { item: ReqChecklistItem }) {
  const copy = LADDER_COPY[item.ladder]
  const { messages } = usePortalI18n()
  const t = messages.ui
  const label = item.ladder === "pending"
    ? t.checklistStatusNotStarted
    : item.ladder === "waiting"
      ? t.checklistStatusWaiting
      : item.ladder === "submitted"
        ? t.checklistStatusReceived
        : item.ladder === "approved"
          ? t.checklistStatusApproved
          : t.checklistStatusFix
  const hint = item.ladder === "pending"
    ? t.checklistStatusPendingHint
    : item.ladder === "waiting"
      ? t.checklistStatusWaitingHint
      : item.ladder === "submitted"
        ? t.checklistStatusReceivedHint
        : item.ladder === "approved"
          ? t.checklistStatusApprovedHint
          : t.checklistStatusFixHint
  return (
    <span
      title={hint}
      className={cn("shrink-0 rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", LADDER_TONE[copy.tone])}
    >
      {label}
    </span>
  )
}

const GLOW_BY_TONE: Record<string, string> = {
  muted: "glow-neutral",
  signal: "glow-review",
  brass: "glow-received",
  ok: "glow-ok",
  warn: "glow-fix",
}

const ICON_TONE: Record<string, string> = {
  muted: "text-text-mid",
  signal: "text-signal",
  brass: "text-brass-bright",
  ok: "text-ok",
  warn: "text-warn",
}

const CATEGORY_ICON: Record<string, LucideIcon> = {
  identity: Fingerprint,
  residence: House,
  records: Scale,
  credentials: Medal,
  training: GraduationCap,
  people: Users,
  prepared: FileText,
  conditional: Medal,
  sponsor: Users,
  admin: Receipt,
}

const REQ_ICON: Record<string, LucideIcon> = {
  "ELG-01": ShieldCheck,
  "ELG-02": ShieldCheck,
  "ELG-03": ShieldCheck,
  "IDN-01": IdCard,
  "IDN-02": BadgeCheck,
  "IDN-03": Globe,
  "IDN-04": Camera,
  "PHO-01": Camera,
  "RES-01": House,
  "NAM-01": PenLine,
  "COH-01": Users,
  "REF-01": UserCheck,
  "REF-02": UserCheck,
  "TRN-01": GraduationCap,
  "RNW-01": RefreshCw,
  "DSC-01": ClipboardList,
  "QUE-01": ClipboardList,
  "ARR-01": Gavel,
  "OOP-01": ShieldAlert,
  "DIR-01": FileWarning,
  "DMV-01": Car,
  "GMC-01": BadgeCheck,
  "SOC-01": AtSign,
  "SAF-01": Lock,
  "FEE-01": Receipt,
  "AFF-01": FileSignature,
  "FMT-01": PackageCheck,
  "MIL-01": Medal,
  "LEO-01": ShieldCheck,
  "LEO-02": ShieldCheck,
  "LEO-03": ShieldCheck,
  "OOS-01": Plane,
  "OOS-02": Plane,
  "PRM-01": Building2,
  "SPC-01": Star,
}

const PRIORITY_DOT: Record<string, string> = {
  critical: "bg-danger",
  high: "bg-warn",
}

export function RequirementCard({
  item,
  ctx,
  presentation = "standard",
  selected = false,
  onSelect,
  rowSubline,
  showStatusOnPhone = true,
  onClose,
}: {
  item: ReqChecklistItem
  ctx: RequirementCardCtx
  presentation?: "standard" | "concierge" | "row" | "panel"
  selected?: boolean
  onSelect?: () => void
  rowSubline?: string
  showStatusOnPhone?: boolean
  onClose?: () => void
}) {
  const [guideOpen, setGuideOpen] = useState(false)
  const { messages } = usePortalI18n()
  const t = messages.ui
  const tone = isUnenforced(item.legalStatus) ? "muted" : LADDER_COPY[item.ladder].tone
  const dot = PRIORITY_DOT[item.severity]
  const Icon = REQ_ICON[item.reqCode] ?? CATEGORY_ICON[categoryKeyFor(item.reqCode)] ?? FileText
  const action = actionFor(item.reqCode)
  const concierge = presentation === "concierge"
  const row = presentation === "row"
  const panel = presentation === "panel"
  const guideId = `guide-${item.id}`
  const guideSteps = action
    ? action.mode === "obtain" && action.steps.length > 0
      ? action.steps
      : [action.help]
    : []

  const statusBadge = isUnenforced(item.legalStatus) ? (
    <span className="shrink-0 rounded-full bg-signal-dim px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-signal">
      {t.checklistNotRequired}
    </span>
  ) : (
    <LadderBadge item={item} />
  )

  if (row) {
    const approved = item.ladder === "approved" || item.status === "satisfied"
    return (
      <li id={item.reqCode} className="scroll-mt-44 sm:scroll-mt-28">
        <button
          id={`checklist-row-${item.reqCode}`}
          type="button"
          aria-controls="checklist-item-panel"
          aria-current={selected ? "true" : undefined}
          onClick={onSelect}
          className={cn(
            "relative flex min-h-[68px] w-full items-center gap-3 border-l-[3px] px-2.5 py-3 text-left transition-colors focus-visible:z-10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-signal/35 sm:px-3",
            selected
              ? "border-l-[var(--portal-navy)] bg-[linear-gradient(90deg,rgba(20,37,74,.09),rgba(20,37,74,.025)_70%,transparent)]"
              : "border-l-transparent hover:bg-surface-2/65"
          )}
        >
          <span
            aria-hidden
            className={cn(
              "flex size-[34px] shrink-0 items-center justify-center rounded-[10px] border",
              approved ? "border-ok/25 bg-ok/[0.08] text-ok" : "border-hairline bg-surface-2 text-[var(--portal-navy)]"
            )}
          >
            {approved ? <Check className="size-4" strokeWidth={2.5} /> : <Icon className="size-4" />}
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[14px] font-semibold text-foreground">{action?.customerTitle ?? item.title}</span>
            <span className="mt-0.5 block truncate text-[12px] text-text-low">{rowSubline ?? LADDER_COPY[item.ladder].hint}</span>
          </span>
          {dot ? (
            <span className="hidden shrink-0 font-mono text-[9px] font-semibold uppercase tracking-[0.1em] text-danger lg:inline">
              · {t.checklistHighPriority}
            </span>
          ) : null}
          <span className={cn("shrink-0", !showStatusOnPhone && "hidden sm:inline-flex")}>{statusBadge}</span>
        </button>
      </li>
    )
  }

  if (panel) {
    const destination = item.destination === "portal_upload"
      ? t.checklistDestinationPortal
      : item.destination === "interview"
        ? t.checklistDestinationInterview
        : t.checklistDestinationInternal
    const received = item.ladder === "submitted"
    const approved = item.ladder === "approved" || item.status === "satisfied"
    return (
      <article id="checklist-item-panel" className="min-h-full bg-white">
        <div className="sticky top-0 z-10 border-b border-hairline bg-white/96 px-5 pb-4 pt-[max(1rem,env(safe-area-inset-top))] backdrop-blur-xl">
          <div className="flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-2">
              {onClose ? (
                <button type="button" onClick={onClose} aria-label={t.checklistBackToItems} className="-ml-1 flex size-9 shrink-0 items-center justify-center rounded-full text-[var(--portal-navy)] hover:bg-surface-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/35 xl:hidden">
                  <ArrowLeft className="size-5" />
                </button>
              ) : null}
              {statusBadge}
            </div>
            <span className="shrink-0 font-mono text-[10px] uppercase tracking-[0.1em] text-text-low">{item.reqCode}</span>
          </div>
          <h2 id="checklist-item-panel-title" tabIndex={-1} className="portal-title-font mt-3 text-[23px] font-medium leading-[1.16] tracking-[-.015em] outline-none">
            {action?.customerTitle ?? item.title}
          </h2>
        </div>

        <div className="space-y-5 p-5">
          {item.description ? <p className="text-[14px] leading-6 text-text-mid">{item.description}</p> : null}
          <span className={cn("inline-flex rounded-full border px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[.07em]", DESTINATION_COPY[item.destination ?? "internal"]?.cls ?? DESTINATION_COPY.internal.cls)}>
            {destination}
          </span>

          {(item.reviewNote || item.ladder === "changes_requested" || item.status === "rejected") ? (
            <section className="rounded-2xl border border-warn/30 bg-warn/[0.08] p-4">
              <p className="font-mono text-[10px] font-semibold uppercase tracking-[.14em] text-warn">{t.checklistWhatNeedsFixing}</p>
              <p className="mt-1.5 text-[12px] font-semibold text-warn">{t.checklistFrom} {item.reviewerKind === "trainer" ? t.checklistInstructorReviewer : reviewerLabel(item.reviewerKind)}</p>
              <p className="mt-2 text-[13px] leading-5 text-text-mid">{item.reviewNote ?? t.checklistFixFallback}</p>
            </section>
          ) : null}

          {isUnenforced(item.legalStatus) ? (
            <p className="flex items-start gap-2 rounded-2xl border border-signal/25 bg-signal/[0.05] p-4 text-[13px] leading-5 text-signal">
              <Gavel className="mt-0.5 size-4 shrink-0" />
              <span><strong>{t.checklistNotCurrentlyRequired}</strong> — {t.checklistCourtStoppedExplanation}{item.legalCitation ? ` (${item.legalCitation})` : ""}.</span>
            </p>
          ) : received ? (
            <p className="rounded-2xl border border-hairline bg-surface-2/45 p-4 text-[13px] leading-5 text-text-mid">{t.checklistStatusReceivedHint}</p>
          ) : approved ? (
            <p className="flex items-center gap-2 rounded-2xl border border-ok/25 bg-ok/[0.055] p-4 text-[13px] text-ok"><Check className="size-4" />{t.checklistStatusApprovedHint}</p>
          ) : item.sponsorManaged ? (
            <p className="rounded-2xl border border-hairline bg-surface-2/45 p-4 text-[13px] leading-5 text-text-mid">{t.checklistSponsorHandles}</p>
          ) : (
            <div className={cn(action?.mode === "obtain" && "[&>div>button:first-child]:hidden")}>
              <RequirementAction
                reqCode={item.reqCode}
                status={item.status}
                caseId={ctx.caseId}
                clientId={ctx.clientId}
                prefill={ctx.prefills[item.reqCode] ?? {}}
                generated={ctx.generated[item.reqCode] ?? null}
                current={ctx.currentByReq[item.reqCode] ?? null}
                referenceProgress={ctx.referenceProgress}
                cohabitantProgress={ctx.cohabitantProgress}
                signatureOnFile={ctx.signatureOnFile}
                feeSummary={ctx.feeSummary}
                feeReceipts={ctx.feeReceipts}
                dmvApplicant={item.reqCode === "DMV-01" ? ctx.dmvApplicant : null}
                lockParty={ctx.caseSponsored ? "applicant" : undefined}
                licenseTrack={ctx.licenseTrack}
                isConcierge={ctx.isConcierge}
              />
            </div>
          )}

          {item.parts && item.parts.have > 0 && item.parts.have < item.parts.need && !item.sponsorManaged ? (
            <p className="rounded-2xl border border-brass/30 bg-brass/[0.06] p-3 text-[12px] text-brass-bright">
              {interpolatePanel(t.checklistPartsUploaded, { have: item.parts.have, need: item.parts.need, remaining: item.parts.need - item.parts.have })}
            </p>
          ) : null}

          {item.preparedBySponsor && !item.sponsorManaged && item.ladder !== "approved" ? (
            <p className="rounded-2xl border border-brass/30 bg-brass/[0.06] p-3 text-[12px] leading-5 text-text-mid">{t.checklistSponsorPrepared}</p>
          ) : null}

          {action && guideSteps.length > 0 && !isUnenforced(item.legalStatus) ? (
            <section className="border-t border-hairline pt-5">
              <h3 className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-text-low">{t.checklistHowToGetIt}</h3>
              <ol className="mt-3 space-y-3">
                {guideSteps.map((step, index) => (
                  <li key={`${item.reqCode}-panel-${index}`} className="flex gap-3 text-[13px] leading-5 text-text-mid">
                    <span className="flex size-6 shrink-0 items-center justify-center rounded-full border border-brass/35 bg-brass/[0.08] font-mono text-[10px] font-semibold text-brass-bright">{index + 1}</span>
                    <span className="pt-0.5">{step}</span>
                  </li>
                ))}
              </ol>
            </section>
          ) : null}

          {item.authority ? (
            <p className="border-t border-hairline pt-4 font-mono text-[10px] leading-4 text-text-low">{t.checklistSource}: {item.authority}</p>
          ) : null}
        </div>
      </article>
    )
  }

  const titleAndDescription = (
    <>
      <h4 className="font-display text-base font-semibold leading-[1.3]">
        {action?.customerTitle ?? item.title}
      </h4>
      {item.destination && DESTINATION_COPY[item.destination] ? (
        concierge ? (
          <p className="concierge-requirement-destination">
            <MapPin className="size-3.5" aria-hidden />
            {DESTINATION_COPY[item.destination].label}
          </p>
        ) : (
          <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${DESTINATION_COPY[item.destination].cls}`}>
            {DESTINATION_COPY[item.destination].label}
          </span>
        )
      ) : null}
      {item.description ? (
        <p className="concierge-requirement-description mt-1 line-clamp-3 text-[13px] leading-[1.55] text-muted-foreground [text-wrap:pretty]">
          {item.description}
        </p>
      ) : null}
    </>
  )

  const actionContent = (
    <>
      {isUnenforced(item.legalStatus) ? (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-signal/30 bg-signal/5 p-2 text-xs text-signal">
          <Gavel className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <span className="font-medium">Not currently required</span> — this rule is
            {item.legalStatus === "repealed" ? " no longer law" : " under a court order"}
            {item.legalCitation ? ` (${item.legalCitation})` : ""}. NYPD&apos;s published checklist may still
            list it. You don&apos;t need to provide it, and it will never hold up your filing.
          </span>
        </p>
      ) : null}

      {item.ladder === "changes_requested" && item.reviewNote ? (
        <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-warn/30 bg-warn/10 p-2 text-xs text-warn">
          <MessageSquareWarning className="mt-0.5 size-3.5 shrink-0" />
          <span>
            <span className="font-medium">{reviewerLabel(item.reviewerKind)} asked for a fix:</span> {item.reviewNote}
          </span>
        </p>
      ) : null}

      {item.ladder === "approved" ? (
        <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ok">
          <Check className="size-3.5" />
          {reviewerLabel(item.reviewerKind) === "your instructor"
            ? "Your instructor reviewed this — looks good."
            : "Reviewed and accepted."}
        </p>
      ) : null}

      {item.sponsorManaged ? (
        <p className="mt-2 rounded-md border border-hairline bg-surface-2/40 px-3 py-2 text-xs text-text-mid">
          Your sponsor handles this — we&apos;ll show it as done once they&apos;ve sent it. Nothing for you to do here.
        </p>
      ) : !isUnenforced(item.legalStatus) ? (
        <RequirementAction
          reqCode={item.reqCode}
          status={item.status}
          caseId={ctx.caseId}
          clientId={ctx.clientId}
          prefill={ctx.prefills[item.reqCode] ?? {}}
          generated={ctx.generated[item.reqCode] ?? null}
          current={ctx.currentByReq[item.reqCode] ?? null}
          referenceProgress={ctx.referenceProgress}
          cohabitantProgress={ctx.cohabitantProgress}
          signatureOnFile={ctx.signatureOnFile}
          feeSummary={ctx.feeSummary}
          feeReceipts={ctx.feeReceipts}
          dmvApplicant={item.reqCode === "DMV-01" ? ctx.dmvApplicant : null}
          lockParty={ctx.caseSponsored ? "applicant" : undefined}
          licenseTrack={ctx.licenseTrack}
          isConcierge={ctx.isConcierge}
        />
      ) : null}

      {item.parts && item.parts.have > 0 && item.parts.have < item.parts.need && !item.sponsorManaged ? (
        <p className="mt-2 rounded-md border border-brass/30 bg-brass/[0.06] px-3 py-2 text-xs text-brass-bright">
          {item.parts.have} of {item.parts.need} uploaded — add the{" "}
          {item.parts.need - item.parts.have === 1 ? "remaining part" : "remaining parts"} to complete this.
        </p>
      ) : null}

      {item.preparedBySponsor && !item.sponsorManaged && item.ladder !== "approved" ? (
        <p className="mt-2 rounded-md border border-brass/30 bg-brass/[0.06] px-3 py-2 text-xs text-text-mid">
          Your sponsor prepared this for you. Review it and sign — only you can sign.
        </p>
      ) : null}

      {concierge && action && guideSteps.length > 0 ? (
        <div className="concierge-how-wrap">
          <button
            type="button"
            className="concierge-how-button"
            onClick={() => setGuideOpen((value) => !value)}
            aria-expanded={guideOpen}
            aria-controls={guideId}
          >
            <CircleHelp className="size-4" aria-hidden /> {guideOpen ? "Hide guide" : "How"}
          </button>
          {guideOpen ? (
            <div id={guideId} className="concierge-how-guide">
              <div className="concierge-how-title">
                <span aria-hidden>?</span>
                <div>
                  <small>Step-by-step</small>
                  <strong>How to complete {action.customerTitle ?? item.title}</strong>
                </div>
              </div>
              <ol>
                {guideSteps.map((step, index) => (
                  <li key={`${item.reqCode}-${index}`}><span>{index + 1}</span><p>{step}</p></li>
                ))}
              </ol>
              {action.example ? <DocumentExample id={action.example} /> : null}
              <Link href="/portal/messages" className="concierge-how-help">
                <MessageCircle className="size-4" aria-hidden /> Still stuck? Ask your team
              </Link>
            </div>
          ) : null}
        </div>
      ) : null}
    </>
  )

  return (
    <li
      id={item.reqCode}
      className={cn(
        "scroll-mt-40 card-raised p-5 sm:scroll-mt-24",
        concierge && "concierge-requirement-card",
        GLOW_BY_TONE[tone] ?? "glow-neutral"
      )}
    >
      <div className="concierge-requirement-status mb-2.5 flex items-center justify-between gap-2">
        {statusBadge}
        {!concierge ? (
          <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-wide text-text-low/70">{item.reqCode}</span>
        ) : null}
      </div>
      <div className={cn("flex items-start gap-3", concierge && "concierge-requirement-layout")}>
        <div className={cn("min-w-0", concierge && "concierge-requirement-summary")}>
          <div className="relative shrink-0" aria-hidden>
            <div className="icon-tile">
              <Icon className={cn("size-5", ICON_TONE[tone] ?? "text-text-mid")} />
            </div>
            {!concierge && dot ? <span className={cn("absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-surface-1", dot)} /> : null}
          </div>
          <div className="min-w-0 flex-1">
            {!concierge && dot ? <span className="sr-only">Priority: {item.severity.replace(/_/g, " ")}</span> : null}
            {titleAndDescription}
            {!concierge ? actionContent : null}
            {!concierge ? <div className="mt-3 flex items-end justify-between gap-3">
            <details className="min-w-0 text-[11px] text-text-low">
              <summary className="cursor-pointer select-none rounded transition-colors hover:text-text-mid focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/40">
                Official requirement
              </summary>
              <p className="mt-1 font-mono text-[10px] leading-relaxed">
                {item.title}
                {item.authority ? ` · ${item.authority}` : ""}
              </p>
            </details>
            <span className="shrink-0 font-mono text-[10px] tracking-wide text-text-low/70">{item.reqCode}</span>
            </div> : null}
          </div>
        </div>
        {concierge ? <div className="concierge-requirement-actions">{actionContent}</div> : null}
      </div>
    </li>
  )
}

function interpolatePanel(template: string, values: Record<string, string | number>): string {
  return Object.entries(values).reduce(
    (result, [key, value]) => result.replaceAll(`{${key}}`, String(value)),
    template
  )
}
