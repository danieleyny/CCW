"use client"

import { useState, useTransition, type ReactNode } from "react"
import { useRouter } from "next/navigation"
import { Check, GraduationCap, Handshake, Scale, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { createOffer } from "@/app/portal/marketplace/actions"
import { ChooseButton } from "@/components/portal/choose-instructor"
import type { MarketplaceStep } from "@/components/portal/marketplace-journey"
import {
  instructorCompareValue,
  instructorPrice,
  type InstructorCardData,
} from "@/components/portal/instructor-card"
import { usePortalI18n, interpolate } from "@/components/shared/portal-i18n-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { money } from "@/lib/format"

export function MarketplaceStepBar({ current, booked }: { current: MarketplaceStep; booked: boolean }) {
  const { messages } = usePortalI18n()
  const copy = messages.marketplace
  const steps = [
    [copy.stepRequest, copy.stepRequestDetail],
    [copy.stepCompare, copy.stepCompareDetail],
    [copy.stepChoose, copy.stepChooseDetail],
    [copy.stepBook, copy.stepBookDetail],
  ] as const
  const currentIndex = current === 4 ? 3 : current - 1

  return (
    <section className="marketplace-v2-step-card" aria-label={interpolate(copy.stepOf, { current: currentIndex + 1, label: steps[currentIndex][0] })}>
      <ol className="marketplace-v2-steps">
        {steps.map(([label, detail], index) => {
          const done = index < currentIndex || (booked && index === currentIndex)
          const active = index === currentIndex && !booked
          return (
            <li key={label} data-done={done} data-active={active} aria-current={active ? "step" : undefined}>
              <span className="marketplace-v2-step-marker" aria-hidden="true">
                {done ? <Check /> : String(index + 1).padStart(2, "0")}
              </span>
              <span>
                <strong>{label}</strong>
                <small>{booked && index === 3 ? copy.booked : detail}</small>
              </span>
            </li>
          )
        })}
      </ol>
      <div className="marketplace-v2-mobile-progress" aria-hidden="true">
        <span style={{ width: `${((currentIndex + 1) / 4) * 100}%` }} />
      </div>
      <p className="marketplace-v2-mobile-step">
        {interpolate(copy.stepOf, { current: currentIndex + 1, label: booked ? copy.booked : steps[currentIndex][0] })}
      </p>
    </section>
  )
}

export function MarketplacePanel({ hasOpenOffer, hasLocation }: { hasOpenOffer: boolean; hasLocation: boolean }) {
  const router = useRouter()
  const { messages } = usePortalI18n()
  const copy = messages.marketplace
  const [pending, startTransition] = useTransition()
  const [busyType, setBusyType] = useState<string | null>(null)

  function request(type: "training" | "full_assist") {
    setBusyType(type)
    startTransition(async () => {
      try {
        const res = await createOffer(type)
        toast.success(
          res.matched > 0
            ? interpolate(copy.sentMatched, { count: res.matched, suffix: res.matched === 1 ? "" : "s" })
            : copy.sentBroadcast
        )
        router.refresh()
      } catch {
        toast.error(copy.requestError)
      } finally {
        setBusyType(null)
      }
    })
  }

  return (
    <section className="marketplace-v2-request-card" aria-labelledby="marketplace-need-title">
      <header>
        <p className="portal-t-eyebrow">{copy.stepRequest}</p>
        <h2 id="marketplace-need-title">{copy.needTitle}</h2>
        <p>{copy.needBody}</p>
      </header>
      <div className="marketplace-v2-request-options">
        <article>
          <span className="marketplace-v2-request-icon"><GraduationCap aria-hidden="true" /></span>
          <div><h3>{copy.trainingTitle}</h3><p>{copy.trainingBody}</p></div>
          <Button disabled={pending || hasOpenOffer || !hasLocation} onClick={() => request("training")}>
            {busyType === "training" ? copy.sending : copy.requestTraining}
          </Button>
        </article>
        <article>
          <span className="marketplace-v2-request-icon is-outline"><Handshake aria-hidden="true" /></span>
          <div><h3>{copy.helpTitle}</h3><p>{copy.helpBody}</p></div>
          <Button variant="outline" disabled={pending || hasOpenOffer || !hasLocation} onClick={() => request("full_assist")}>
            {busyType === "full_assist" ? copy.sending : copy.requestHelp}
          </Button>
        </article>
      </div>
      {hasOpenOffer ? <p className="marketplace-v2-open-guard">{copy.openGuard}</p> : null}
    </section>
  )
}

export interface CompareInstructor {
  offerId: string
  instructorId: string
  data: InstructorCardData
}

export function MarketplaceCompare({ instructors }: { instructors: CompareInstructor[] }) {
  const { messages } = usePortalI18n()
  const copy = messages.marketplace
  const [open, setOpen] = useState(false)
  if (instructors.length < 2) return null

  const rows = [
    [copy.price, (data: InstructorCardData) => instructorPrice(data) == null ? "—" : money(instructorPrice(data))],
    [copy.distance, (data: InstructorCardData) => instructorCompareValue(data, "distance", copy)],
    [copy.rating, (data: InstructorCardData) => instructorCompareValue(data, "rating", copy)],
    [copy.range, (data: InstructorCardData) => instructorCompareValue(data, "range", copy)],
    [copy.ammo, (data: InstructorCardData) => instructorCompareValue(data, "ammo", copy)],
    [copy.format, (data: InstructorCardData) => instructorCompareValue(data, "format", copy)],
    [copy.languages, (data: InstructorCardData) => instructorCompareValue(data, "languages", copy)],
    [copy.nextOpeningLabel, (data: InstructorCardData) => data.nextAvailableLabel ?? "—"],
    [copy.introCall, (data: InstructorCardData) => instructorCompareValue(data, "intro", copy)],
  ] as const

  return (
    <>
      <Button variant="outline" onClick={() => setOpen(true)} className="marketplace-v2-compare-trigger">
        <Scale aria-hidden="true" /> {copy.compareSideBySide}
      </Button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="marketplace-v2-compare-dialog" manualPosition>
          <DialogHeader><DialogTitle>{copy.compareTitle}</DialogTitle></DialogHeader>
          <div className="marketplace-v2-compare-scroll">
            <table>
              <thead><tr><th scope="col"><span className="sr-only">{copy.compareTitle}</span></th>{instructors.map((item) => (
                <th scope="col" key={item.instructorId}>
                  <span className="marketplace-v2-compare-avatar" aria-hidden="true">{initials(item.data.name)}</span>
                  <strong>{item.data.name}</strong>
                  {item.data.verified ? <span><ShieldCheck aria-hidden="true" />{copy.verified}</span> : null}
                </th>
              ))}</tr></thead>
              <tbody>
                {rows.map(([label, value]) => <tr key={label}><th scope="row">{label}</th>{instructors.map((item) => <td key={item.instructorId}>{value(item.data)}</td>)}</tr>)}
                <tr><th scope="row"><span className="sr-only">{copy.stepChoose}</span></th>{instructors.map((item) => (
                  <td key={item.instructorId}><ChooseButton offerId={item.offerId} instructorId={item.instructorId} instructorName={item.data.name} /></td>
                ))}</tr>
              </tbody>
            </table>
          </div>
        </DialogContent>
      </Dialog>
    </>
  )
}

export function MarketplaceHubTabs({ items }: { items: { id: string; name: string; content: ReactNode }[] }) {
  const [active, setActive] = useState(items[0]?.id ?? "")
  if (items.length === 0) return null
  if (items.length === 1) return items[0].content
  return (
    <div>
      <div className="marketplace-v2-hub-tabs" role="tablist">
        {items.map((item) => <button key={item.id} type="button" role="tab" aria-selected={active === item.id} onClick={() => setActive(item.id)}>{item.name}</button>)}
      </div>
      {items.map((item) => <section key={item.id} role="tabpanel" hidden={active !== item.id}>{item.content}</section>)}
    </div>
  )
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}
