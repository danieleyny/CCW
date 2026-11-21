"use client"

import { useState, type ComponentType, type ReactNode } from "react"
import {
  Clock,
  Globe,
  Languages as LanguagesIcon,
  MapPin,
  Package,
  Phone,
  ShieldCheck,
  Sparkles,
  Star,
  Target,
  Users,
} from "lucide-react"
import { usePortalI18n, interpolate } from "@/components/shared/portal-i18n-provider"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { money } from "@/lib/format"
import type { Messages } from "@/lib/i18n/messages"

export interface InstructorCardData {
  name: string
  bio?: string | null
  verified?: boolean | null
  priceCents?: number | null
  ratingAvg?: number | null
  ratingCount?: number | null
  distanceMi?: number | null
  serviceRadiusMi?: number | null
  note?: string | null
  quotedPriceCents?: number | null
  locations?: { label: string; isRange: boolean; address?: string | null; borough?: string | null }[]
  nextAvailableLabel?: string | null
  yearsExperience?: number | null
  background?: string | null
  languages?: string[] | null
  websiteUrl?: string | null
  instagramHandle?: string | null
  classFormat?: string | null
  typicalClassSize?: number | null
  providesRange?: boolean | null
  separateRangeNote?: string | null
  rangeFeeIncluded?: boolean | null
  ammoIncluded?: boolean | null
  materialsIncluded?: boolean | null
  whatsToBring?: string | null
  schedulingNotes?: string | null
  responseTimeNote?: string | null
  offersIntroCall?: boolean | null
  introCallNote?: string | null
}

type MarketplaceCopy = Messages["marketplace"]
type CompareKey = "distance" | "rating" | "range" | "ammo" | "format" | "languages" | "intro"

export function instructorPrice(data: InstructorCardData): number | null {
  return data.quotedPriceCents ?? data.priceCents ?? null
}

export function instructorDistance(data: InstructorCardData): string | null {
  if (data.distanceMi == null) return null
  const miles = Number(data.distanceMi)
  if (!Number.isFinite(miles) || miles <= 0) return null
  return `${miles.toFixed(1)} mi away`
}

function formatLabel(data: InstructorCardData, copy: MarketplaceCopy): string | null {
  if (data.classFormat === "private_1on1") return copy.privateOne
  if (data.classFormat === "small_group") {
    return data.typicalClassSize ? interpolate(copy.smallGroup, { count: data.typicalClassSize }) : copy.smallGroup.replace(" (≤{count})", "")
  }
  if (data.classFormat === "both") return copy.privateOrGroup
  return null
}

export function instructorCompareValue(data: InstructorCardData, key: CompareKey, copy: MarketplaceCopy): string {
  if (key === "distance") return instructorDistance(data) ?? "—"
  if (key === "rating") return data.ratingCount ? `★ ${data.ratingAvg ?? "—"} (${data.ratingCount})` : "—"
  if (key === "range") {
    if (data.providesRange === true) return copy.rangeIncluded
    if (data.providesRange === false) return data.separateRangeNote ?? copy.notIncluded
    return "—"
  }
  if (key === "ammo") {
    if (data.ammoIncluded === true) return copy.ammoIncluded
    if (data.ammoIncluded === false) return copy.bringAmmo
    return "—"
  }
  if (key === "format") return formatLabel(data, copy) ?? "—"
  if (key === "languages") return data.languages?.length ? data.languages.join(", ") : "—"
  if (key === "intro") return data.offersIntroCall === true ? copy.freeIntro : data.offersIntroCall === false ? copy.notIncluded : "—"
  return "—"
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

export function InstructorCard({ data, action }: { data: InstructorCardData; action?: ReactNode }) {
  const [open, setOpen] = useState(false)
  const { messages } = usePortalI18n()
  const copy = messages.marketplace
  const price = instructorPrice(data)
  const distance = instructorDistance(data)
  const classFormat = formatLabel(data, copy)
  const classroom = (data.locations ?? []).filter((location) => !location.isRange)
  const ranges = (data.locations ?? []).filter((location) => location.isRange)

  const facts = [
    data.providesRange === true
      ? { icon: Target, text: copy.rangeIncluded, tone: "yes" }
      : data.providesRange === false && data.separateRangeNote
        ? { icon: Target, text: data.separateRangeNote, tone: "no" }
        : null,
    data.ammoIncluded != null
      ? { icon: Package, text: data.ammoIncluded ? copy.ammoIncluded : copy.bringAmmo, tone: data.ammoIncluded ? "yes" : "no" }
      : null,
    classFormat ? { icon: Users, text: classFormat, tone: "yes" } : null,
    data.languages?.length ? { icon: LanguagesIcon, text: data.languages.join(", "), tone: "yes" } : null,
    data.nextAvailableLabel ? { icon: Clock, text: interpolate(copy.nextOpening, { date: data.nextAvailableLabel }), tone: "yes" } : null,
    data.offersIntroCall ? { icon: Sparkles, text: copy.freeIntro, tone: "yes", title: data.introCallNote ?? undefined } : null,
    data.locations?.[0]?.label ? { icon: MapPin, text: data.locations[0].label, tone: "yes" } : null,
  ].filter(Boolean) as { icon: typeof Target; text: string; tone: string; title?: string }[]

  return (
    <article className="marketplace-v2-instructor-card">
      <header>
        <span className="marketplace-v2-avatar" aria-hidden="true">{initials(data.name)}</span>
        <div className="marketplace-v2-instructor-identity">
          <div><h3>{data.name}</h3>{data.verified ? <span className="marketplace-v2-verified"><ShieldCheck aria-hidden="true" />{copy.verified}</span> : null}</div>
          <p>
            {data.ratingCount ? <span><Star aria-hidden="true" /> {data.ratingAvg} ({data.ratingCount})</span> : null}
            {data.ratingCount && distance ? <span aria-hidden="true"> · </span> : null}
            {distance ? <span>{distance}</span> : null}
          </p>
        </div>
        {price != null ? <div className="marketplace-v2-price"><strong>{money(price)}</strong><span>{copy.coursePrice}</span></div> : null}
      </header>

      {data.note ? <div className="marketplace-v2-instructor-note"><span>{copy.theirNote}</span><p>{data.note}</p></div> : null}
      {facts.length ? <ul className="marketplace-v2-facts">{facts.map((fact, index) => {
        const Icon = fact.icon
        return <li key={`${fact.text}-${index}`} data-tone={fact.tone} title={fact.title}><Icon aria-hidden="true" /><span>{fact.text}</span></li>
      })}</ul> : null}

      <footer>
        <Button variant="ghost" onClick={() => setOpen(true)}>{copy.viewProfile}</Button>
        {action}
      </footer>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="marketplace-v2-profile-drawer" manualPosition>
          <DialogHeader>
            <DialogTitle><span className="marketplace-v2-avatar" aria-hidden="true">{initials(data.name)}</span><span>{data.name}{data.verified ? <small><ShieldCheck aria-hidden="true" />{copy.verified}</small> : null}</span></DialogTitle>
          </DialogHeader>
          <div className="marketplace-v2-profile-scroll">
            {data.bio ? <p className="marketplace-v2-profile-bio">{data.bio}</p> : null}
            {data.background ? <Detail icon={ShieldCheck} label={copy.profileBackground}>{data.background}</Detail> : null}
            {data.yearsExperience != null ? <Detail icon={Clock} label={copy.profileExperience}>{interpolate(copy.yearsTeaching, { count: data.yearsExperience })}</Detail> : null}
            <Detail icon={Target} label={copy.profileCourse}>
              <ul>
                <li>{price != null ? `${money(price)} · ${copy.coursePrice}` : copy.priceOnRequest}</li>
                {classFormat ? <li>{classFormat}</li> : null}
                <li>{copy.courseRequirement}</li>
              </ul>
            </Detail>
            <Detail icon={Package} label={copy.profileIncluded}>
              <ul>
                {data.rangeFeeIncluded != null ? <li>{data.rangeFeeIncluded ? copy.rangeFeeIncluded : copy.rangeFeeSeparate}</li> : null}
                {data.ammoIncluded != null ? <li>{data.ammoIncluded ? copy.ammoIncluded : copy.bringAmmo}</li> : null}
                {data.materialsIncluded != null ? <li>{data.materialsIncluded ? copy.materialsIncluded : copy.materialsNotIncluded}</li> : null}
              </ul>
            </Detail>
            <Detail icon={MapPin} label={copy.profileWhere}>
              <ul>
                {classroom.map((location, index) => <li key={`class-${index}`}>{location.label}{location.address ? ` — ${location.address}` : ""}</li>)}
                {ranges.map((location, index) => <li key={`range-${index}`}>{location.label}{location.address ? ` — ${location.address}` : ""}</li>)}
                {data.providesRange === false && data.separateRangeNote ? <li>{data.separateRangeNote}</li> : null}
                {classroom.length === 0 && ranges.length === 0 ? <li>{copy.locationsAfterConnect}</li> : null}
              </ul>
            </Detail>
            {data.whatsToBring ? <Detail icon={Package} label={copy.profileBring}>{data.whatsToBring}</Detail> : null}
            {data.schedulingNotes || data.responseTimeNote ? <Detail icon={Clock} label={copy.profileScheduling}>{[data.schedulingNotes, data.responseTimeNote].filter(Boolean).join(" · ")}</Detail> : null}
            {data.languages?.length ? <Detail icon={LanguagesIcon} label={copy.languages}>{data.languages.join(", ")}</Detail> : null}
            {data.offersIntroCall ? <Detail icon={Phone} label={copy.freeIntro}>{data.introCallNote ?? copy.freeIntro}</Detail> : null}
            {data.websiteUrl || data.instagramHandle ? <Detail icon={Globe} label={copy.profileFind}>
              <div className="marketplace-v2-profile-links">
                {data.websiteUrl ? <a href={data.websiteUrl} target="_blank" rel="noreferrer">{copy.profileWebsite}</a> : null}
                {data.instagramHandle ? <a href={`https://instagram.com/${data.instagramHandle.replace(/^@/, "")}`} target="_blank" rel="noreferrer">{data.instagramHandle}</a> : null}
              </div>
            </Detail> : null}
          </div>
          {action ? <div className="marketplace-v2-profile-action">{action}</div> : null}
        </DialogContent>
      </Dialog>
    </article>
  )
}

function Detail({ icon: Icon, label, children }: { icon: ComponentType<{ className?: string }>; label: string; children: ReactNode }) {
  return <section className="marketplace-v2-profile-detail"><h4><Icon aria-hidden="true" />{label}</h4><div>{children}</div></section>
}
