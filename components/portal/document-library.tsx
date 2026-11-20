"use client"

import Link from "next/link"
import { useRouter } from "next/navigation"
import { useEffect, useMemo, useState } from "react"
import {
  ChevronDown,
  ChevronRight,
  Download,
  FileText,
  RotateCcw,
  SlidersHorizontal,
  Sparkles,
  Upload,
  X,
} from "lucide-react"
import { CATEGORIES } from "@/lib/requirements/categories"
import type { LadderState } from "@/lib/requirements/ladder"
import { formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"

export interface LibraryFile {
  id: string
  name: string
  url: string | null
  createdAt: string
  status: string
  generated: boolean
  signedAt: string | null
}

export interface LibraryEntry {
  reqCode: string
  title: string
  officialTitle: string
  status: string
  ladder: LadderState
  destination: "portal_upload" | "interview" | "internal" | null
  categoryKey: string
  parts: { have: number; need: number } | null
  files: LibraryFile[]
}

type TabKey = "all" | "prepared" | "uploaded" | "other"
type GroupKey = "status" | "destination" | "section"
type StatusGroupKey = "to_sign" | "needs_fix" | "checking" | "approved"

interface LibraryRow {
  key: string
  file: LibraryFile
  reqCode: string | null
  title: string
  officialTitle: string | null
  ladder: LadderState
  destination: LibraryEntry["destination"]
  categoryKey: string | null
  parts: LibraryEntry["parts"]
  draft: boolean
  needsFix: boolean
  loose: boolean
}

interface RowGroup {
  key: string
  label: string
  detail?: string
  rows: LibraryRow[]
  ready?: number
}

const TAB_KEYS = new Set<TabKey>(["all", "prepared", "uploaded", "other"])
const GROUP_KEYS = new Set<GroupKey>(["status", "destination", "section"])

const STATUS_TONES: Record<LadderState, string> = {
  pending: "border-brass/25 bg-brass/10 text-brass-bright",
  waiting: "border-hairline bg-surface-3 text-text-mid",
  submitted: "border-signal/25 bg-signal-dim text-signal",
  approved: "border-ok/25 bg-ok/10 text-ok",
  changes_requested: "border-warn/25 bg-warn/10 text-warn",
}

function ladderFromLooseFile(file: LibraryFile): LadderState {
  if (file.status === "approved" || file.status === "satisfied") return "approved"
  if (file.status === "rejected" || file.status === "changes_requested") return "changes_requested"
  return "submitted"
}

function rowLadder(row: LibraryRow): LadderState {
  if (row.draft) return "pending"
  if (row.needsFix) return "changes_requested"
  return row.ladder
}

function statusGroup(row: LibraryRow): StatusGroupKey {
  if (row.draft) return "to_sign"
  if (row.needsFix) return "needs_fix"
  return rowLadder(row) === "approved" ? "approved" : "checking"
}

function rowIsReady(row: LibraryRow) {
  return rowLadder(row) === "approved" && (!row.file.generated || !!row.file.signedAt)
}

function flattenRows(entries: LibraryEntry[], loose: LibraryFile[]): LibraryRow[] {
  const linked = entries.flatMap((entry) =>
    entry.files.map((file) => ({
      key: `${entry.reqCode}:${file.id}`,
      file,
      reqCode: entry.reqCode,
      title: entry.title,
      officialTitle: entry.officialTitle,
      ladder: entry.ladder,
      destination: entry.destination,
      categoryKey: entry.categoryKey,
      parts: entry.parts,
      draft: file.generated && !file.signedAt,
      needsFix:
        entry.ladder === "changes_requested" ||
        file.status === "rejected" ||
        file.status === "changes_requested",
      loose: false,
    }))
  )
  return [
    ...linked,
    ...loose.map((file) => ({
      key: `loose:${file.id}`,
      file,
      reqCode: null,
      title: file.name,
      officialTitle: null,
      ladder: ladderFromLooseFile(file),
      destination: null,
      categoryKey: null,
      parts: null,
      draft: false,
      needsFix: file.status === "rejected" || file.status === "changes_requested",
      loose: true,
    })),
  ]
}

function fileKind(file: LibraryFile) {
  if (file.generated) return { label: "DOC", cls: "border-brass/25 bg-brass/10 text-brass-bright" }
  const extension = file.name.split(".").pop()?.toLowerCase()
  if (extension === "pdf") return { label: "PDF", cls: "border-danger/20 bg-danger/[0.07] text-danger" }
  if (["jpg", "jpeg", "png", "heic", "webp"].includes(extension ?? "")) {
    return { label: extension === "png" ? "PNG" : "JPG", cls: "border-signal/20 bg-signal/[0.07] text-signal" }
  }
  return { label: "FILE", cls: "border-hairline bg-surface-3 text-text-mid" }
}

function FileThumb({ file }: { file: LibraryFile }) {
  const kind = fileKind(file)
  return (
    <span className={cn("relative grid size-[42px] shrink-0 place-items-center overflow-hidden rounded-lg border", kind.cls)} aria-hidden>
      <FileText className="size-[18px]" strokeWidth={1.7} />
      <span className="absolute inset-x-0 bottom-0 bg-current/10 py-0.5 text-center font-mono text-[8px] font-bold tracking-[.08em]">
        {kind.label}
      </span>
      <span className="absolute right-0 top-0 size-2.5 -translate-y-1/2 translate-x-1/2 rotate-45 border border-current/30 bg-white/70" />
    </span>
  )
}

function StatusPill({ ladder }: { ladder: LadderState }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  const label = ladder === "pending"
    ? t.checklistStatusNotStarted
    : ladder === "waiting"
      ? t.checklistStatusWaiting
      : ladder === "submitted"
        ? t.checklistStatusReceived
        : ladder === "approved"
          ? t.checklistStatusApproved
          : t.checklistStatusFix
  return (
    <span className={cn("inline-flex w-fit rounded-full border px-2.5 py-1 text-[11px] font-semibold", STATUS_TONES[ladder])}>
      {label}
    </span>
  )
}

function entryDisplayLadder(entry: LibraryEntry): LadderState {
  if (entry.files.some((file) => file.generated && !file.signedAt)) {
    return "pending";
  }

  if (
    entry.ladder === "changes_requested" ||
    entry.files.some((file) => file.status === "rejected")
  ) {
    return "changes_requested";
  }

  return entry.ladder;
}

function SourceBadge({ generated }: { generated: boolean }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  return generated ? (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-brass/25 bg-brass/10 px-2.5 py-1 text-[11px] font-semibold text-brass-bright">
      <Sparkles className="size-3" aria-hidden /> {t.documentsPreparedForYou}
    </span>
  ) : (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-hairline bg-surface-2 px-2.5 py-1 text-[11px] font-semibold text-text-mid">
      <Upload className="size-3" aria-hidden /> {t.documentsUploadedByYou}
    </span>
  )
}

function FileMeta({ row, compact = false }: { row: LibraryRow; compact?: boolean }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  const verb = row.file.generated ? t.documentsPreparedOn : t.documentsUploadedOn
  return (
    <div className={cn("min-w-0", compact && "text-[12px]") }>
      <p className={cn("truncate text-[12px] text-text-mid", compact && "mt-0.5")}>
        {row.file.name} · {verb} {formatDate(row.file.createdAt)}
      </p>
      {row.file.signedAt ? (
        <p className="mt-0.5 text-[11px] text-text-low">{t.documentsSignedOn} {formatDate(row.file.signedAt)}</p>
      ) : null}
      {row.draft ? (
        <p className="mt-1 font-mono text-[10px] font-semibold uppercase tracking-[.09em] text-warn">
          {t.documentsDraftNotSigned}
        </p>
      ) : null}
    </div>
  )
}

function DownloadAction({ row, compact = false }: { row: LibraryRow; compact?: boolean }) {
  const router = useRouter()
  const { messages } = usePortalI18n()
  const t = messages.ui
  const [error, setError] = useState(false)
  const [opening, setOpening] = useState(false)

  if (!row.file.url) return null

  const openFile = async () => {
    setError(false)
    setOpening(true)
    const popup = window.open("about:blank", "_blank")
    try {
      let response = await fetch(row.file.url!, { method: "HEAD", cache: "no-store" })
      if (response.status === 405) {
        response = await fetch(row.file.url!, { headers: { Range: "bytes=0-0" }, cache: "no-store" })
      }
      if (!response.ok) throw new Error(`Document link returned ${response.status}`)
      if (popup) {
        popup.opener = null
        popup.location.href = row.file.url!
      } else {
        window.open(row.file.url!, "_blank", "noopener,noreferrer")
      }
    } catch {
      popup?.close()
      setError(true)
    } finally {
      setOpening(false)
    }
  }

  return (
    <div className={cn("flex flex-col items-end gap-1.5", compact && "items-stretch") }>
      <button
        type="button"
        onClick={openFile}
        disabled={opening}
        aria-label={`${t.documentsDownload} ${row.title}`}
        className={cn(
          "inline-flex min-h-9 items-center justify-center gap-1.5 rounded-lg border border-hairline bg-white px-3 text-[12px] font-semibold text-foreground transition hover:border-foreground/20 disabled:opacity-60",
          compact && "w-full"
        )}
      >
        <Download className="size-3.5" aria-hidden /> {opening ? t.documentsOpening : t.documentsDownload}
      </button>
      {error ? (
        <div className="max-w-[240px] rounded-lg border border-danger/20 bg-danger/[0.06] p-2 text-left text-[11px] leading-4 text-danger" role="alert">
          <p>{t.documentsCouldNotOpen}</p>
          <button
            type="button"
            onClick={() => {
              setError(false)
              router.refresh()
            }}
            className="mt-1.5 inline-flex items-center gap-1 font-semibold underline"
          >
            <RotateCcw className="size-3" aria-hidden /> {t.documentsTryAgain}
          </button>
        </div>
      ) : null}
    </div>
  )
}

function RowAction({ row, compact = false }: { row: LibraryRow; compact?: boolean }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  if (row.draft && row.reqCode) {
    return (
      <Link
        href={`/portal/checklist?item=${encodeURIComponent(row.reqCode)}`}
        aria-label={`${t.documentsReadSign} ${row.title}`}
        className={cn(
          "inline-flex min-h-9 items-center justify-center rounded-lg [background:var(--portal-gold-button)] px-3 text-[12px] font-semibold text-[#0b1220]",
          compact && "w-full"
        )}
      >
        {t.documentsReadSign}
      </Link>
    )
  }
  if (row.needsFix && row.reqCode) {
    return (
      <Link
        href={`/portal/checklist?item=${encodeURIComponent(row.reqCode)}`}
        aria-label={`${t.documentsReplace} ${row.title}`}
        className={cn(
          "inline-flex min-h-9 items-center justify-center rounded-lg border border-warn/30 bg-warn/[0.08] px-3 text-[12px] font-semibold text-warn",
          compact && "w-full"
        )}
      >
        {t.documentsReplace}
      </Link>
    )
  }
  return <DownloadAction row={row} compact={compact} />
}

function groupsFor(
  rows: LibraryRow[],
  grouping: GroupKey,
  t: Record<string, string>,
  categoryLabels: Record<string, string>
): RowGroup[] {
  if (grouping === "destination") {
    const definitions: Array<{ key: string; label: string; detail: string }> = [
      { key: "portal_upload", label: t.documentsGroupPortal, detail: t.documentsGroupPortalDetail },
      { key: "interview", label: t.documentsGroupInterview, detail: t.documentsGroupInterviewDetail },
      { key: "internal", label: t.documentsGroupInternal, detail: t.documentsGroupInternalDetail },
      { key: "none", label: t.documentsGroupNone, detail: "" },
    ]
    return definitions.flatMap((definition) => {
      const grouped = rows.filter((row) => (row.destination ?? "none") === definition.key)
      return grouped.length
        ? [{ ...definition, rows: grouped, ready: grouped.filter(rowIsReady).length }]
        : []
    })
  }

  if (grouping === "section") {
    const sectionGroups = CATEGORIES.flatMap((category) => {
      const grouped = rows.filter((row) => row.categoryKey === category.key)
      return grouped.length
        ? [{ key: category.key, label: categoryLabels[category.key] ?? category.label, rows: grouped }]
        : []
    })
    const other = rows.filter((row) => !row.categoryKey)
    return other.length
      ? [...sectionGroups, { key: "other", label: t.documentsTabOther, rows: other }]
      : sectionGroups
  }

  const definitions: Array<{ key: StatusGroupKey; label: string }> = [
    { key: "to_sign", label: t.documentsGroupToSign },
    { key: "needs_fix", label: t.documentsGroupNeedsFix },
    { key: "checking", label: t.documentsGroupBeingChecked },
    { key: "approved", label: t.documentsGroupApproved },
  ]
  return definitions.flatMap((definition) => {
    const grouped = rows.filter((row) => statusGroup(row) === definition.key)
    return grouped.length ? [{ ...definition, rows: grouped }] : []
  })
}

function destinationLabel(destination: LibraryEntry["destination"], t: Record<string, string>) {
  if (destination === "portal_upload") return t.checklistDestinationPortal
  if (destination === "interview") return t.checklistDestinationInterview
  if (destination === "internal") return t.checklistDestinationInternal
  return t.documentsGroupNone
}

function StillNeededCard({ needed, compact = false }: { needed: LibraryEntry[]; compact?: boolean }) {
  const { messages } = usePortalI18n()
  const t = messages.ui

  if (compact) {
    return (
      <aside className="flex items-center justify-between gap-4 rounded-2xl border border-hairline bg-white p-4 shadow-sm">
        <div>
          <p className="text-[13px] font-semibold text-foreground">{t.documentsStillNeeded}</p>
          <p className="mt-0.5 text-[12px] text-text-mid">{needed.length} {t.documentsOnChecklist}</p>
        </div>
        <Link href="/portal/checklist" className="shrink-0 text-[13px] font-semibold text-brass-bright underline underline-offset-4">
          {t.documentsOpenChecklist}
        </Link>
      </aside>
    )
  }

  return (
    <aside className="rounded-2xl border border-hairline bg-white p-5 shadow-[0_18px_45px_-38px_rgba(10,18,34,.45)]">
      <div className="flex items-center justify-between gap-3 border-b border-hairline pb-4">
        <h2 className="portal-title-font text-[22px] font-medium text-foreground">{t.documentsStillNeeded}</h2>
        <span className="portal-title-font text-[26px] font-medium text-brass-bright">{needed.length}</span>
      </div>
      {needed.length ? (
        <ul className="divide-y divide-hairline">
          {needed.slice(0, 5).map((entry) => (
            <li key={entry.reqCode} className="py-3.5">
              <Link href={`/portal/checklist?item=${encodeURIComponent(entry.reqCode)}`} className="group block">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-[13px] font-semibold leading-5 text-foreground group-hover:underline">{entry.title}</p>
                    <p className="mt-1 text-[11px] leading-4 text-text-mid">
                      {entry.parts
                        ? interpolate(t.documentsPartsUploaded, { have: entry.parts.have, need: entry.parts.need })
                        : destinationLabel(entry.destination, t)}
                    </p>
                  </div>
                  <ChevronRight className="mt-1 size-4 shrink-0 text-text-low" aria-hidden />
                </div>
                <div className="mt-2"><StatusPill ladder={entryDisplayLadder(entry)} /></div>
              </Link>
            </li>
          ))}
        </ul>
      ) : (
        <p className="py-6 text-center text-[13px] leading-5 text-text-mid">{t.documentsNothingNeeded}</p>
      )}
      <Link href="/portal/checklist" className="mt-2 inline-flex min-h-10 items-center text-[13px] font-semibold text-brass-bright underline underline-offset-4">
        {t.documentsOpenChecklist}
      </Link>
    </aside>
  )
}

function CountCard({ label, value, detail, tone = "default" }: { label: string; value: number; detail: string; tone?: "default" | "gold" | "warn" }) {
  return (
    <div className="rounded-2xl border border-hairline bg-white p-4 shadow-[0_16px_40px_-38px_rgba(10,18,34,.5)] sm:p-5">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[.14em] text-text-low">{label}</p>
      <p className={cn(
        "portal-title-font mt-2 text-[30px] font-medium leading-none tabular-nums",
        value === 0 && "text-text-low",
        value > 0 && tone === "gold" && "text-brass-bright",
        value > 0 && tone === "warn" && "text-warn",
        value > 0 && tone === "default" && "text-foreground"
      )}>{value}</p>
      <p className="mt-2 text-[11px] leading-4 text-text-mid">{detail}</p>
    </div>
  )
}

function DesktopFileRow({ row }: { row: LibraryRow }) {
  return (
    <tr className="border-t border-hairline align-middle">
      <td className="w-[58px] py-3 pl-4 pr-2"><FileThumb file={row.file} /></td>
      <td className="min-w-[220px] px-2 py-3">
        <p className="text-[13px] font-semibold leading-5 text-foreground">{row.title}</p>
        <FileMeta row={row} />
      </td>
      <td className="w-[150px] px-2 py-3"><SourceBadge generated={row.file.generated} /></td>
      <td className="w-[130px] px-2 py-3"><StatusPill ladder={rowLadder(row)} /></td>
      <td className="w-[130px] py-3 pl-2 pr-4 text-right"><RowAction row={row} /></td>
    </tr>
  )
}

function MobileFileRow({ row, onOpen }: { row: LibraryRow; onOpen: () => void }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  return (
    <li>
      <button
        id={`document-row-${row.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`}
        type="button"
        onClick={onOpen}
        className="flex w-full items-center gap-3 border-t border-hairline px-4 py-3 text-left first:border-t-0"
        aria-haspopup="dialog"
      >
        <FileThumb file={row.file} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[13px] font-semibold text-foreground">{row.title}</span>
          <span className="mt-0.5 block truncate text-[11px] text-text-mid">
            {row.file.generated ? t.documentsPreparedForYou : t.documentsUploadedByYou} · {formatDate(row.file.createdAt)}
          </span>
          <span className="mt-1.5 block">
            {row.draft ? (
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[.08em] text-warn">{t.documentsDraftSignIt}</span>
            ) : (
              <StatusPill ladder={rowLadder(row)} />
            )}
          </span>
        </span>
        <ChevronRight className="size-4 shrink-0 text-text-low" aria-hidden />
      </button>
    </li>
  )
}

function FileSheet({ row, onClose }: { row: LibraryRow; onClose: () => void }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  const titleId = "document-sheet-title"

  useEffect(() => {
    const previous = document.body.style.overflow
    document.body.style.overflow = "hidden"
    window.requestAnimationFrame(() => document.getElementById(titleId)?.focus())
    const onKey = (event: KeyboardEvent) => event.key === "Escape" && onClose()
    window.addEventListener("keydown", onKey)
    return () => {
      document.body.style.overflow = previous
      window.removeEventListener("keydown", onKey)
    }
  }, [onClose])

  return (
    <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-labelledby={titleId}>
      <button type="button" className="absolute inset-0 bg-[#07101e]/55" onClick={onClose} aria-label={t.documentsCloseDetails} />
      <section className="absolute inset-x-0 bottom-0 max-h-[88dvh] overflow-y-auto rounded-t-[26px] bg-white shadow-2xl">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-hairline bg-white/95 px-4 py-3 backdrop-blur">
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[.14em] text-text-low">{t.documentsFileDetails}</p>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full border border-hairline bg-white" aria-label={t.documentsCloseDetails}>
            <X className="size-4" aria-hidden />
          </button>
        </div>
        <div className="p-5 pb-[max(24px,env(safe-area-inset-bottom))]">
          <div className="flex items-start gap-3">
            <FileThumb file={row.file} />
            <div className="min-w-0">
              <h2 id={titleId} tabIndex={-1} className="portal-title-font text-[24px] font-medium leading-tight outline-none">{row.title}</h2>
              <FileMeta row={row} compact />
            </div>
          </div>
          <div className="mt-5 grid gap-3 rounded-2xl border border-hairline bg-white p-4">
            <div className="flex items-center justify-between gap-3"><SourceBadge generated={row.file.generated} /><StatusPill ladder={rowLadder(row)} /></div>
            {row.officialTitle && row.officialTitle !== row.title ? <p className="text-[12px] leading-5 text-text-mid">{row.officialTitle}</p> : null}
          </div>
          <div className="mt-5"><RowAction row={row} compact /></div>
        </div>
      </section>
    </div>
  )
}

function SortSheet({ group, onSelect, onClose }: { group: GroupKey; onSelect: (group: GroupKey) => void; onClose: () => void }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  const options: Array<{ key: GroupKey; label: string }> = [
    { key: "status", label: t.documentsGroupStatus },
    { key: "destination", label: t.documentsGroupDestination },
    { key: "section", label: t.documentsGroupSection },
  ]
  return (
    <div className="fixed inset-0 z-[80] md:hidden" role="dialog" aria-modal="true" aria-labelledby="document-sort-title">
      <button type="button" className="absolute inset-0 bg-[#07101e]/55" onClick={onClose} aria-label={t.cancel} />
      <section className="absolute inset-x-0 bottom-0 rounded-t-[26px] bg-white p-5 pb-[max(24px,env(safe-area-inset-bottom))] shadow-2xl">
        <div className="flex items-center justify-between gap-3">
          <h2 id="document-sort-title" className="portal-title-font text-[24px] font-medium">{t.documentsGroupBy}</h2>
          <button type="button" onClick={onClose} className="grid size-9 place-items-center rounded-full border border-hairline bg-white" aria-label={t.cancel}><X className="size-4" aria-hidden /></button>
        </div>
        <div className="mt-4 grid gap-2">
          {options.map((option) => (
            <button
              key={option.key}
              type="button"
              onClick={() => { onSelect(option.key); onClose() }}
              aria-pressed={group === option.key}
              className={cn("flex min-h-12 items-center justify-between rounded-xl border px-4 text-left text-[14px] font-semibold", group === option.key ? "border-[var(--portal-navy)] bg-[var(--portal-navy)] text-white" : "border-hairline bg-white")}
            >
              {option.label}
              {group === option.key ? <span aria-hidden>✓</span> : null}
            </button>
          ))}
        </div>
      </section>
    </div>
  )
}

function GroupRows({ group, grouping, t }: { group: RowGroup; grouping: GroupKey; t: Record<string, string> }) {
  return (
    <>
      <tr className="border-t border-hairline bg-surface-2/55">
        <th colSpan={5} scope="rowgroup" className="px-4 py-2.5 text-left">
          <div className="flex items-start justify-between gap-4">
            <div>
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-text-mid">{group.label}</span>
              {group.detail ? <p className="mt-1 max-w-2xl text-[11px] font-normal leading-4 normal-case tracking-normal text-text-low">{group.detail}</p> : null}
            </div>
            {grouping === "destination" && group.ready != null ? (
              <span className="shrink-0 text-[11px] font-normal text-text-low">{interpolate(t.documentsReadyCount, { ready: group.ready, total: group.rows.length })}</span>
            ) : null}
          </div>
        </th>
      </tr>
      {group.rows.map((row) => <DesktopFileRow key={row.key} row={row} />)}
    </>
  )
}

export function DocumentLibrary({
  needed,
  completed,
  loose,
  initialTab,
  initialGroup,
}: {
  needed: LibraryEntry[]
  completed: LibraryEntry[]
  loose: LibraryFile[]
  initialTab: string | null
  initialGroup: string | null
}) {
  const { locale, messages } = usePortalI18n()
  const t = messages.ui
  const allEntries = useMemo(() => [...needed, ...completed], [completed, needed])
  const allRows = useMemo(() => flattenRows(allEntries, loose), [allEntries, loose])
  const [tab, setTab] = useState<TabKey>(TAB_KEYS.has(initialTab as TabKey) ? initialTab as TabKey : "all")
  const [group, setGroup] = useState<GroupKey>(GROUP_KEYS.has(initialGroup as GroupKey) ? initialGroup as GroupKey : "status")
  const [selectedRow, setSelectedRow] = useState<LibraryRow | null>(null)
  const [sortOpen, setSortOpen] = useState(false)

  const categoryLabels: Record<string, string> = locale === "es" ? {
    identity: t.categoryIdentity,
    residence: t.categoryResidence,
    records: t.categoryRecords,
    credentials: t.categoryCredentials,
    training: t.categoryTraining,
    people: t.categoryPeople,
    prepared: t.categoryPrepared,
    conditional: t.categoryConditional,
    sponsor: t.categorySponsor,
    admin: t.categoryAdmin,
  } : {}

  const linkedRows = allRows.filter((row) => !row.loose)
  const rowsByTab: Record<TabKey, LibraryRow[]> = {
    all: allRows,
    prepared: linkedRows.filter((row) => row.file.generated),
    uploaded: linkedRows.filter((row) => !row.file.generated),
    other: allRows.filter((row) => row.loose),
  }
  const activeRows = rowsByTab[tab]
  const groups = groupsFor(activeRows, group, t, categoryLabels)

  const preparedCount = allRows.filter((row) => row.file.generated).length
  const uploadedCount = allRows.filter((row) => !row.file.generated).length
  const draftCount = allRows.filter((row) => row.draft).length
  const fixCount = allRows.filter((row) => row.needsFix).length

  const updateUrl = (nextTab: TabKey, nextGroup: GroupKey) => {
    const url = new URL(window.location.href)
    url.searchParams.set("tab", nextTab)
    url.searchParams.set("group", nextGroup)
    window.history.replaceState({}, "", url)
  }
  const chooseTab = (next: TabKey) => { setTab(next); updateUrl(next, group) }
  const chooseGroup = (next: GroupKey) => { setGroup(next); updateUrl(tab, next) }
  const closeRow = () => {
    const row = selectedRow
    setSelectedRow(null)
    if (row) window.requestAnimationFrame(() => document.getElementById(`document-row-${row.key.replace(/[^a-zA-Z0-9_-]/g, "-")}`)?.focus())
  }

  const tabs: Array<{ key: TabKey; label: string; count: number }> = [
    { key: "all", label: t.documentsTabAll, count: rowsByTab.all.length },
    { key: "prepared", label: t.documentsTabPrepared, count: rowsByTab.prepared.length },
    { key: "uploaded", label: t.documentsTabUploaded, count: rowsByTab.uploaded.length },
    { key: "other", label: t.documentsTabOther, count: rowsByTab.other.length },
  ]

  return (
    <div className="min-w-0">
      <header className="mb-5 border-b border-hairline pb-5 sm:mb-6">
        <p className="hidden font-mono text-[11px] font-semibold uppercase tracking-[.2em] text-brass-bright sm:block">{t.documentsEyebrow}</p>
        <p className="font-mono text-[10px] font-semibold uppercase tracking-[.16em] text-brass-bright sm:hidden">{t.documentsMobileTitle}</p>
        <h1 className="portal-title-font mt-1 text-[31px] font-medium leading-[1.05] tracking-[-.02em] text-foreground sm:text-[36px]">
          <span className="sm:hidden">{t.documentsMobileHeading}</span>
          <span className="hidden sm:inline">{t.documentsHeading}</span>
        </h1>
        <p className="mt-2 max-w-3xl text-[14px] leading-6 text-text-mid sm:text-[15px]">{t.documentsSubline}</p>
      </header>

      <section aria-label={t.documentsCountsLabel} className="mb-5 grid grid-cols-2 gap-3 sm:mb-6 lg:grid-cols-4">
        <CountCard label={t.documentsFiles} value={allRows.length} detail={interpolate(t.documentsUploadedPrepared, { uploaded: uploadedCount, prepared: preparedCount })} />
        <CountCard label={t.documentsToSign} value={draftCount} detail={interpolate(t.documentsPreparedDrafts, { count: draftCount })} tone="gold" />
        <CountCard label={t.documentsNeedsFix} value={fixCount} detail={interpolate(t.documentsReplaceUploads, { count: fixCount })} tone="warn" />
        <CountCard label={t.documentsStillNeeded} value={needed.length} detail={t.documentsOnChecklist} />
      </section>

      <div className="mb-4 hidden sm:block xl:hidden"><StillNeededCard needed={needed} compact /></div>

      <div className="grid min-w-0 gap-5 xl:grid-cols-[minmax(0,1fr)_320px] xl:items-start">
        <section className="min-w-0 overflow-hidden rounded-2xl border border-hairline bg-white shadow-[0_20px_55px_-46px_rgba(10,18,34,.55)]" aria-label={t.documentsFiles}>
          <div className="flex items-center justify-between gap-3 border-b border-hairline px-3 py-3 sm:px-4">
            <div role="tablist" aria-label={t.documentsTabsLabel} className="min-w-0 flex-1 overflow-x-auto [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
              <div className="flex w-max gap-1.5">
                {tabs.map((item) => (
                  <button
                    key={item.key}
                    type="button"
                    role="tab"
                    aria-selected={tab === item.key}
                    onClick={() => chooseTab(item.key)}
                    className={cn(
                      "inline-flex min-h-9 items-center rounded-full border px-3 text-[12px] font-semibold whitespace-nowrap",
                      tab === item.key ? "border-[var(--portal-navy)] bg-[var(--portal-navy)] text-white" : "border-hairline bg-white text-text-mid"
                    )}
                  >
                    {item.label} <span className="ml-1.5 opacity-70">{item.count}</span>
                  </button>
                ))}
              </div>
            </div>
            <label className="relative hidden shrink-0 items-center gap-2 md:flex">
              <span className="font-mono text-[10px] font-semibold uppercase tracking-[.11em] text-text-low">{t.documentsGroupBy}</span>
              <select
                value={group}
                onChange={(event) => chooseGroup(event.target.value as GroupKey)}
                className="h-9 appearance-none rounded-lg border border-hairline bg-white py-0 pl-3 pr-8 text-[12px] font-semibold text-foreground"
              >
                <option value="status">{t.documentsGroupStatus}</option>
                <option value="destination">{t.documentsGroupDestination}</option>
                <option value="section">{t.documentsGroupSection}</option>
              </select>
              <ChevronDown className="pointer-events-none absolute right-2.5 size-3.5 text-text-low" aria-hidden />
            </label>
            <button type="button" onClick={() => setSortOpen(true)} className="inline-flex size-9 shrink-0 items-center justify-center rounded-lg border border-hairline bg-white md:hidden" aria-label={t.documentsSort}>
              <SlidersHorizontal className="size-4" aria-hidden />
            </button>
          </div>

          {group === "destination" && activeRows.length ? (
            <div className="border-b border-brass/20 bg-brass/[0.07] px-4 py-3 text-[12px] leading-5 text-text-mid">
              {t.documentsOwnApplicationNote}
            </div>
          ) : null}
          {tab === "other" && activeRows.length ? (
            <div className="border-b border-hairline bg-surface-2/50 px-4 py-3 text-[12px] leading-5 text-text-mid">
              {t.documentsOtherNote}
            </div>
          ) : null}

          {allRows.length === 0 ? (
            <div className="m-4 rounded-2xl border border-dashed border-hairline-strong bg-surface-2/30 px-5 py-12 text-center sm:m-5">
              <FileText className="mx-auto size-9 text-text-low" strokeWidth={1.5} aria-hidden />
              <h2 className="portal-title-font mt-3 text-[23px] font-medium">{t.documentsNoFilesTitle}</h2>
              <p className="mx-auto mt-2 max-w-md text-[13px] leading-5 text-text-mid">{t.documentsNoFilesDetail}</p>
              <Link href="/portal/checklist" className="mt-5 inline-flex min-h-11 items-center justify-center rounded-xl [background:var(--portal-gold-button)] px-5 text-[13px] font-semibold text-[#0b1220]">
                {t.documentsOpenChecklist}
              </Link>
            </div>
          ) : activeRows.length === 0 ? (
            <div className="m-4 rounded-2xl border border-dashed border-hairline-strong bg-surface-2/30 px-5 py-10 text-center text-[13px] text-text-mid sm:m-5">
              {t.documentsNoFilesInView}
            </div>
          ) : (
            <>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full border-collapse text-left">
                  <thead className="bg-surface-2/55 font-mono text-[10px] uppercase tracking-[.11em] text-text-low">
                    <tr>
                      <th scope="col" className="w-[58px] px-4 py-2.5"><span className="sr-only">{t.documentsFileType}</span></th>
                      <th scope="col" className="px-2 py-2.5">{t.documentsColumnDocument}</th>
                      <th scope="col" className="px-2 py-2.5">{t.documentsColumnFrom}</th>
                      <th scope="col" className="px-2 py-2.5">{t.documentsColumnStatus}</th>
                      <th scope="col" className="px-4 py-2.5 text-right">{t.documentsColumnAction}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {groups.map((rowGroup) => <GroupRows key={rowGroup.key} group={rowGroup} grouping={group} t={t} />)}
                  </tbody>
                </table>
              </div>

              <div className="md:hidden">
                {groups.map((rowGroup) => (
                  <section key={rowGroup.key} aria-labelledby={`mobile-document-group-${rowGroup.key}`}>
                    <div className="flex items-start justify-between gap-3 border-t border-hairline bg-surface-2/55 px-4 py-2.5 first:border-t-0">
                      <div>
                        <h2 id={`mobile-document-group-${rowGroup.key}`} className="font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-text-mid">{rowGroup.label}</h2>
                        {rowGroup.detail ? <p className="mt-1 text-[11px] leading-4 text-text-low">{rowGroup.detail}</p> : null}
                      </div>
                      {group === "destination" && rowGroup.ready != null ? <span className="shrink-0 text-[11px] text-text-low">{interpolate(t.documentsReadyCount, { ready: rowGroup.ready, total: rowGroup.rows.length })}</span> : null}
                    </div>
                    <ul>{rowGroup.rows.map((row) => <MobileFileRow key={row.key} row={row} onOpen={() => setSelectedRow(row)} />)}</ul>
                  </section>
                ))}
              </div>
            </>
          )}
        </section>

        <div className="hidden xl:sticky xl:top-28 xl:block"><StillNeededCard needed={needed} /></div>
      </div>

      <div className="mt-4 sm:hidden"><StillNeededCard needed={needed} compact /></div>

      {selectedRow ? <FileSheet row={selectedRow} onClose={closeRow} /> : null}
      {sortOpen ? <SortSheet group={group} onSelect={chooseGroup} onClose={() => setSortOpen(false)} /> : null}
    </div>
  )
}
