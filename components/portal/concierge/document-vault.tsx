"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import {
  BadgeCheck,
  Check,
  ChevronDown,
  CircleHelp,
  FilePenLine,
  Fingerprint,
  GraduationCap,
  House,
  Landmark,
  Lock,
  Receipt,
  Scale,
  ShieldCheck,
  Users,
  type LucideIcon,
} from "lucide-react"
import { groupByCategory } from "@/lib/requirements/categories"
import { isDisclosureItem } from "@/lib/requirements/sections"
import { actionFor } from "@/lib/requirements/actions"
import { isUnenforced } from "@/lib/legal-status"
import { RequirementCard, type ReqChecklistItem, type RequirementCardCtx } from "@/components/portal/requirement-card"
import type { ReferenceProgress } from "@/components/portal/requirement-action"
import { cn } from "@/lib/utils"

type Filter = "all" | "needsYou" | "received" | "done"
const FILTERS: Filter[] = ["needsYou", "received", "done", "all"]
const FILTER_KEY = "vaultFilter"

const SECTION_ICONS: Record<string, LucideIcon> = {
  identity: Fingerprint,
  residence: House,
  records: Scale,
  credentials: BadgeCheck,
  training: GraduationCap,
  people: Users,
  prepared: FilePenLine,
  conditional: ShieldCheck,
  sponsor: Landmark,
  admin: Receipt,
}

const BUNDLES = [
  {
    key: "upload",
    number: 1,
    eyebrow: "Upload these",
    title: "Your documents",
    sub: "Snap a photo or upload a file",
    sections: ["identity", "residence", "records", "credentials", "training", "conditional"],
  },
  {
    key: "people",
    number: 2,
    eyebrow: "Tell us who",
    title: "People we contact for you",
    sub: "Just names and emails — we do the rest",
    sections: ["people"],
  },
  {
    key: "sign",
    number: 3,
    eyebrow: "Read & sign",
    title: "We prepare, you sign",
    sub: "We fill every form — you review and sign",
    sections: ["prepared"],
  },
  {
    key: "confirm",
    number: 4,
    eyebrow: "Confirm",
    title: "Fees & sign-offs",
    sub: "Quick confirmations — most we handle",
    sections: ["admin"],
  },
  {
    key: "sponsor",
    number: 5,
    eyebrow: "From your sponsor",
    title: "Sponsor documents",
    sub: "Read-only items supplied for your case",
    sections: ["sponsor"],
  },
] as const

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
  const [filter, setFilter] = useState<Filter>("needsYou")
  useEffect(() => {
    try {
      const stored = sessionStorage.getItem(FILTER_KEY)
      // The server cannot read sessionStorage, so restore the per-tab preference after hydration.
      // eslint-disable-next-line react-hooks/set-state-in-effect
      if (stored && FILTERS.includes(stored as Filter)) setFilter(stored as Filter)
    } catch {
      // Private browsing can disable storage. The default remains useful.
    }
  }, [])

  const choose = (next: Filter) => {
    setFilter(next)
    try {
      sessionStorage.setItem(FILTER_KEY, next)
    } catch {
      // The filter still works for the current render without persistence.
    }
  }

  const applicable = useMemo(
    () =>
      items.filter(
        (item) =>
          item.status !== "na" &&
          !isUnenforced(item.legalStatus) &&
          !(isDisclosureItem(item.reqCode) && actionFor(item.reqCode)?.mode === "generate")
      ),
    [items]
  )
  const groups = useMemo(() => groupByCategory(applicable), [applicable])
  const totals = applicable.reduce(
    (acc, item) => {
      acc[bucketOf(item)] += 1
      return acc
    },
    { needsYou: 0, received: 0, done: 0 } as Record<Exclude<Filter, "all">, number>
  )
  const needsYouEmpty = filter === "needsYou" && totals.needsYou === 0
  const effectiveFilter: Filter = needsYouEmpty ? "all" : filter
  const sectionMap = new Map(groups.map((group) => [group.category.key, group]))
  const visibleBundles = BUNDLES.map((bundle) => ({
    ...bundle,
    groups: bundle.sections.map((key) => sectionMap.get(key)).filter(Boolean) as typeof groups,
  })).filter((bundle) => bundle.groups.length > 0)
  const firstNeedsYou = groups
    .filter((group) => group.items.some((item) => bucketOf(item) === "needsYou"))
    .slice(0, 2)
    .map((group) => group.category.key)

  if (applicable.length === 0) {
    return (
      <section className="concierge-vault-empty">
        <ShieldCheck className="size-5" aria-hidden />
        <div><strong>Everything we need is in.</strong><p>Nothing for you to do right now.</p></div>
      </section>
    )
  }

  return (
    <section className="concierge-vault" aria-labelledby="documents-heading">
      <header className="concierge-vault-heading">
        <div>
          <p className="portal-t-eyebrow text-brass-deep">Your document vault</p>
          <h2 id="documents-heading" className="portal-title-font">Documents</h2>
        </div>
        <div className="concierge-vault-filters" aria-label="Filter documents">
          {FILTERS.map((item) => (
            <FilterChip
              key={item}
              active={effectiveFilter === item}
              onClick={() => choose(item)}
              label={{ needsYou: "Need you", received: "With us", done: "Done", all: "All" }[item]}
              count={item === "all" ? applicable.length : totals[item]}
            />
          ))}
        </div>
      </header>

      {needsYouEmpty ? (
        <p className="concierge-vault-caught-up"><Check className="size-4" aria-hidden /> Nothing needs you right now — showing every item.</p>
      ) : null}

      <div className="concierge-vault-help">
        <span aria-hidden><CircleHelp className="size-5" /></span>
        <div>
          <strong>Not sure how to get or upload something?</strong>
          <p>Tap <b>How</b> on any item for the instructions already approved for that requirement—or message your team anytime.</p>
        </div>
        <small><Lock className="size-3.5" aria-hidden /> Encrypted · seen only by your team</small>
      </div>

      <nav className="concierge-category-nav" aria-label="Document categories">
        {groups.map((group) => {
          const Icon = SECTION_ICONS[group.category.key] ?? FilePenLine
          const done = group.items.filter((item) => bucketOf(item) === "done").length
          return (
            <a key={group.category.key} href={`#vault-${group.category.key}`}>
              <span><Icon className="size-[18px]" aria-hidden /></span>
              <strong>{group.category.label}</strong>
              <small>{done}/{group.items.length}</small>
            </a>
          )
        })}
      </nav>

      <div className="concierge-mobile-contents">
        <div><h3>What we need from you</h3><span>{totals.done} of {applicable.length} in</span></div>
        <nav aria-label="Document sections">
          {visibleBundles.filter((bundle) => bundle.key !== "sponsor").map((bundle) => {
            const count = bundle.groups.reduce((sum, group) => sum + group.items.length, 0)
            return (
              <a key={bundle.key} href={`#bundle-${bundle.key}`}>
                <span>{bundle.number}</span><small>{bundle.eyebrow}</small><strong>{count} items</strong>
              </a>
            )
          })}
        </nav>
        <p><CircleHelp className="size-4" aria-hidden /> Tap <b>How</b> on anything for a step-by-step guide.</p>
      </div>

      <div className="concierge-bundles">
        {visibleBundles.map((bundle) => {
          const bundleItems = bundle.groups.flatMap((group) => group.items)
          const bundleDone = bundleItems.filter((item) => bucketOf(item) === "done").length
          return (
            <section key={bundle.key} id={`bundle-${bundle.key}`} className="concierge-bundle" data-bundle={bundle.key}>
              <header className="concierge-bundle-header">
                <span className="concierge-bundle-number">{bundle.number}</span>
                <div><small>{bundle.eyebrow}</small><h3>{bundle.title}</h3><p>{bundle.sub}</p></div>
                <span className="concierge-bundle-count" aria-label={`${bundleDone} of ${bundleItems.length} in`}>
                  <strong>{bundleDone}</strong>/{bundleItems.length}
                </span>
              </header>
              <div className="concierge-bundle-body">
                {bundle.groups.map((group) => (
                  <VaultSection
                    key={group.category.key}
                    sectionKey={group.category.key}
                    title={group.category.label}
                    items={group.items}
                    filter={effectiveFilter}
                    ctx={ctx}
                    defaultOpen={firstNeedsYou.includes(group.category.key)}
                  />
                ))}
                {bundle.key === "people" && (referenceProgress || cohabitantProgress) ? (
                  <PeopleProgress references={referenceProgress} household={cohabitantProgress} />
                ) : null}
                {bundle.key === "confirm" ? (
                  <p className="concierge-fee-note">NYPD fees you&apos;ll pay directly: <strong>{ctx.feeSummary.total}</strong> · never to us</p>
                ) : null}
              </div>
            </section>
          )
        })}
      </div>
    </section>
  )
}

function bucketOf(item: ReqChecklistItem): Exclude<Filter, "all"> {
  if (item.status === "satisfied" || item.ladder === "approved") return "done"
  if (item.ladder === "submitted") return "received"
  return "needsYou"
}

function VaultSection({
  sectionKey,
  title,
  items,
  filter,
  ctx,
  defaultOpen,
}: {
  sectionKey: string
  title: string
  items: ReqChecklistItem[]
  filter: Filter
  ctx: RequirementCardCtx
  defaultOpen: boolean
}) {
  const [open, setOpen] = useState(defaultOpen)
  const visible = items.filter((item) => filter === "all" || bucketOf(item) === filter)
  const done = items.filter((item) => bucketOf(item) === "done").length
  const Icon = SECTION_ICONS[sectionKey] ?? FilePenLine

  if (visible.length === 0) return null

  return (
    <section id={`vault-${sectionKey}`} className="concierge-vault-panel scroll-mt-28" data-open={open}>
      <button
        type="button"
        className="concierge-vault-panel-header"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        aria-controls={`vault-panel-${sectionKey}`}
      >
        <span className="concierge-panel-icon"><Icon className="size-5" aria-hidden /></span>
        <span className="concierge-panel-title"><h3>{title}</h3><small>{done} of {items.length} in</small></span>
        <span className="concierge-panel-progress" aria-hidden><span style={{ width: `${Math.round((done / items.length) * 100)}%` }} /></span>
        <span className="concierge-panel-toggle">{open ? "Collapse" : "Open"}<ChevronDown className="size-4" aria-hidden /></span>
      </button>
      {open ? (
        <ul id={`vault-panel-${sectionKey}`} className="concierge-vault-items">
          {visible.map((item) => <RequirementCard key={item.id} item={item} ctx={ctx} presentation="concierge" />)}
        </ul>
      ) : null}
    </section>
  )
}

function PeopleProgress({ references, household }: { references: ReferenceProgress | null; household: ReferenceProgress | null }) {
  return (
    <div className="concierge-people-progress">
      <div><Users className="size-4" aria-hidden /><strong>People we contact for you</strong></div>
      {references ? <p><span>References</span><b>{references.notarizedCount}/{references.required} letters back</b></p> : null}
      {household ? <p><span>Household affidavits</span><b>{household.notarizedCount}/{household.required} back</b></p> : null}
      <Link href="/portal/people">Add or update names</Link>
    </div>
  )
}

function FilterChip({ active, onClick, label, count }: { active: boolean; onClick: () => void; label: string; count: number }) {
  return (
    <button type="button" onClick={onClick} aria-pressed={active} className={cn(active && "is-active")}>
      {label} <span>{count}</span>
    </button>
  )
}
