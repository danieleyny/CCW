"use client"

import { useState } from "react"
import {
  Star,
  MapPin,
  ShieldCheck,
  Users,
  Languages as LanguagesIcon,
  Clock,
  Globe,
  Phone,
  Sparkles,
  Target,
  Package,
} from "lucide-react"
import { money } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"

export interface InstructorCardData {
  name: string
  bio?: string | null
  /**
   * VERIFIED, not "has typed a DCJS number". The badge used to render on the
   * presence of dcjs_id, so anyone could look credentialed by filling in a box.
   */
  verified?: boolean | null
  priceCents?: number | null
  ratingAvg?: number | null
  ratingCount?: number | null
  distanceMi?: number | null
  /** Their service radius — the honest fallback when we can't compute distance. */
  serviceRadiusMi?: number | null
  note?: string | null
  quotedPriceCents?: number | null
  locations?: { label: string; isRange: boolean; address?: string | null; borough?: string | null }[]
  nextAvailable?: string | null

  // The profile depth that makes an instructor choosable
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

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

const FORMAT_LABEL: Record<string, string> = {
  private_1on1: "Private, one-on-one",
  small_group: "Small group",
  both: "Private or small group",
}

/**
 * "0.0 mi away" was a lie dressed as precision — it showed whenever a coordinate
 * was missing. A wrong zero is worse than no number, so we only print a distance
 * we actually computed and otherwise say what we do know: they serve this area.
 */
function distanceLabel(distanceMi?: number | null, serviceRadiusMi?: number | null): string | null {
  if (distanceMi == null) return serviceRadiusMi ? "Serves your area" : null
  const mi = Number(distanceMi)
  if (!Number.isFinite(mi) || mi <= 0) return "Serves your area"
  return `${mi.toFixed(1)} mi away`
}

/** One line on what the price covers — the range fee is what surprises people. */
function includedSummary(d: InstructorCardData): string | null {
  const parts: string[] = []
  if (d.rangeFeeIncluded) parts.push("range")
  if (d.ammoIncluded) parts.push("ammo")
  if (d.materialsIncluded) parts.push("materials")
  return parts.length ? `${parts.join(" + ")} included` : null
}

/**
 * Applicant-facing instructor card: enough at a glance to shortlist, with the
 * full profile behind it for the decision itself. Everything shown is the
 * instructor's own business information — no applicant PII flows the other way.
 */
export function InstructorCard({
  data,
  action,
}: {
  data: InstructorCardData
  action?: React.ReactNode
}) {
  const [open, setOpen] = useState(false)
  const price = data.quotedPriceCents ?? data.priceCents
  const distance = distanceLabel(data.distanceMi, data.serviceRadiusMi)
  const included = includedSummary(data)
  const classroom = (data.locations ?? []).filter((l) => !l.isRange)
  const ranges = (data.locations ?? []).filter((l) => l.isRange)

  return (
    <Card>
      <CardContent className="p-4">
        <div className="flex items-start gap-3">
          <div className="flex size-11 shrink-0 items-center justify-center rounded-full bg-surface-3 font-display text-sm font-semibold text-brass">
            {initials(data.name)}
          </div>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
              <span className="font-medium">{data.name}</span>
              {/* Verified by an admin — never merely "typed a credential number". */}
              {data.verified && (
                <span className="inline-flex items-center gap-1 text-xs text-ok">
                  <ShieldCheck className="size-3" /> DCJS-credentialed
                </span>
              )}
              {!data.ratingCount && (
                <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] text-text-mid">
                  New to the platform
                </span>
              )}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-mid">
              {distance && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {distance}
                </span>
              )}
              {price != null && (
                <span>
                  {money(price)} · 18-hr course
                  {included ? ` · ${included}` : ""}
                </span>
              )}
              {/* No rating until there's a real one — never a fabricated score. */}
              {data.ratingCount ? (
                <span className="flex items-center gap-0.5">
                  <Star className="size-3 text-brass" /> {data.ratingAvg} ({data.ratingCount})
                </span>
              ) : null}
            </div>

            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-mid">
              {data.classFormat && FORMAT_LABEL[data.classFormat] && (
                <span className="flex items-center gap-1">
                  <Users className="size-3" /> {FORMAT_LABEL[data.classFormat]}
                </span>
              )}
              {(data.languages ?? []).length > 0 && (
                <span className="flex items-center gap-1">
                  <LanguagesIcon className="size-3" /> {(data.languages ?? []).join(", ")}
                </span>
              )}
              {data.yearsExperience != null && <span>{data.yearsExperience} yrs teaching</span>}
            </div>

            {data.bio && <p className="mt-2 line-clamp-3 text-sm text-text-mid">{data.bio}</p>}

            {data.note && (
              <p className="mt-2 rounded-md border border-hairline bg-surface-2/50 p-2 text-sm">
                <span className="text-text-low">Note: </span>
                {data.note}
              </p>
            )}

            <div className="mt-2 flex flex-wrap gap-1.5">
              {classroom.map((l, i) => (
                <span key={`c${i}`} className="rounded bg-surface-2 px-2 py-0.5 text-xs text-text-mid">
                  Classroom: {l.borough ?? l.label}
                </span>
              ))}
              {data.providesRange === true ? (
                <span className="rounded bg-ok/10 px-2 py-0.5 text-xs text-ok">Range included</span>
              ) : data.providesRange === false && data.separateRangeNote ? (
                <span className="rounded bg-surface-2 px-2 py-0.5 text-xs text-text-mid">
                  Range: {data.separateRangeNote.split(/[,;—]/)[0]}
                </span>
              ) : null}
              {data.offersIntroCall && (
                <span className="inline-flex items-center gap-1 rounded bg-signal-dim px-2 py-0.5 text-xs text-signal">
                  <Sparkles className="size-3" /> Free intro call
                </span>
              )}
            </div>

            {data.nextAvailable && (
              <p className="mt-2 text-xs text-text-mid">
                Next opening:{" "}
                <span className="text-foreground">
                  {new Date(data.nextAvailable).toLocaleString("en-US", {
                    dateStyle: "medium",
                    timeStyle: "short",
                  })}
                </span>
              </p>
            )}
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center justify-end gap-2">
          <Button size="sm" variant="ghost" className="min-h-[44px]" onClick={() => setOpen(true)}>
            View full profile
          </Button>
          {action}
        </div>

        {/* Radix portals mount outside the app's .dark shell — hence `dark`. */}
        <Dialog open={open} onOpenChange={setOpen}>
          <DialogContent className="dark flex max-h-[90dvh] w-full flex-col overflow-hidden bg-background p-0 text-foreground sm:max-w-2xl">
            <DialogHeader className="border-b border-hairline px-4 py-3">
              <DialogTitle className="flex flex-wrap items-center gap-2">
                {data.name}
                {data.verified && (
                  <span className="inline-flex items-center gap-1 text-xs text-ok">
                    <ShieldCheck className="size-3" /> DCJS-credentialed
                  </span>
                )}
              </DialogTitle>
            </DialogHeader>

            <div className="min-h-0 flex-1 space-y-4 overflow-y-auto px-4 py-4 text-sm">
              {data.bio && <p className="text-text-mid">{data.bio}</p>}
              {data.background && (
                <Detail icon={ShieldCheck} label="Background">
                  {data.background}
                </Detail>
              )}
              {data.yearsExperience != null && (
                <Detail icon={Clock} label="Experience">
                  {data.yearsExperience} years teaching
                </Detail>
              )}

              <Detail icon={Target} label="The course">
                <ul className="space-y-1">
                  <li>
                    {price != null ? `${money(price)} for the 18-hour course` : "Price on request"}
                    {included ? ` — ${included}` : ""}
                  </li>
                  {data.classFormat && FORMAT_LABEL[data.classFormat] && (
                    <li>
                      {FORMAT_LABEL[data.classFormat]}
                      {data.typicalClassSize ? ` · usually about ${data.typicalClassSize} people` : ""}
                    </li>
                  )}
                  <li className="text-text-low">
                    16 classroom hours + 2 hours live fire, in person — that&apos;s what New York
                    requires.
                  </li>
                </ul>
              </Detail>

              <Detail icon={Package} label="What's included">
                <ul className="space-y-0.5">
                  <li>{data.rangeFeeIncluded ? "Range fee included" : "Range fee paid separately"}</li>
                  <li>{data.ammoIncluded ? "Ammunition included" : "Ammunition not included"}</li>
                  <li>{data.materialsIncluded ? "Course materials included" : "Materials not included"}</li>
                </ul>
              </Detail>

              <Detail icon={MapPin} label="Where you'd train">
                <ul className="space-y-1">
                  {classroom.map((l, i) => (
                    <li key={`fc${i}`}>
                      <span className="text-text-low">Classroom:</span> {l.label}
                      {l.address ? ` — ${l.address}` : ""}
                    </li>
                  ))}
                  {ranges.map((l, i) => (
                    <li key={`fr${i}`}>
                      <span className="text-text-low">Range:</span> {l.label}
                      {l.address ? ` — ${l.address}` : ""}
                    </li>
                  ))}
                  {data.providesRange === false && data.separateRangeNote && (
                    <li className="text-text-mid">{data.separateRangeNote}</li>
                  )}
                  {classroom.length === 0 && ranges.length === 0 && (
                    <li className="text-text-low">Locations shared once you connect.</li>
                  )}
                </ul>
              </Detail>

              {data.whatsToBring && (
                <Detail icon={Package} label="What to bring">
                  {data.whatsToBring}
                </Detail>
              )}

              {(data.schedulingNotes || data.responseTimeNote) && (
                <Detail icon={Clock} label="Scheduling">
                  {[data.schedulingNotes, data.responseTimeNote].filter(Boolean).join(" · ")}
                </Detail>
              )}

              {(data.languages ?? []).length > 0 && (
                <Detail icon={LanguagesIcon} label="Languages">
                  {(data.languages ?? []).join(", ")}
                </Detail>
              )}

              {data.offersIntroCall && (
                <div className="rounded-md border border-signal/30 bg-signal-dim p-3">
                  <div className="flex items-center gap-1.5 text-sm font-medium text-signal">
                    <Phone className="size-3.5" /> Free intro call
                  </div>
                  <p className="mt-1 text-xs text-text-mid">
                    {data.introCallNote ??
                      "Meet them before you commit to anything. The course itself is in person."}
                  </p>
                </div>
              )}

              {(data.websiteUrl || data.instagramHandle) && (
                <Detail icon={Globe} label="Find them">
                  <div className="flex flex-wrap gap-3">
                    {data.websiteUrl && (
                      <a href={data.websiteUrl} target="_blank" rel="noreferrer" className="text-signal underline">
                        Website
                      </a>
                    )}
                    {data.instagramHandle && (
                      <a
                        href={`https://instagram.com/${data.instagramHandle.replace(/^@/, "")}`}
                        target="_blank"
                        rel="noreferrer"
                        className="text-signal underline"
                      >
                        {data.instagramHandle}
                      </a>
                    )}
                  </div>
                </Detail>
              )}
            </div>

            {action && (
              <div className="border-t border-hairline px-4 py-3">
                <div className="flex justify-end">{action}</div>
              </div>
            )}
          </DialogContent>
        </Dialog>
      </CardContent>
    </Card>
  )
}

function Detail({
  icon: Icon,
  label,
  children,
}: {
  icon: React.ComponentType<{ className?: string }>
  label: string
  children: React.ReactNode
}) {
  return (
    <div>
      <div className="flex items-center gap-1.5 text-xs font-medium text-text-low">
        <Icon className="size-3.5" />
        {label}
      </div>
      <div className="mt-1 text-text-mid">{children}</div>
    </div>
  )
}
