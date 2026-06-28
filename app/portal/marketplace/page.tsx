import { Star } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { money } from "@/lib/format"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MarketplacePanel } from "@/components/portal/marketplace-panel"
import { SlotBooker, type BookableSlot } from "@/components/portal/slot-booker"
import { cancelOffer } from "./actions"

export const metadata = { title: "Find an instructor" }

export default async function MarketplacePage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const supabase = await createClient()
  const [{ data: offers }, { data: engagements }] = await Promise.all([
    supabase
      .from("case_offers")
      .select("id, type, status, created_at")
      .eq("case_id", myCase.id)
      .order("created_at", { ascending: false }),
    supabase
      .from("engagements")
      .select("id, type, status, instructors(name, price_18h_cents, rating_avg, rating_count)")
      .eq("case_id", myCase.id)
      .eq("status", "active"),
  ])

  const hasOpenOffer = (offers ?? []).some((o) => o.status === "open")

  // Bookable slots from instructors the client is engaged with (flat selects +
  // lookups to avoid supabase-js embedded-select type friction).
  const { data: activeEng } = await supabase
    .from("engagements")
    .select("instructor_id")
    .eq("case_id", myCase.id)
    .eq("status", "active")
  const engInstructorIds = [...new Set((activeEng ?? []).map((e) => e.instructor_id))]

  let bookable: BookableSlot[] = []
  if (engInstructorIds.length) {
    const { data: slots } = await supabase
      .from("availability_slots")
      .select("id, type, starts_at, capacity, booked_count, instructor_id, location_id")
      .in("instructor_id", engInstructorIds)
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
    const open = (slots ?? []).filter((s) => s.booked_count < s.capacity)

    const instrName = new Map<string, string>()
    const { data: instrs } = await supabase.from("instructors").select("id, name").in("id", engInstructorIds)
    for (const i of instrs ?? []) instrName.set(i.id, i.name)

    const locIds = [...new Set(open.map((s) => s.location_id).filter(Boolean) as string[])]
    const locName = new Map<string, string>()
    if (locIds.length) {
      const { data: locs } = await supabase.from("training_locations").select("id, label").in("id", locIds)
      for (const l of locs ?? []) locName.set(l.id, l.label)
    }

    bookable = open.map((s) => ({
      id: s.id,
      type: s.type,
      starts_at: s.starts_at,
      instructorName: instrName.get(s.instructor_id) ?? "Instructor",
      locationLabel: s.location_id ? locName.get(s.location_id) ?? null : null,
    }))
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, type, status, starts_at")
    .eq("case_id", myCase.id)
    .order("starts_at", { ascending: true })

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Find an instructor</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Broadcast to verified instructors in your area. They see only your
          borough and what you need — never your identity — until you&apos;re matched.
        </p>
      </div>

      <MarketplacePanel hasOpenOffer={hasOpenOffer} />

      {(engagements ?? []).length > 0 && (
        <div>
          <h2 className="engraved mb-2 text-text-low">Your instructor</h2>
          {(engagements ?? []).map((e) => {
            const inst = e.instructors as unknown as {
              name: string
              price_18h_cents: number | null
              rating_avg: number | null
              rating_count: number
            } | null
            return (
              <Card key={e.id}>
                <CardContent className="flex items-center justify-between gap-3 p-4">
                  <div>
                    <div className="text-sm font-medium">{inst?.name ?? "Instructor"}</div>
                    <div className="mt-0.5 flex items-center gap-2 text-xs text-text-mid">
                      <span>{e.type === "full_assist" ? "Full application help" : "Training"}</span>
                      {inst?.price_18h_cents != null && <span>· {money(inst.price_18h_cents)}</span>}
                      {inst?.rating_count ? (
                        <span className="flex items-center gap-0.5">
                          <Star className="size-3 text-brass" />
                          {inst.rating_avg}
                        </span>
                      ) : null}
                    </div>
                  </div>
                  <StatusBadge status="active" />
                </CardContent>
              </Card>
            )
          })}
        </div>
      )}

      {engInstructorIds.length > 0 && (
        <div>
          <h2 className="engraved mb-2 text-text-low">Book a session</h2>
          <SlotBooker slots={bookable} />
        </div>
      )}

      {(bookings ?? []).length > 0 && (
        <div>
          <h2 className="engraved mb-2 text-text-low">Your sessions</h2>
          <ul className="space-y-2">
            {(bookings ?? []).map((bk) => (
              <li key={bk.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm">
                <span>{new Date(bk.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
                <StatusBadge status={bk.status} />
              </li>
            ))}
          </ul>
        </div>
      )}

      {(offers ?? []).length > 0 && (
        <div>
          <h2 className="engraved mb-2 text-text-low">Your requests</h2>
          <ul className="space-y-2">
            {(offers ?? []).map((o) => (
              <li key={o.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm">
                <span>{o.type === "full_assist" ? "Full application help" : "Training"}</span>
                <div className="flex items-center gap-2">
                  <StatusBadge status={o.status} />
                  {o.status === "open" && (
                    <form action={cancelOffer}>
                      <input type="hidden" name="offerId" value={o.id} />
                      <Button type="submit" size="sm" variant="ghost">
                        Cancel
                      </Button>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  )
}
