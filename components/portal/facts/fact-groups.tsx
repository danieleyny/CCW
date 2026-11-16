"use client"

import { useEffect, useMemo, useRef, useState, type ReactNode } from "react"
import {
  ArrowRight,
  Briefcase,
  Building2,
  Check,
  CheckCircle2,
  ChevronRight,
  Clock3,
  FileBadge2,
  Home,
  IdCard,
  Lock,
  Phone,
  Save,
  Scale,
  ShieldCheck,
  User,
  type LucideIcon,
} from "lucide-react"
import { FactRow } from "./fact-row"
import { flagAttorneyReview } from "@/app/portal/facts/actions"
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { cn } from "@/lib/utils"
import type { FactGroupData, GroupIcon } from "@/lib/facts/details-view"

const GROUP_ICONS: Record<GroupIcon, LucideIcon> = {
  "id-card": IdCard,
  home: Home,
  phone: Phone,
  user: User,
  briefcase: Briefcase,
  building: Building2,
  "shield-check": ShieldCheck,
  lock: Lock,
  scale: Scale,
}

type SectionProgress = {
  id: string
  label: string
  icon: LucideIcon
  captured?: number
  total?: number
}

/**
 * Grouped, inline-editable fact rows — the one preparation surface reused by the
 * applicant and sponsor views. Persistence remains in the existing row actions.
 */
export function FactGroups({
  caseId,
  groups,
  total,
  showMeter = false,
  flagEligibility = false,
  children,
}: {
  caseId: string
  groups: FactGroupData[]
  /** Editable, non-SSN denominator for the meter. */
  total: number
  showMeter?: boolean
  /** Applicant-only citizenship escalation. Sponsors must never flag a case. */
  flagEligibility?: boolean
  /** History and firearms stay inside the same visual/scroll-spy workspace. */
  children?: ReactNode
}) {
  const [values, setValues] = useState<Record<string, string>>(() => {
    const current: Record<string, string> = {}
    for (const group of groups) {
      for (const row of group.rows) if (row.kind === "editable") current[row.key] = row.value
    }
    return current
  })
  const [ssnOnFile, setSsnOnFile] = useState<Record<string, boolean>>(() => {
    const current: Record<string, boolean> = {}
    for (const group of groups) {
      for (const row of group.rows) if (row.kind === "ssn") current[row.key] = !!row.onFile
    }
    return current
  })
  const containerRef = useRef<HTMLDivElement>(null)

  function focusNext(from: HTMLElement): boolean {
    const inputs = Array.from(containerRef.current?.querySelectorAll<HTMLElement>("[data-fact-input]") ?? [])
    const index = inputs.indexOf(from)
    if (index >= 0 && index < inputs.length - 1) {
      inputs[index + 1].focus()
      return true
    }
    return false
  }

  const groupProgress = useMemo(
    () =>
      groups.map((group) => {
        const rows = group.rows.filter(
          (row) =>
            !row.showWhen || row.showWhen.equals.includes((values[row.showWhen.key] ?? "").trim())
        )
        const required = rows.filter((row) => row.kind === "editable" && !row.optional)
        return {
          group,
          rows,
          captured: required.filter((row) => (values[row.key] ?? "").trim() !== "").length,
          total: required.length,
        }
      }),
    [groups, values]
  )

  const requiredKeys = useMemo(() => {
    const keys = new Set<string>()
    for (const item of groupProgress) {
      for (const row of item.rows) if (row.kind === "editable" && !row.optional) keys.add(row.key)
    }
    return keys
  }, [groupProgress])
  const liveTotal = requiredKeys.size
  const captured = useMemo(
    () => [...requiredKeys].filter((key) => (values[key] ?? "").trim() !== "").length,
    [requiredKeys, values]
  )

  const outstanding = useMemo(() => {
    const items: { key: string; label: string; section: string }[] = []
    for (const item of groupProgress) {
      for (const row of item.rows) {
        if (row.kind === "editable" && !row.optional && (values[row.key] ?? "").trim() === "") {
          items.push({ key: row.key, label: row.label, section: item.group.label })
        }
      }
    }
    return items
  }, [groupProgress, values])

  const navSections = useMemo<SectionProgress[]>(
    () => [
      ...groupProgress
        .filter((item) => item.rows.length > 0)
        .map((item) => ({
          id: item.group.key,
          label: item.group.label,
          icon: GROUP_ICONS[item.group.icon],
          captured: item.captured,
          total: item.total,
        })),
      { id: "history", label: "5-year history", icon: Clock3 },
      { id: "records", label: "Firearms & licences", icon: FileBadge2 },
    ],
    [groupProgress]
  )
  const sectionIds = useMemo(() => navSections.map((section) => section.id), [navSections])
  const [activeSection, setActiveSection] = useState(sectionIds[0] ?? "")

  useEffect(() => {
    const elements = sectionIds
      .map((id) => document.getElementById(id))
      .filter((element): element is HTMLElement => !!element)
    if (!elements.length) return

    const observer = new IntersectionObserver(
      (entries) => {
        const atPageEnd = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 8
        if (atPageEnd) {
          const lastId = sectionIds[sectionIds.length - 1]
          if (lastId) setActiveSection(lastId)
          return
        }
        const visible = entries
          .filter((entry) => entry.isIntersecting)
          .sort((a, b) => a.boundingClientRect.top - b.boundingClientRect.top)
        if (visible[0]?.target.id) setActiveSection(visible[0].target.id)
      },
      { rootMargin: "-132px 0px -62%", threshold: [0, 0.08, 0.35] }
    )
    for (const element of elements) observer.observe(element)
    return () => observer.disconnect()
  }, [sectionIds])

  const [dialogOpen, setDialogOpen] = useState(false)

  const jumpTo = (key: string) => {
    setDialogOpen(false)
    setTimeout(() => {
      const element = document.getElementById(`fact-${key}`)
      if (!element) return
      element.scrollIntoView({ behavior: "smooth", block: "center" })
      ;(element as HTMLElement).focus({ preventScroll: true })
      const pulseTarget = element.closest<HTMLElement>("[data-fact-field]") ?? element
      pulseTarget.classList.remove("fact-pulse")
      void pulseTarget.offsetWidth
      pulseTarget.classList.add("fact-pulse")
      setTimeout(() => pulseTarget.classList.remove("fact-pulse"), 1900)
    }, 60)
  }

  const scrollToSection = (id: string) => {
    const element = document.getElementById(id)
    if (!element) return
    setActiveSection(id)
    element.scrollIntoView({ behavior: "smooth", block: "start" })
  }

  const citizenship = values["applicant.citizenship"] ?? ""
  const meter = showMeter ? (
    <Meter
      captured={captured}
      total={liveTotal || total}
      outstandingCount={outstanding.length}
      onJump={() => outstanding[0] && jumpTo(outstanding[0].key)}
      onOpen={() => setDialogOpen(true)}
    />
  ) : null

  return (
    <>
      {showMeter && (
        <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
          <DialogContent className="details-needed-dialog max-w-md">
            <DialogHeader>
              <DialogTitle className="portal-title-font text-2xl">
                {outstanding.length} still needed
              </DialogTitle>
              <DialogDescription>
                Choose any missing detail to jump directly to that field.
              </DialogDescription>
            </DialogHeader>
            {outstanding.length > 0 && (
              <button
                type="button"
                onClick={() => jumpTo(outstanding[0].key)}
                className="details-gold-button"
              >
                Jump to the next one <ArrowRight aria-hidden className="size-4" />
              </button>
            )}
            <ul className="mt-1 max-h-[50vh] space-y-1 overflow-y-auto">
              {groupOutstanding(outstanding).map(({ section, items }) => (
                <li key={section}>
                  <div className="portal-t-label px-1 pb-1 pt-3 text-text-low">{section}</div>
                  {items.map((item) => (
                    <button
                      key={item.key}
                      type="button"
                      onClick={() => jumpTo(item.key)}
                      className="details-needed-row"
                    >
                      <span>{item.label}</span>
                      <ChevronRight aria-hidden className="size-4 shrink-0 text-text-low" />
                    </button>
                  ))}
                </li>
              ))}
            </ul>
          </DialogContent>
        </Dialog>
      )}

      <div className="details-mobile-meter">{meter}</div>
      <MobileSectionNav
        sections={navSections}
        active={activeSection}
        onSelect={scrollToSection}
      />

      <div className="details-workspace">
        <aside className="details-sidebar">
          {meter}
          <SectionNav sections={navSections} active={activeSection} onSelect={scrollToSection} />
          <p className="details-autosave-note">
            <Save aria-hidden className="size-4" /> Every answer saves as you go.
          </p>
        </aside>

        <div ref={containerRef} className="details-sections">
          {groupProgress.map(({ group, rows, captured: groupCaptured, total: groupTotal }) => {
            if (rows.length === 0) return null
            const Icon = GROUP_ICONS[group.icon]
            const complete = groupTotal === 0 || groupCaptured === groupTotal
            return (
              <section key={group.key} id={group.key} className="details-section-card">
                <header className="details-section-header">
                  <div className="details-section-icon">
                    <Icon aria-hidden className="size-5" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <h2>{group.label}</h2>
                    <p>{group.description}</p>
                  </div>
                  <span
                    className={cn("details-count-pill", complete && "is-complete")}
                    aria-label={`${groupCaptured} of ${groupTotal} required details captured in ${group.label}`}
                  >
                    {complete && <Check aria-hidden className="size-3.5" />}
                    {groupCaptured}/{groupTotal}
                  </span>
                </header>

                <div className="details-fields-grid">
                  {rows.map((row) => (
                    <FactRow
                      key={row.key}
                      caseId={caseId}
                      meta={row.kind === "ssn" ? { ...row, onFile: ssnOnFile[row.key] } : row}
                      value={row.kind === "editable" ? values[row.key] ?? "" : row.value}
                      onSaved={(key, next) => setValues((previous) => ({ ...previous, [key]: next }))}
                      onSsnSaved={() => setSsnOnFile((previous) => ({ ...previous, [row.key]: true }))}
                      focusNext={focusNext}
                    />
                  ))}
                  {group.key === "you" && citizenship === "Neither" && (
                    <CitizenshipEligibilityNotice caseId={caseId} flagEligibility={flagEligibility} />
                  )}
                </div>
              </section>
            )
          })}
          {children}
        </div>
      </div>
    </>
  )
}

function SectionNav({
  sections,
  active,
  onSelect,
}: {
  sections: SectionProgress[]
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <nav aria-label="Sections" className="details-section-nav">
      {sections.map((section) => {
        const Icon = section.icon
        const isActive = active === section.id
        return (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={isActive ? "true" : undefined}
            className={cn("details-nav-row", isActive && "is-active")}
            onClick={(event) => {
              event.preventDefault()
              onSelect(section.id)
            }}
          >
            <span className="details-nav-icon"><Icon aria-hidden className="size-3.5" /></span>
            <span className="min-w-0 flex-1 truncate">{section.label}</span>
            {typeof section.total === "number" && (
              <span className="details-nav-count">{section.captured}/{section.total}</span>
            )}
          </a>
        )
      })}
    </nav>
  )
}

function MobileSectionNav({
  sections,
  active,
  onSelect,
}: {
  sections: SectionProgress[]
  active: string
  onSelect: (id: string) => void
}) {
  return (
    <nav aria-label="Sections" className="details-mobile-nav">
      <div className="details-mobile-nav-track">
        {sections.map((section) => (
          <a
            key={section.id}
            href={`#${section.id}`}
            aria-current={active === section.id ? "true" : undefined}
            className={cn("details-mobile-pill", active === section.id && "is-active")}
            onClick={(event) => {
              event.preventDefault()
              onSelect(section.id)
            }}
          >
            <span>{section.label}</span>
            {typeof section.total === "number" && <b>{section.captured}/{section.total}</b>}
          </a>
        ))}
      </div>
    </nav>
  )
}

function CitizenshipEligibilityNotice({ caseId, flagEligibility }: { caseId: string; flagEligibility: boolean }) {
  useEffect(() => {
    if (flagEligibility) void flagAttorneyReview(caseId, "citizenship_neither")
  }, [caseId, flagEligibility])
  return (
    <div className="details-eligibility-notice">
      <p className="font-semibold text-danger">We can&apos;t move this application forward yet.</p>
      <p className="mt-1 text-text-mid">
        Under federal law (18 U.S.C. § 922(g)(5)), a person who is neither a U.S. citizen nor a lawful
        permanent resident is generally prohibited from possessing a firearm. We can&apos;t advise on your
        specific situation, and we won&apos;t take payment while this is unresolved.
      </p>
      <p className="mt-1 text-text-mid">
        We&apos;ve flagged your case for attorney review — your consultant will reach out about the right next step.
      </p>
    </div>
  )
}

function groupOutstanding(outstanding: { key: string; label: string; section: string }[]) {
  const grouped: { section: string; items: { key: string; label: string; section: string }[] }[] = []
  for (const item of outstanding) {
    const previous = grouped[grouped.length - 1]
    if (previous?.section === item.section) previous.items.push(item)
    else grouped.push({ section: item.section, items: [item] })
  }
  return grouped
}

function Meter({
  captured,
  total,
  outstandingCount,
  onJump,
  onOpen,
}: {
  captured: number
  total: number
  outstandingCount: number
  onJump: () => void
  onOpen: () => void
}) {
  const pct = total > 0 ? Math.round((captured / total) * 100) : 100
  const done = outstandingCount === 0

  return (
    <section className={cn("details-meter", done && "is-complete")} aria-label="Details completion">
      <div className="details-meter-summary">
        <div
          className="details-meter-ring"
          style={{ "--meter-progress": `${pct * 3.6}deg` } as React.CSSProperties}
          aria-label={`${pct}% complete`}
        >
          <span>{pct}%</span>
        </div>
        <div>
          <h2>{done ? "All details captured" : `${captured} of ${total} details`}</h2>
          <p>{done ? "Your reusable information is ready." : `${outstandingCount} still needed · saves automatically`}</p>
        </div>
      </div>
      {!done && (
        <>
          <button type="button" onClick={onJump} className="details-gold-button">
            Jump to the next one <ArrowRight aria-hidden className="size-4" />
          </button>
          <button type="button" onClick={onOpen} className="details-meter-link">
            See all {outstandingCount} still needed
          </button>
        </>
      )}
      {done && (
        <div className="details-meter-done">
          <CheckCircle2 aria-hidden className="size-4" /> Ready and saved
        </div>
      )}
    </section>
  )
}
