"use client"

import { useMemo, useRef, useState, useTransition, type CSSProperties, type PointerEvent } from "react"
import {
  ArrowRight,
  ChevronDown,
  Download,
  FileSignature,
  History,
  LockKeyhole,
  Upload,
  UserRound,
  UsersRound,
  type LucideIcon,
} from "lucide-react"
import { toast } from "sonner"
import { checkFilingPackReadiness } from "@/app/portal/forms/actions"
import { Button } from "@/components/ui/button"
import { Dialog, DialogClose, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog"
import type {
  FilingPackGroupKey,
  FilingPackOutstandingGroup,
  FilingPackReadiness,
} from "@/lib/filing-pack/readiness"

const GROUP_ICONS: Record<FilingPackOutstandingGroup["icon"], LucideIcon> = {
  user: UserRound,
  upload: Upload,
  "file-signature": FileSignature,
  users: UsersRound,
  history: History,
}
export function FilingPackDownload({
  initialReadiness,
  initialOpen,
}: {
  initialReadiness: FilingPackReadiness
  initialOpen: boolean
}) {
  const [readiness, setReadiness] = useState(initialReadiness)
  const [open, setOpen] = useState(initialOpen && !initialReadiness.ready)
  const [checking, startChecking] = useTransition()

  function download() {
    startChecking(async () => {
      const result = await checkFilingPackReadiness()
      if (!result.data) {
        toast.error(result.error ?? "We couldn't check your filing pack. Try again.")
        return
      }
      setReadiness(result.data)
      if (result.data.ready) window.location.assign("/portal/filing-pack")
      else setOpen(true)
    })
  }

  return (
    <>
      <Button type="button" variant="gold" size="lg" onClick={download} disabled={checking}>
        <Download aria-hidden /> {checking ? "Checking your pack…" : "Download filing pack"}
      </Button>
      <FilingPackGate
        key={readiness.groups.map((group) => `${group.key}:${group.items.length}`).join("|")}
        open={open}
        onOpenChange={setOpen}
        readiness={readiness}
      />
    </>
  )
}
function FilingPackGate({
  open,
  onOpenChange,
  readiness,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  readiness: FilingPackReadiness
}) {
  const count = readiness.groups.reduce((total, group) => total + group.items.length, 0)
  const many = count > 4
  const first = readiness.groups[0]?.items[0]
  const initiallyOpen = useMemo(
    () => new Set(many ? readiness.groups.slice(0, 2).map((group) => group.key) : readiness.groups.map((group) => group.key)),
    [many, readiness.groups]
  )
  const [openGroups, setOpenGroups] = useState<Set<FilingPackGroupKey>>(initiallyOpen)
  const pointerStart = useRef<number | null>(null)

  function toggleGroup(key: FilingPackGroupKey) {
    setOpenGroups((current) => {
      const next = new Set(current)
      if (next.has(key)) next.delete(key)
      else next.add(key)
      return next
    })
  }

  function pointerDown(event: PointerEvent<HTMLDivElement>) {
    pointerStart.current = event.clientY
    event.currentTarget.setPointerCapture(event.pointerId)
  }

  function pointerUp(event: PointerEvent<HTMLDivElement>) {
    if (pointerStart.current !== null && event.clientY - pointerStart.current > 80) onOpenChange(false)
    pointerStart.current = null
  }

  const summary = many ? (
    <>You can download it once everything below is complete. <strong>{count} things</strong> left — tap any one to jump straight to it.</>
  ) : (
    <>You can download it once everything below is complete. Just <strong>{count} {count === 1 ? "thing" : "things"}</strong> left — you&apos;re almost there.</>
  )

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="filing-gate-dialog"
        overlayClassName="filing-gate-overlay"
        showCloseButton={false}
        manualPosition
        disableOverlayBlur
      >
        <div className="filing-gate-grab-area" onPointerDown={pointerDown} onPointerUp={pointerUp} aria-hidden>
          <span />
        </div>

        <aside className="filing-gate-pack-panel">
          <div className="filing-gate-locked-pack" aria-hidden>
            <span className="filing-gate-back-page" />
            <span className="filing-gate-front-page"><LockKeyhole /></span>
          </div>
          <div
            className="filing-gate-ring"
            role="img"
            aria-label={`${readiness.percentReady}% ready`}
            style={{ "--ready": `${readiness.percentReady * 3.6}deg` } as CSSProperties}
          >
            <span>{readiness.percentReady}%</span>
            <small>Ready</small>
          </div>
          <p>{count} items to go. Everything you finish is saved — come back anytime.</p>
        </aside>

        <section className="filing-gate-main">
          <header className="filing-gate-header">
            <span className="filing-gate-lock-tile" aria-hidden><LockKeyhole /></span>
            <div>
              <span className="portal-t-eyebrow">Filing pack</span>
              <DialogTitle>We&apos;re sorry — your filing pack isn&apos;t ready yet</DialogTitle>
              <DialogDescription>{summary}</DialogDescription>
            </div>
            <DialogClose className="filing-gate-close" aria-label="Close filing pack checklist">×</DialogClose>
          </header>

          {many && <GroupTypeBar groups={readiness.groups} />}

          <div className="filing-gate-list">
            {readiness.groups.map((group) => {
              const Icon = GROUP_ICONS[group.icon]
              const expanded = openGroups.has(group.key)
              return (
                <section className={`filing-gate-group filing-gate-group-${group.key}`} key={group.key}>
                  <button
                    type="button"
                    className="filing-gate-group-toggle"
                    onClick={() => toggleGroup(group.key)}
                    aria-expanded={expanded}
                  >
                    <Icon aria-hidden />
                    <span>{group.label}</span>
                    <b>{group.items.length}</b>
                    <ChevronDown aria-hidden />
                  </button>
                  <div className="filing-gate-group-items" hidden={!expanded}>
                    {group.items.map((item, index) => (
                      <div className={`filing-gate-item ${many && index >= 4 ? "filing-gate-item-overflow" : ""}`} key={`${item.href}-${item.label}-${index}`}>
                        <span className="filing-gate-status-dot" aria-hidden />
                        <div><strong>{item.label}</strong><small>{item.sub}</small></div>
                        <span className="filing-gate-destination">{item.destination}</span>
                        <a href={item.href} aria-label={`Go to ${item.label}`}>Go <ArrowRight aria-hidden /></a>
                      </div>
                    ))}
                    {many && group.items.length > 4 && (
                      <button
                        type="button"
                        className="filing-gate-show-all"
                        onClick={(event) => event.currentTarget.closest(".filing-gate-group")?.classList.add("show-all")}
                      >
                        Show all {group.items.length}
                      </button>
                    )}
                  </div>
                </section>
              )
            })}
          </div>

          <footer className="filing-gate-footer">
            <a className="filing-gate-documents-link" href="/portal/packet" target="_blank" rel="noreferrer">Just the documents stays available anytime</a>
            <DialogClose asChild><Button variant="outline" size="lg">Close</Button></DialogClose>
            {first && (
              <Button asChild variant="gold" size="lg">
                <a href={first.href}>Start with: {first.label} <ArrowRight aria-hidden /></a>
              </Button>
            )}
          </footer>
        </section>
      </DialogContent>
    </Dialog>
  )
}
function GroupTypeBar({ groups }: { groups: FilingPackOutstandingGroup[] }) {
  return (
    <div className="filing-gate-type-summary" aria-label="Outstanding items by type">
      <div className="filing-gate-type-bar" aria-hidden>
        {groups.map((group) => (
          <span key={group.key} className={`filing-gate-type-${group.key}`} style={{ flex: group.items.length }} />
        ))}
      </div>
      <div className="filing-gate-type-legend">
        {groups.map((group) => (
          <span key={group.key} className={`filing-gate-type-${group.key}`}><i /> {group.label} <b>{group.items.length}</b></span>
        ))}
      </div>
    </div>
  )
}
