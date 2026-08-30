"use client"

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
  return (
    <span
      title={copy.hint}
      className={cn("shrink-0 rounded px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide", LADDER_TONE[copy.tone])}
    >
      {copy.label}
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

export function RequirementCard({ item, ctx }: { item: ReqChecklistItem; ctx: RequirementCardCtx }) {
  const tone = isUnenforced(item.legalStatus) ? "muted" : LADDER_COPY[item.ladder].tone
  const dot = PRIORITY_DOT[item.severity]
  const Icon = REQ_ICON[item.reqCode] ?? CATEGORY_ICON[categoryKeyFor(item.reqCode)] ?? FileText

  return (
    <li id={item.reqCode} className={cn("scroll-mt-40 card-raised p-5 sm:scroll-mt-24", GLOW_BY_TONE[tone] ?? "glow-neutral")}>
      <div className="mb-2.5 flex items-center justify-between gap-2">
        {isUnenforced(item.legalStatus) ? (
          <span className="shrink-0 rounded-full bg-signal-dim px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-signal">
            Not required
          </span>
        ) : (
          <LadderBadge item={item} />
        )}
        <span className="shrink-0 font-mono text-[9.5px] uppercase tracking-wide text-text-low/70">{item.reqCode}</span>
      </div>
      <div className="flex items-start gap-3">
        <div className="relative shrink-0" aria-hidden>
          <div className="icon-tile">
            <Icon className={cn("size-5", ICON_TONE[tone] ?? "text-text-mid")} />
          </div>
          {dot && <span className={cn("absolute -right-0.5 -top-0.5 size-2.5 rounded-full ring-2 ring-surface-1", dot)} />}
        </div>

        <div className="min-w-0 flex-1">
          {dot && <span className="sr-only">Priority: {item.severity.replace(/_/g, " ")}</span>}
          <h4 className="font-display text-base font-semibold leading-[1.3]">
            {actionFor(item.reqCode)?.customerTitle ?? item.title}
          </h4>
          {item.destination && DESTINATION_COPY[item.destination] && (
            <span className={`mt-1 inline-block rounded-full border px-2 py-0.5 text-[10px] font-medium uppercase tracking-wide ${DESTINATION_COPY[item.destination].cls}`}>
              {DESTINATION_COPY[item.destination].label}
            </span>
          )}
          {item.description && (
            <p className="mt-1 line-clamp-3 text-[13px] leading-[1.55] text-muted-foreground [text-wrap:pretty]">{item.description}</p>
          )}

          {isUnenforced(item.legalStatus) && (
            <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-signal/30 bg-signal/5 p-2 text-xs text-signal">
              <Gavel className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="font-medium">Not currently required</span> — this rule is
                {item.legalStatus === "repealed" ? " no longer law" : " under a court order"}
                {item.legalCitation ? ` (${item.legalCitation})` : ""}. NYPD&apos;s published checklist may still
                list it. You don&apos;t need to provide it, and it will never hold up your filing.
              </span>
            </p>
          )}

          {item.ladder === "changes_requested" && item.reviewNote && (
            <p className="mt-2.5 flex items-start gap-1.5 rounded-md border border-warn/30 bg-warn/10 p-2 text-xs text-warn">
              <MessageSquareWarning className="mt-0.5 size-3.5 shrink-0" />
              <span>
                <span className="font-medium">{reviewerLabel(item.reviewerKind)} asked for a fix:</span> {item.reviewNote}
              </span>
            </p>
          )}

          {item.ladder === "approved" && (
            <p className="mt-2.5 flex items-center gap-1.5 text-xs text-ok">
              <Check className="size-3.5" />
              {reviewerLabel(item.reviewerKind) === "your instructor"
                ? "Your instructor reviewed this — looks good."
                : "Reviewed and accepted."}
            </p>
          )}

          {item.sponsorManaged ? (
            <p className="mt-2 rounded-md border border-hairline bg-surface-2/40 px-3 py-2 text-xs text-text-mid">
              Your sponsor handles this — we&apos;ll show it as done once they&apos;ve sent it. Nothing for you to do here.
            </p>
          ) : (
            !isUnenforced(item.legalStatus) && (
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
            )
          )}

          {item.parts && item.parts.have > 0 && item.parts.have < item.parts.need && !item.sponsorManaged && (
            <p className="mt-2 rounded-md border border-brass/30 bg-brass/[0.06] px-3 py-2 text-xs text-brass-bright">
              {item.parts.have} of {item.parts.need} uploaded — add the{" "}
              {item.parts.need - item.parts.have === 1 ? "remaining part" : "remaining parts"} to complete this.
            </p>
          )}

          {item.preparedBySponsor && !item.sponsorManaged && item.ladder !== "approved" && (
            <p className="mt-2 rounded-md border border-brass/30 bg-brass/[0.06] px-3 py-2 text-xs text-text-mid">
              Your sponsor prepared this for you. Review it and sign — only you can sign.
            </p>
          )}

          <div className="mt-3 flex items-end justify-between gap-3">
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
          </div>
        </div>
      </div>
    </li>
  )
}
