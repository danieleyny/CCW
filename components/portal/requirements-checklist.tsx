"use client"

import Link from "next/link"
import { useCallback, useEffect, useMemo, useState } from "react"
import { CheckCircle2, ClipboardCheck } from "lucide-react"
import { CATEGORIES, categoryKeyFor } from "@/lib/requirements/categories"
import { type GeneratedDoc, type ReferenceProgress } from "@/components/portal/requirement-action"
import { RequirementCard, type ReqChecklistItem, type RequirementCardCtx } from "@/components/portal/requirement-card"
import { ReadinessCard, ReadinessFinalizeRow } from "@/components/portal/readiness-card"
import type { PortalReadiness } from "@/lib/disclosures/readiness"
import type { DmvApplicant } from "@/lib/portal/requirement-view"
import type { CurrentDoc } from "@/components/portal/document-uploader"
import { isSystemVerified } from "@/lib/requirements/system-checks"
import { actionFor } from "@/lib/requirements/actions"
import { isUnenforced } from "@/lib/legal-status"
import { cn } from "@/lib/utils"
import type { FeeSummary } from "@/lib/fees"
import type { FeeReceipts } from "@/components/portal/fee-panel"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"

// Re-exported so existing importers (requirement-view, next-step, vault) keep working.
export type { ReqChecklistItem } from "@/components/portal/requirement-card"

type FilterKey = "all" | "todo" | "waiting" | "done" | "notarizing"
type OwnerGroupKey = "your_turn" | "waiting" | "checking" | "done" | "not_required"

const NOT_APPLICABLE_SECTION = "not-applicable"

/**
 * The applicant checklist remains driven by the same flat requirement set and
 * action components. This surface only changes how that set is navigated:
 * section → whose move → selected item.
 */
export function RequirementsChecklist({
  items,
  intakeDone,
  readiness,
  initialItem,
  initialSection,
  caseId,
  clientId,
  prefills,
  generated,
  currentByReq,
  referenceProgress,
  cohabitantProgress,
  signatureOnFile,
  feeSummary,
  feeReceipts,
  dmvApplicant,
  caseSponsored = false,
  licenseTrack = null,
  isConcierge = false,
}: {
  items: ReqChecklistItem[]
  intakeDone: boolean
  readiness: PortalReadiness | null
  initialItem: string | null
  initialSection: string | null
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
  caseSponsored?: boolean
  licenseTrack?: string | null
  isConcierge?: boolean
}) {
  const { locale, messages } = usePortalI18n()
  const t = messages.ui

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

  // Preserve the existing visibility and count rules exactly.
  const visible = useMemo(() => items.filter((item) => !isSystemVerified(item.reqCode)), [items])
  const unenforcedItems = useMemo(
    () => visible.filter((item) => isUnenforced(item.legalStatus) && item.status !== "na"),
    [visible]
  )
  const applicable = useMemo(
    () => visible.filter((item) => item.status !== "na" && !isUnenforced(item.legalStatus)),
    [visible]
  )
  const notApplicable = useMemo(() => visible.filter((item) => item.status === "na"), [visible])
  const satisfied = applicable.filter((item) => item.status === "satisfied").length
  const isDone = (item: ReqChecklistItem) => item.status === "satisfied"

  const filterGroups = useMemo<Record<FilterKey, ReqChecklistItem[]>>(
    () => ({
      all: [...applicable, ...unenforcedItems],
      todo: applicable.filter((item) => !isDone(item)),
      waiting: applicable.filter((item) => item.ladder === "waiting"),
      done: applicable.filter(isDone),
      notarizing: applicable.filter(
        (item) => !isDone(item) && !!actionFor(item.reqCode)?.notarize && !!generated[item.reqCode]
      ),
    }),
    [applicable, generated, unenforcedItems]
  )

  const validSections = useMemo(
    () => new Set(["all", NOT_APPLICABLE_SECTION, ...CATEGORIES.map((category) => category.key)]),
    []
  )
  const requestedItem = visible.find((item) => item.reqCode === initialItem) ?? null
  const initialFilter: FilterKey = requestedItem
    ? isUnenforced(requestedItem.legalStatus)
      ? "all"
      : requestedItem.status === "satisfied"
        ? "done"
        : "todo"
    : filterGroups.todo.length
      ? "todo"
      : "all"
  const requestedSection = initialSection && validSections.has(initialSection) ? initialSection : "all"
  const initialResolvedSection = requestedItem && requestedSection !== "all" && requestedSection !== categoryKeyFor(requestedItem.reqCode)
    ? "all"
    : requestedSection

  const [filter, setFilter] = useState<FilterKey>(initialFilter)
  const [section, setSection] = useState(initialResolvedSection)
  const [selectedCode, setSelectedCode] = useState<string | null>(requestedItem?.reqCode ?? filterGroups[initialFilter][0]?.reqCode ?? visible[0]?.reqCode ?? null)
  const [panelOpen, setPanelOpen] = useState(false)

  const visibleSections = useMemo(
    () => CATEGORIES.filter((category) => visible.some((item) => categoryKeyFor(item.reqCode) === category.key)),
    [visible]
  )

  const sectionItems = useMemo(() => {
    if (section === NOT_APPLICABLE_SECTION) return notApplicable
    const source = filterGroups[filter]
    if (section === "all") return source
    return source.filter((item) => categoryKeyFor(item.reqCode) === section)
  }, [filter, filterGroups, notApplicable, section])

  const selectedItem = visible.find((item) => item.reqCode === selectedCode) ?? sectionItems[0] ?? null
  const yourTurnCount = applicable.filter(isYourTurn).length
  const waitingCount = applicable.filter((item) => item.ladder === "waiting").length

  const cardCtx: RequirementCardCtx = {
    caseId,
    clientId,
    prefills,
    generated,
    currentByReq,
    referenceProgress,
    cohabitantProgress,
    signatureOnFile,
    feeSummary,
    feeReceipts,
    dmvApplicant,
    caseSponsored,
    licenseTrack,
    isConcierge,
  }

  const replaceQuery = useCallback((nextItem: string | null, nextSection: string) => {
    if (typeof window === "undefined") return
    const url = new URL(window.location.href)
    if (nextItem) url.searchParams.set("item", nextItem)
    else url.searchParams.delete("item")
    if (nextSection !== "all") url.searchParams.set("section", nextSection)
    else url.searchParams.delete("section")
    // Once a legacy #REQ-CODE deep link has been resolved, the query param is
    // the source of truth. Keeping the old hash would re-select a stale item on
    // the next reload.
    url.hash = ""
    window.history.replaceState(window.history.state, "", `${url.pathname}${url.search}${url.hash}`)
  }, [])

  const chooseItem = useCallback((reqCode: string, openPanel = true) => {
    setSelectedCode(reqCode)
    setPanelOpen(openPanel)
    replaceQuery(reqCode, section)
  }, [replaceQuery, section])

  const chooseSection = useCallback((nextSection: string) => {
    setSection(nextSection)
    const source = nextSection === NOT_APPLICABLE_SECTION
      ? notApplicable
      : filterGroups[filter].filter((item) => nextSection === "all" || categoryKeyFor(item.reqCode) === nextSection)
    const nextCode = source[0]?.reqCode ?? null
    setSelectedCode(nextCode)
    setPanelOpen(false)
    replaceQuery(nextCode, nextSection)
  }, [filter, filterGroups, notApplicable, replaceQuery])

  const chooseFilter = useCallback((nextFilter: FilterKey) => {
    setFilter(nextFilter)
    if (section === NOT_APPLICABLE_SECTION) {
      replaceQuery(selectedCode, section)
      return
    }
    const source = filterGroups[nextFilter].filter((item) => section === "all" || categoryKeyFor(item.reqCode) === section)
    const nextCode = source.some((item) => item.reqCode === selectedCode) ? selectedCode : (source[0]?.reqCode ?? null)
    setSelectedCode(nextCode)
    setPanelOpen(false)
    replaceQuery(nextCode, section)
  }, [filterGroups, replaceQuery, section, selectedCode])

  const selectDeepLink = useCallback((reqCode: string) => {
    const item = visible.find((candidate) => candidate.reqCode === reqCode)
    if (!item) return
    const nextFilter: FilterKey = isUnenforced(item.legalStatus)
      ? "all"
      : item.status === "satisfied"
        ? "done"
        : "todo"
    setFilter(nextFilter)
    setSection("all")
    setSelectedCode(item.reqCode)
    setPanelOpen(false)
    replaceQuery(item.reqCode, "all")
    window.requestAnimationFrame(() => {
      document.getElementById(item.reqCode)?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
  }, [replaceQuery, visible])

  useEffect(() => {
    const onHash = () => {
      const reqCode = decodeURIComponent(window.location.hash.slice(1))
      if (reqCode) selectDeepLink(reqCode)
    }
    onHash()
    window.addEventListener("hashchange", onHash)
    return () => window.removeEventListener("hashchange", onHash)
  }, [selectDeepLink])

  useEffect(() => {
    const reqCode = new URL(window.location.href).searchParams.get("item")
    if (!reqCode || !visible.some((item) => item.reqCode === reqCode)) return
    const frame = window.requestAnimationFrame(() => {
      document.getElementById(reqCode)?.scrollIntoView({ behavior: "smooth", block: "center" })
    })
    return () => window.cancelAnimationFrame(frame)
    // Initial query deep-link only; subsequent selections are already in view.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const onPopState = () => {
      const url = new URL(window.location.href)
      const nextSection = url.searchParams.get("section") ?? "all"
      const nextItem = url.searchParams.get("item")
      if (validSections.has(nextSection)) setSection(nextSection)
      if (nextItem && visible.some((item) => item.reqCode === nextItem)) setSelectedCode(nextItem)
      setPanelOpen(false)
    }
    window.addEventListener("popstate", onPopState)
    return () => window.removeEventListener("popstate", onPopState)
  }, [validSections, visible])

  useEffect(() => {
    if (!panelOpen) return
    const frame = window.requestAnimationFrame(() => document.getElementById("checklist-item-panel-title")?.focus())
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closePanel()
    }
    window.addEventListener("keydown", onKeyDown)
    return () => {
      window.cancelAnimationFrame(frame)
      window.removeEventListener("keydown", onKeyDown)
    }
    // closePanel intentionally reads the current selected code.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [panelOpen, selectedCode])

  function closePanel() {
    setPanelOpen(false)
    window.requestAnimationFrame(() => document.getElementById(`checklist-row-${selectedCode}`)?.focus())
  }

  if (applicable.length === 0 && notApplicable.length === 0 && unenforcedItems.length === 0) {
    return (
      <div>
        <DesktopHeader satisfied={0} applicable={0} yourTurn={0} intakeDone={intakeDone} />
        <p className="rounded-[20px] border border-dashed border-hairline-strong bg-white p-8 text-center text-sm text-text-mid">
          {t.requirementsNotGenerated}
        </p>
      </div>
    )
  }

  const ownerGroups = groupByOwner(sectionItems)

  return (
    <div className="min-w-0">
      <DesktopHeader satisfied={satisfied} applicable={applicable.length} yourTurn={yourTurnCount} intakeDone={intakeDone} />

      <MobileTopBlock
        satisfied={satisfied}
        applicable={applicable.length}
        filter={filter}
        groups={filterGroups}
        onFilter={chooseFilter}
      />

      {!intakeDone ? (
        <section className="mb-5 flex flex-col gap-4 rounded-[22px] bg-[linear-gradient(135deg,#14254a,#0a1222)] p-5 text-white shadow-[0_20px_45px_-30px_rgba(10,18,34,.8)] sm:flex-row sm:items-center sm:justify-between sm:p-6">
          <div>
            <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.19em] text-[var(--portal-gold-light)]">{t.checklistBestGuess}</p>
            <h2 className="portal-title-font mt-1.5 text-[24px] font-medium">{t.checklistFinishIntake}</h2>
            <p className="mt-1 max-w-2xl text-[14px] leading-5 text-white/72">{t.checklistFinishIntakeDetail}</p>
          </div>
          <Link href="/portal/intake" className="inline-flex min-h-11 shrink-0 items-center justify-center rounded-xl bg-[var(--portal-gold-button)] px-5 text-[14px] font-semibold text-[#0b1220] shadow-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-white/60">
            {t.checklistContinueIntake}
          </Link>
        </section>
      ) : null}

      {readiness ? <ReadinessCard readiness={readiness} /> : null}

      <div className="grid min-w-0 gap-5 xl:grid-cols-[210px_minmax(0,1fr)_380px]">
        <SectionNav
          section={section}
          categories={visibleSections}
          categoryLabels={categoryLabels}
          applicable={applicable}
          allCount={filterGroups.all.length}
          notApplicableCount={notApplicable.length}
          onSelect={chooseSection}
        />

        <main className="min-w-0" aria-label={t.checklistItemsLabel}>
          <div className="mb-3 hidden sm:block xl:hidden">
            <label htmlFor="checklist-section" className="mb-1.5 block font-mono text-[11px] font-semibold uppercase tracking-[0.16em] text-text-low">
              {t.checklistSection}
            </label>
            <select
              id="checklist-section"
              value={section}
              onChange={(event) => chooseSection(event.target.value)}
              className="h-11 w-full appearance-none rounded-xl border border-hairline-strong bg-white px-3 pr-10 text-[14px] font-medium text-foreground [background-image:linear-gradient(45deg,transparent_50%,#4a5160_50%),linear-gradient(135deg,#4a5160_50%,transparent_50%)] [background-position:calc(100%-18px)_18px,calc(100%-13px)_18px] [background-repeat:no-repeat] [background-size:5px_5px,5px_5px] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/30"
            >
              <option value="all">{t.checklistAllItems}</option>
              {visibleSections.map((category) => <option key={category.key} value={category.key}>{categoryLabels[category.key] ?? category.label}</option>)}
              {notApplicable.length > 0 ? <option value={NOT_APPLICABLE_SECTION}>{t.checklistNotNeeded}</option> : null}
            </select>
          </div>

          <div className="rounded-[22px] border border-hairline bg-white shadow-[0_18px_42px_-34px_rgba(10,18,34,.45)]">
            <div className="hidden border-b border-hairline px-4 py-3 sm:block">
              <FilterChips filter={filter} groups={filterGroups} onFilter={chooseFilter} />
            </div>

            {section === NOT_APPLICABLE_SECTION ? (
              <NotApplicableList items={notApplicable} />
            ) : sectionItems.length === 0 ? (
              <p className="m-4 rounded-2xl border border-dashed border-hairline-strong bg-surface-2/35 p-7 text-center text-sm text-text-mid">
                {filter === "todo" ? t.nothingLeft : t.nothingInView}
              </p>
            ) : (
              <div className="px-3 py-2 sm:px-4 sm:py-3">
                {filter === "todo" && ownerGroups.your_turn.length === 0 ? (
                  <div className="mb-3 rounded-2xl border border-ok/25 bg-ok/[0.055] p-4 text-sm text-ok">
                    <p className="font-semibold">{t.checklistNothingForYou}</p>
                    {waitingCount > 0 ? <p className="mt-1 text-[13px] text-text-mid">{interpolate(t.checklistWaitingSentence, { count: waitingCount })}</p> : null}
                  </div>
                ) : null}

                {(Object.keys(ownerGroups) as OwnerGroupKey[]).map((key) => {
                  const groupItems = ownerGroups[key]
                  if (groupItems.length === 0) return null
                  if (key === "done" && filter !== "done" && filter !== "all") return null
                  return (
                    <section key={key} className="py-2" aria-labelledby={`checklist-group-${key}`}>
                      <div className="mb-1.5 flex items-center justify-between gap-3 px-1.5">
                        <h2 id={`checklist-group-${key}`} className="font-mono text-[11px] font-semibold uppercase tracking-[0.17em] text-text-low">
                          {groupLabel(key, t)}
                        </h2>
                        <span className="font-mono text-[10px] tabular-nums text-text-low">{groupItems.length}</span>
                      </div>
                      <ul className="divide-y divide-hairline" role="list">
                        {groupItems.map((item) => (
                          <RequirementCard
                            key={item.id}
                            item={item}
                            ctx={cardCtx}
                            presentation="row"
                            selected={item.reqCode === selectedItem?.reqCode}
                            onSelect={() => chooseItem(item.reqCode)}
                            rowSubline={sublineFor(item, t, referenceProgress, cohabitantProgress)}
                            showStatusOnPhone={key !== "your_turn"}
                          />
                        ))}
                      </ul>
                    </section>
                  )
                })}
              </div>
            )}
          </div>

          {readiness ? <ReadinessFinalizeRow readiness={readiness} /> : null}
        </main>

        <div className="hidden xl:block">
          <div className="sticky top-6 max-h-[calc(100svh-3rem)] overflow-y-auto overscroll-contain rounded-[22px] border border-hairline bg-white shadow-[0_24px_55px_-36px_rgba(10,18,34,.55)]">
            {selectedItem ? (
              <RequirementCard item={selectedItem} ctx={cardCtx} presentation="panel" />
            ) : (
              <EmptyPanel />
            )}
          </div>
        </div>
      </div>

      {panelOpen && selectedItem ? (
        <div className="fixed inset-0 z-[80] xl:hidden" role="dialog" aria-modal="true" aria-labelledby="checklist-item-panel-title">
          <button type="button" aria-label={t.checklistCloseItem} onClick={closePanel} className="absolute inset-0 hidden bg-[#0a1222]/36 backdrop-blur-[2px] sm:block" />
          <div className="absolute inset-0 overflow-y-auto bg-white sm:inset-y-0 sm:left-auto sm:w-[min(430px,92vw)] sm:border-l sm:border-hairline sm:shadow-[-24px_0_70px_-42px_rgba(10,18,34,.7)]">
            <RequirementCard item={selectedItem} ctx={cardCtx} presentation="panel" onClose={closePanel} />
          </div>
        </div>
      ) : null}
    </div>
  )
}

function DesktopHeader({ satisfied, applicable, yourTurn, intakeDone }: { satisfied: number; applicable: number; yourTurn: number; intakeDone: boolean }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  return (
    <header className="mb-5 hidden sm:block">
      <div className="flex items-end justify-between gap-8 border-b border-hairline pb-5">
        <div>
          <p className="font-mono text-[11px] font-semibold uppercase tracking-[0.2em] text-brass-bright">{t.checklistEyebrow}</p>
          <h1 className="portal-title-font mt-1 text-[36px] font-medium leading-[1.05] tracking-[-.02em] text-foreground">{t.checklistHeading}</h1>
          <p className="mt-2 max-w-2xl text-[15px] leading-6 text-text-mid">{intakeDone ? t.checklistOrderedSubline : t.checklistActions}</p>
        </div>
        <div className="w-[220px] shrink-0 text-right">
          <p className="portal-title-font text-[30px] font-medium leading-none tabular-nums">{satisfied} {t.checklistOf} {applicable}</p>
          <p className="mt-1.5 text-[12px] text-text-low">{t.checklistDoneWord} · <span className="font-semibold text-brass-bright">{yourTurn} {t.checklistYourTurnLower}</span></p>
          <Progress done={satisfied} total={applicable} className="mt-3" />
        </div>
      </div>
      {intakeDone ? (
        <div className="mt-3 flex items-center gap-2 rounded-xl border border-ok/20 bg-ok/[0.05] px-3 py-2 text-[13px] text-ok">
          <CheckCircle2 className="size-4 shrink-0" />
          <span>{t.checklistComplete}</span>
        </div>
      ) : null}
    </header>
  )
}

function MobileTopBlock({ satisfied, applicable, filter, groups, onFilter }: { satisfied: number; applicable: number; filter: FilterKey; groups: Record<FilterKey, ReqChecklistItem[]>; onFilter: (filter: FilterKey) => void }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  return (
    <div className="sticky top-[calc(3.5rem+env(safe-area-inset-top))] z-30 -mx-4 mb-4 border-b border-hairline bg-white/95 px-4 pb-3 pt-2 backdrop-blur-xl sm:hidden">
      <div className="flex items-center justify-between gap-3">
        <h1 className="portal-title-font text-[22px] font-medium">{t.checklistTitle}</h1>
        <span className="font-mono text-[12px] font-semibold tabular-nums text-text-mid">{satisfied} / {applicable}</span>
      </div>
      <Progress done={satisfied} total={applicable} className="mt-2" />
      <div className="mt-2.5"><FilterChips filter={filter} groups={groups} onFilter={onFilter} mobile /></div>
    </div>
  )
}

function Progress({ done, total, className }: { done: number; total: number; className?: string }) {
  const { messages } = usePortalI18n()
  return (
    <div role="progressbar" aria-label={messages.ui.checklistProgress} aria-valuemin={0} aria-valuemax={total} aria-valuenow={done} className={cn("h-1.5 overflow-hidden rounded-full bg-surface-3", className)}>
      <div className="h-full rounded-full bg-[linear-gradient(90deg,#c49a47,#e3c574)] transition-[width] duration-300 motion-reduce:transition-none" style={{ width: total ? `${(done / total) * 100}%` : "0%" }} />
    </div>
  )
}

function FilterChips({ filter, groups, onFilter, mobile = false }: { filter: FilterKey; groups: Record<FilterKey, ReqChecklistItem[]>; onFilter: (filter: FilterKey) => void; mobile?: boolean }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  const filters: { key: FilterKey; label: string }[] = [
    { key: "todo", label: t.toDo },
    { key: "waiting", label: t.checklistWaiting },
    { key: "done", label: t.completed },
    { key: "all", label: t.all },
    { key: "notarizing", label: t.checklistNotarize },
  ]
  return (
    <div role="group" aria-label={t.filterChecklist} className={cn("flex gap-2", mobile && "-mr-4 overflow-x-auto pr-8 [mask-image:linear-gradient(to_right,#000_88%,transparent)]")}>
      {filters.map((entry) => {
        const count = groups[entry.key].length
        if (entry.key === "notarizing" && count === 0) return null
        const active = filter === entry.key
        return (
          <button key={entry.key} type="button" aria-pressed={active} onClick={() => onFilter(entry.key)} className={cn("inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-[12px] font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/35", active ? "border-[var(--portal-navy)] bg-[var(--portal-navy)] text-white" : "border-hairline-strong bg-white text-text-mid hover:border-[rgba(20,37,74,.35)] hover:text-foreground")}>
            {entry.label}<span className={cn("font-mono text-[10px] tabular-nums", active ? "text-white/65" : "text-text-low")}>{count}</span>
          </button>
        )
      })}
    </div>
  )
}

function SectionNav({ section, categories, categoryLabels, applicable, allCount, notApplicableCount, onSelect }: { section: string; categories: typeof CATEGORIES; categoryLabels: Record<string, string>; applicable: ReqChecklistItem[]; allCount: number; notApplicableCount: number; onSelect: (section: string) => void }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  return (
    <nav className="hidden xl:block" aria-label={t.checklistSectionsLabel}>
      <div className="sticky top-6 rounded-[18px] border border-hairline bg-white p-2 shadow-[0_16px_40px_-34px_rgba(10,18,34,.55)]">
        <SectionButton active={section === "all"} label={t.checklistAllItems} count={String(allCount)} onClick={() => onSelect("all")} />
        <div className="my-1 border-t border-hairline" />
        {categories.map((category) => {
          const inCategory = applicable.filter((item) => categoryKeyFor(item.reqCode) === category.key)
          const done = inCategory.filter((item) => item.status === "satisfied").length
          return <SectionButton key={category.key} active={section === category.key} label={categoryLabels[category.key] ?? category.label} count={inCategory.length ? `${done}/${inCategory.length}` : "—"} complete={inCategory.length > 0 && done === inCategory.length} onClick={() => onSelect(category.key)} />
        })}
        {notApplicableCount > 0 ? (
          <>
            <div className="my-1 border-t border-hairline" />
            <SectionButton active={section === NOT_APPLICABLE_SECTION} label={t.checklistNotNeeded} count={String(notApplicableCount)} onClick={() => onSelect(NOT_APPLICABLE_SECTION)} />
          </>
        ) : null}
      </div>
    </nav>
  )
}

function SectionButton({ active, label, count, complete = false, onClick }: { active: boolean; label: string; count: string; complete?: boolean; onClick: () => void }) {
  return (
    <button type="button" onClick={onClick} className={cn("flex min-h-10 w-full items-center justify-between gap-3 rounded-xl px-3 text-left text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-signal/35", active ? "bg-signal-dim font-semibold text-[var(--portal-navy)]" : "text-text-mid hover:bg-surface-2 hover:text-foreground")}>
      <span className="min-w-0 truncate">{label}</span>
      <span className={cn("shrink-0 font-mono text-[10px] tabular-nums", complete ? "text-ok" : "text-text-low")}>{count}</span>
    </button>
  )
}

function NotApplicableList({ items }: { items: ReqChecklistItem[] }) {
  const { messages } = usePortalI18n()
  return (
    <div className="p-4">
      <div className="rounded-2xl border border-dashed border-hairline-strong bg-surface-2/35 p-4">
        <h2 className="text-[15px] font-semibold">{messages.ui.checklistNotNeeded}</h2>
        <p className="mt-1 text-[13px] leading-5 text-text-mid">{messages.ui.checklistNotNeededDetail}</p>
        <ul className="mt-4 divide-y divide-hairline">
          {items.map((item) => (
            <li key={item.id} className="flex items-center gap-3 py-3 text-[13px]">
              <span className="rounded-md bg-white px-2 py-1 font-mono text-[10px] text-text-low">{item.reqCode}</span>
              <span className="font-medium text-text-mid">{item.title}</span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  )
}

function EmptyPanel() {
  const { messages } = usePortalI18n()
  return (
    <div className="flex min-h-[280px] flex-col items-center justify-center p-8 text-center text-text-mid">
      <ClipboardCheck className="size-7 text-brass-bright" />
      <p className="mt-3 text-sm">{messages.ui.checklistSelectItem}</p>
    </div>
  )
}

function groupByOwner(items: ReqChecklistItem[]): Record<OwnerGroupKey, ReqChecklistItem[]> {
  const groups: Record<OwnerGroupKey, ReqChecklistItem[]> = { your_turn: [], waiting: [], checking: [], done: [], not_required: [] }
  for (const item of items) {
    if (isUnenforced(item.legalStatus)) groups.not_required.push(item)
    else if (item.ladder === "approved" || item.status === "satisfied") groups.done.push(item)
    else if (item.ladder === "waiting") groups.waiting.push(item)
    else if (item.ladder === "submitted") groups.checking.push(item)
    else groups.your_turn.push(item)
  }
  return groups
}

function isYourTurn(item: ReqChecklistItem): boolean {
  return item.ladder === "pending" || item.ladder === "changes_requested" || item.status === "rejected"
}

function groupLabel(key: OwnerGroupKey, t: Record<string, string>): string {
  if (key === "your_turn") return t.checklistYourTurn
  if (key === "waiting") return t.checklistWaitingOnOthers
  if (key === "checking") return t.checklistBeingChecked
  if (key === "done") return t.checklistDoneGroup
  return t.checklistNotRequired
}

function sublineFor(item: ReqChecklistItem, t: Record<string, string>, referenceProgress: ReferenceProgress | null, cohabitantProgress: ReferenceProgress | null): string {
  if (item.reviewNote) return item.reviewNote.split(/\n|\./)[0] || item.reviewNote
  if (item.severity === "long_lead") return t.checklistSlowestItem
  const progress = item.reqCode === "REF-01" || item.reqCode === "REF-02" ? referenceProgress : item.reqCode === "COH-01" ? cohabitantProgress : null
  if (progress) {
    return interpolate(item.reqCode === "COH-01" ? t.checklistAffidavitProgress : t.checklistReferenceProgress, {
      done: progress.notarizedCount,
      total: progress.required,
    })
  }
  if (item.destination === "portal_upload") return t.checklistDestinationPortal
  if (item.destination === "interview") return t.checklistDestinationInterview
  if (item.destination === "internal") return t.checklistDestinationInternal
  return statusHint(item, t)
}

function statusHint(item: ReqChecklistItem, t: Record<string, string>): string {
  if (item.ladder === "waiting") return t.checklistStatusWaitingHint
  if (item.ladder === "submitted") return t.checklistStatusReceivedHint
  if (item.ladder === "approved") return t.checklistStatusApprovedHint
  if (item.ladder === "changes_requested") return t.checklistStatusFixHint
  return t.checklistStatusPendingHint
}
