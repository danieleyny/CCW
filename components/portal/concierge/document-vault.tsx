"use client"

import { useState } from "react"
import Link from "next/link"
import { Lock, ArrowRight, Users, ShieldCheck, ChevronDown, Check } from "lucide-react"
import { DocumentUploader } from "@/components/portal/document-uploader"
import type { DocumentType } from "@/lib/doc-types"
import { vaultStateRank, type VaultGroup, type VaultItem } from "@/lib/concierge/vault"
import type { ReferenceProgress } from "@/components/portal/requirement-action"
import { cn } from "@/lib/utils"

type Filter = "all" | "needsYou" | "received" | "done"

/**
 * CONCIERGE — the secure vault, grouped by SECTION (lib/requirements/sections).
 * Seventeen near-identical cards were a wall; now they read as a handful of
 * labelled bands, with a summary strip that answers "how much of this is mine".
 * Finished sections collapse to a single line so completing one feels like
 * something. References + cohabitants aren't uploaded here — see the block below.
 */
export function DocumentVault({
  caseId,
  clientId,
  groups,
  referenceProgress,
  cohabitantProgress,
}: {
  caseId: string
  clientId: string
  groups: VaultGroup[]
  referenceProgress: ReferenceProgress | null
  cohabitantProgress: ReferenceProgress | null
}) {
  const [filter, setFilter] = useState<Filter>("all")

  const totals = groups.reduce(
    (acc, g) => ({
      needsYou: acc.needsYou + g.counts.outstanding,
      received: acc.received + g.counts.received,
      done: acc.done + g.counts.approved,
    }),
    { needsYou: 0, received: 0, done: 0 }
  )
  const total = totals.needsYou + totals.received + totals.done

  return (
    <section className="space-y-5">
      <div>
        <h2 className="text-lg font-semibold tracking-tight">Your document vault</h2>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-text-mid">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-text-low" />
          Everything you send is encrypted and seen only by your concierge team. Snap a photo or upload a
          file — we take it from there.
        </p>
      </div>

      {total === 0 ? (
        <p className="rounded-lg border border-ok/30 bg-ok/8 p-4 text-sm text-ok">
          <ShieldCheck className="mr-1.5 inline size-4" /> Every document we need is in. Nothing to upload
          right now.
        </p>
      ) : (
        <>
          {/* Summary strip — the one question a concierge customer really has:
              how much of this is mine? Each segment filters the list. */}
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" n={total} tone="muted" />
            <FilterChip active={filter === "needsYou"} onClick={() => setFilter("needsYou")} label="Need you" n={totals.needsYou} tone="brass" />
            <FilterChip active={filter === "received"} onClick={() => setFilter("received")} label="With us" n={totals.received} tone="brass" />
            <FilterChip active={filter === "done"} onClick={() => setFilter("done")} label="Done" n={totals.done} tone="ok" />
          </div>

          <div className="space-y-6">
            {groups.map((g) => (
              <VaultSection key={g.key} group={g} filter={filter} caseId={caseId} clientId={clientId} />
            ))}
          </div>
        </>
      )}

      {(referenceProgress || cohabitantProgress) && (
        <div className="rounded-lg border border-hairline bg-card p-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-brass" />
            <h3 className="text-sm font-medium">People we contact for you</h3>
          </div>
          <p className="mt-1 text-sm text-text-mid">
            You just give us their names and emails — we send each of them a private link and chase the
            notarized letters until they&apos;re back. You don&apos;t manage any of it.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {referenceProgress && (
              <li className="flex items-center justify-between">
                <span className="text-text-mid">Character references</span>
                <span className="font-mono text-[11px] tabular-nums text-text-low">
                  {referenceProgress.notarizedCount} of {referenceProgress.required} back
                </span>
              </li>
            )}
            {cohabitantProgress && (
              <li className="flex items-center justify-between">
                <span className="text-text-mid">Household affidavits</span>
                <span className="font-mono text-[11px] tabular-nums text-text-low">
                  {cohabitantProgress.notarizedCount} of {cohabitantProgress.required} back
                </span>
              </li>
            )}
          </ul>
          <Link href="/portal/people" className="mt-3 inline-flex items-center gap-1.5 text-sm text-signal underline">
            Add or update their details <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
    </section>
  )
}

function matchesFilter(item: VaultItem, filter: Filter): boolean {
  if (filter === "all") return true
  const rank = vaultStateRank(item)
  if (filter === "needsYou") return rank === 0
  if (filter === "received") return rank === 1
  return rank === 2 // done
}

/** One section band: header + count, its cards, and — when everything in it is
 *  approved — a collapsed single row you can expand. */
function VaultSection({
  group,
  filter,
  caseId,
  clientId,
}: {
  group: VaultGroup
  filter: Filter
  caseId: string
  clientId: string
}) {
  const allDone = group.counts.outstanding === 0 && group.counts.received === 0 && group.counts.total > 0
  // A finished section starts collapsed; anything still moving starts open.
  const [open, setOpen] = useState(!allDone)

  const visible = group.items.filter((i) => matchesFilter(i, filter))
  if (visible.length === 0) return null // a section with nothing to show is hidden

  const inCount = group.counts.received + group.counts.approved

  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-3 border-b border-hairline pb-1.5 text-left"
      >
        <span className="flex items-center gap-2">
          {allDone && <Check className="size-3.5 text-ok" />}
          <span className="engraved-sm text-text-mid">{group.title}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[11px] tabular-nums text-text-low">
            {inCount} of {group.counts.total} in
          </span>
          <ChevronDown className={cn("size-4 text-text-low transition-transform", open ? "" : "-rotate-90")} />
        </span>
      </button>

      {open ? (
        <>
          {filter === "all" && <p className="mt-1.5 text-xs text-text-low">{group.blurb}</p>}
          <div className="mt-3 space-y-2.5">
            {visible.map((item) => (
              // id = req code so a "Go" deep-link (#DMV-01) scrolls to + highlights this card.
              <div key={item.reqCode} id={item.reqCode} className="scroll-mt-24">
                <DocumentUploader
                  caseId={caseId}
                  clientId={clientId}
                  type={item.documentType as DocumentType}
                  reqCode={item.reqCode}
                  label={item.title}
                  description={item.help}
                  current={item.current}
                  photoSpec={item.photoSpec}
                  smartKinds={item.smartKinds.length > 0 ? item.smartKinds : undefined}
                  conciergeVoice
                  guide={item.guide}
                />
              </div>
            ))}
          </div>
        </>
      ) : (
        <p className="mt-1.5 text-xs text-text-low">All {group.counts.total} in this section are in.</p>
      )}
    </div>
  )
}

function FilterChip({
  active,
  onClick,
  label,
  n,
  tone,
}: {
  active: boolean
  onClick: () => void
  label: string
  n: number
  tone: "muted" | "brass" | "ok"
}) {
  const toneClass =
    active && tone === "brass"
      ? "border-brass/60 bg-brass/15 text-brass-bright"
      : active && tone === "ok"
        ? "border-ok/50 bg-ok/12 text-ok"
        : active
          ? "border-hairline-strong bg-surface-2 text-foreground"
          : "border-hairline bg-card text-text-mid hover:bg-surface-2"
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn("shrink-0 whitespace-nowrap rounded-full border px-3 py-1 text-xs font-medium transition-colors", toneClass)}
    >
      {label} <span className="tabular-nums opacity-80">{n}</span>
    </button>
  )
}
