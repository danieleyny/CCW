import { Star, MapPin, ShieldCheck } from "lucide-react"
import { money } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"

export interface InstructorCardData {
  name: string
  bio?: string | null
  dcjsId?: string | null
  priceCents?: number | null
  ratingAvg?: number | null
  ratingCount?: number | null
  distanceMi?: number | null
  note?: string | null
  quotedPriceCents?: number | null
  locations?: { label: string; isRange: boolean }[]
  nextAvailable?: string | null
}

function initials(name: string) {
  return name
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((p) => p[0]?.toUpperCase())
    .join("")
}

/**
 * Applicant-facing instructor card: everything they need to choose — name,
 * distance, price (their quote wins over their list price), rating, credential,
 * bio, locations, next availability. No PII is exposed the other direction.
 */
export function InstructorCard({
  data,
  action,
}: {
  data: InstructorCardData
  action?: React.ReactNode
}) {
  const price = data.quotedPriceCents ?? data.priceCents
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
              {data.dcjsId && (
                <span className="inline-flex items-center gap-1 text-xs text-ok">
                  <ShieldCheck className="size-3" /> DCJS-credentialed
                </span>
              )}
            </div>
            <div className="mt-1 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-mid">
              {data.distanceMi != null && (
                <span className="flex items-center gap-1">
                  <MapPin className="size-3" /> {Number(data.distanceMi).toFixed(1)} mi away
                </span>
              )}
              {price != null && <span>{money(price)} · 18-hr course</span>}
              {data.ratingCount ? (
                <span className="flex items-center gap-0.5">
                  <Star className="size-3 text-brass" /> {data.ratingAvg} ({data.ratingCount})
                </span>
              ) : null}
            </div>
            {data.bio && <p className="mt-2 line-clamp-3 text-sm text-text-mid">{data.bio}</p>}
            {data.note && (
              <p className="mt-2 rounded-md border border-hairline bg-surface-2/50 p-2 text-sm">
                <span className="text-text-low">Note: </span>
                {data.note}
              </p>
            )}
            {data.locations && data.locations.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1.5">
                {data.locations.map((l, i) => (
                  <span
                    key={i}
                    className="rounded bg-surface-2 px-2 py-0.5 text-xs text-text-mid"
                  >
                    {l.isRange ? "Range" : "Classroom"}: {l.label}
                  </span>
                ))}
              </div>
            )}
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
        {action && <div className="mt-3 flex justify-end">{action}</div>}
      </CardContent>
    </Card>
  )
}
