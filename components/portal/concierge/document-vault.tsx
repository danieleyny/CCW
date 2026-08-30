"use client"

import { useMemo, useState } from "react"
import Link from "next/link"
import { Lock, ArrowRight, Users, ShieldCheck, ChevronDown, Check } from "lucide-react"
import { groupByCategory } from "@/lib/requirements/categories"
import { isDisclosureItem } from "@/lib/requirements/sections"
import { actionFor } from "@/lib/requirements/actions"
import { isUnenforced } from "@/lib/legal-status"
import { RequirementCard, type ReqChecklistItem, type RequirementCardCtx } from "@/components/portal/requirement-card"
import type { ReferenceProgress } from "@/components/portal/requirement-action"
import { cn } from "@/lib/utils"

type Filter = "all" | "needsYou" | "received" | "done"

/**
 * CONCIERGE — the document/requirement surface. It is NOT a second card implementation:
 * it renders the SAME <RequirementCard> the self-guided checklist uses (ONE_SURFACE_AND_
 * LON_FIXES Part A), grouped into labelled section bands with a summary strip. Every
 * card improvement — how-to panels, the residence-proof picker, DMV/TRN helpers —
 * lands here automatically because there is only one card.
 */
export function DocumentVault({
  items,
  ctx,
  referenceProgress,
  cohabitantProgress,
}: {
  items: ReqChecklistItem[]
  ctx: RequirementCardCtx
  referenceProgress: ReferenceProgress | null
  cohabitantProgress: ReferenceProgress | null
}) {
  const [filter, setFilter] = useState<Filter>("all")

  // The applicant's own applicable requirements (skip system-verified na + unenforced).
  // Disclosure GENERATE items (Q10–28 affirmations) have their own section on this page,
  // so they're excluded here to avoid showing the same card twice.
  const applicable = useMemo(
    () =>
      items.filter(
        (i) =>
          i.status !== "na" &&
          !isUnenforced(i.legalStatus) &&
          !(isDisclosureItem(i.reqCode) && actionFor(i.reqCode)?.mode === "generate")
      ),
    [items]
  )
  const groups = useMemo(() => groupByCategory(applicable), [applicable])

  const totals = applicable.reduce(
    (acc, i) => {
      const b = bucketOf(i)
      acc[b] += 1
      return acc
    },
    { needsYou: 0, received: 0, done: 0 } as Record<Exclude<Filter, "all">, number>
  )
  const total = applicable.length

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
          <ShieldCheck className="mr-1.5 inline size-4" /> Everything we need is in. Nothing for you to do
          right now.
        </p>
      ) : (
        <>
          <div className="-mx-1 flex gap-2 overflow-x-auto px-1 pb-1">
            <FilterChip active={filter === "all"} onClick={() => setFilter("all")} label="All" n={total} tone="muted" />
            <FilterChip active={filter === "needsYou"} onClick={() => setFilter("needsYou")} label="Need you" n={totals.needsYou} tone="brass" />
            <FilterChip active={filter === "received"} onClick={() => setFilter("received")} label="With us" n={totals.received} tone="signal" />
            <FilterChip active={filter === "done"} onClick={() => setFilter("done")} label="Done" n={totals.done} tone="ok" />
          </div>

          <div className="space-y-6">
            {groups.map(({ category, items: catItems }) => (
              <VaultSection key={category.key} title={category.label} items={catItems} filter={filter} ctx={ctx} />
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

/** Which summary bucket a requirement falls in, from its applicant-facing ladder. */
function bucketOf(i: ReqChecklistItem): Exclude<Filter, "all"> {
  if (i.status === "satisfied" || i.ladder === "approved") return "done"
  if (i.ladder === "submitted") return "received"
  return "needsYou" // pending / changes_requested / waiting
}

function matchesFilter(item: ReqChecklistItem, filter: Filter): boolean {
  return filter === "all" || bucketOf(item) === filter
}

/** One section band: header + count, then the shared RequirementCards. A finished
 *  section starts collapsed so completing one feels like something. */
function VaultSection({
  title,
  items,
  filter,
  ctx,
}: {
  title: string
  items: ReqChecklistItem[]
  filter: Filter
  ctx: RequirementCardCtx
}) {
  const done = items.filter((i) => bucketOf(i) === "done").length
  const allDone = done === items.length && items.length > 0
  const [open, setOpen] = useState(!allDone)

  const visible = items.filter((i) => matchesFilter(i, filter))
  if (visible.length === 0) return null

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
          <span className="engraved-sm text-text-mid">{title}</span>
        </span>
        <span className="flex items-center gap-2">
          <span className="font-mono text-[11px] tabular-nums text-text-low">
            {done} of {items.length} in
          </span>
          <ChevronDown className={cn("size-4 text-text-low transition-transform", open ? "" : "-rotate-90")} />
        </span>
      </button>

      {open ? (
        <ul className="mt-3 space-y-2.5">
          {visible.map((item) => (
            <RequirementCard key={item.id} item={item} ctx={ctx} />
          ))}
        </ul>
      ) : (
        <p className="mt-1.5 text-xs text-text-low">All {items.length} in this section are in.</p>
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
  tone: "muted" | "brass" | "signal" | "ok"
}) {
  const toneClass =
    active && tone === "brass"
      ? "border-brass/60 bg-brass/15 text-brass-bright"
      : active && tone === "signal"
        ? "border-signal/50 bg-signal/12 text-signal"
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
