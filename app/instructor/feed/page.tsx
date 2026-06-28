import { MapPin, Clock, ShieldCheck } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyInstructor } from "@/lib/instructor"
import { stageMeta, type CaseStageKey } from "@/config/stages"
import { Button } from "@/components/ui/button"
import { acceptOffer, declineOffer } from "./actions"

export const metadata = { title: "Case feed" }

export default async function InstructorFeedPage() {
  const me = await getMyInstructor()
  const supabase = await createClient()
  const { data: feed } = await supabase
    .from("instructor_offer_feed")
    .select("offer_id, type, jurisdiction, area_label, distance_mi, stage, needs_note, created_at")
    .order("created_at", { ascending: false })

  const offers = feed ?? []

  return (
    <div className="space-y-5">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Case feed</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Local applicants who need help. You see the area and the need — never a
          name or address — until you accept.
        </p>
      </div>

      {!me?.verified && (
        <div className="flex items-center gap-2 rounded-md border border-warn/30 bg-warn/10 px-4 py-3 text-sm text-warn">
          <ShieldCheck className="size-4" /> You&apos;ll see and accept cases once an admin verifies you.
        </div>
      )}

      {offers.length === 0 ? (
        <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
          No matching cases right now. We&apos;ll match you as local applicants request help.
        </p>
      ) : (
        <ul className="space-y-3">
          {offers.map((o) => (
            <li key={o.offer_id} className="rounded-lg border bg-card p-4">
              <div className="flex items-start justify-between gap-3">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="rounded bg-surface-2 px-2 py-0.5 text-xs font-medium text-text-mid">
                      {o.type === "full_assist" ? "Full application help" : "18-hour training"}
                    </span>
                    <span className="text-xs uppercase tracking-wide text-text-low">{o.jurisdiction}</span>
                  </div>
                  <div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-1 text-xs text-text-mid">
                    <span className="flex items-center gap-1">
                      <MapPin className="size-3" /> {o.area_label ?? "NYC"}
                      {o.distance_mi != null && <span>· {Number(o.distance_mi).toFixed(1)} mi</span>}
                    </span>
                    {o.stage && (
                      <span className="flex items-center gap-1">
                        <Clock className="size-3" /> {stageMeta(o.stage as CaseStageKey).label}
                      </span>
                    )}
                  </div>
                  {o.needs_note && <p className="mt-2 text-sm">{o.needs_note}</p>}
                </div>
              </div>
              <div className="mt-3 flex items-center gap-2">
                <form action={acceptOffer}>
                  <input type="hidden" name="offerId" value={o.offer_id ?? ""} />
                  <Button type="submit" size="sm" disabled={!me?.verified}>Accept</Button>
                </form>
                <form action={declineOffer}>
                  <input type="hidden" name="offerId" value={o.offer_id ?? ""} />
                  <Button type="submit" size="sm" variant="ghost">Decline</Button>
                </form>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  )
}
