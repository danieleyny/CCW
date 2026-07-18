import { Star } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { money } from "@/lib/format"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { MarketplacePanel } from "@/components/portal/marketplace-panel"
import { LocationPrompt } from "@/components/portal/location-prompt"
import { InstructorCard } from "@/components/portal/instructor-card"
import { ChooseButton } from "@/components/portal/choose-instructor"
import { SlotBooker, type BookableSlot } from "@/components/portal/slot-booker"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { cancelOffer } from "./actions"
import { sendEngagementMessage } from "@/app/portal/actions"

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

  // Messages for the applicant↔instructor engagement thread(s). Cross-role
  // profile reads are RLS-blocked, so resolve sender names from what the client
  // already knows: their own name vs the chosen instructor's (public) name.
  const {
    data: { user: me },
  } = await supabase.auth.getUser()
  const engInstrName = new Map<string, string>()
  for (const e of engagements ?? []) {
    const inst = e.instructors as unknown as { name: string } | null
    engInstrName.set(e.id, inst?.name ?? "Instructor")
  }
  const engIds = (engagements ?? []).map((e) => e.id)
  const msgByEng = new Map<string, MessageRow[]>()
  if (engIds.length) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, body, created_at, engagement_id, sender_id")
      .in("engagement_id", engIds)
      .order("created_at")
    for (const m of msgs ?? []) {
      const engId = m.engagement_id as string
      const mine = m.sender_id === me?.id
      const arr = msgByEng.get(engId) ?? []
      arr.push({
        id: m.id,
        body: m.body,
        created_at: m.created_at,
        senderName: mine ? myCase.client.full_name : engInstrName.get(engId) ?? "Instructor",
        senderRole: mine ? "client" : "instructor",
      })
      msgByEng.set(engId, arr)
    }
  }

  // Instructors who expressed interest in my open offers (redacted view scoped
  // to my case). Enrich with each instructor's locations + next opening.
  const { data: interestedRows } = await supabase
    .from("applicant_interest_feed")
    .select(
      "offer_id, type, instructor_id, distance_mi, note, quoted_price_cents, name, bio, dcjs_id, verified, price_18h_cents, rating_avg, rating_count, service_radius_mi, years_experience, background, languages, website_url, instagram_handle, class_format, typical_class_size, provides_range, separate_range_note, range_fee_included, ammo_included, materials_included, whats_to_bring, scheduling_notes, response_time_note, offers_intro_call, intro_call_note"
    )
  const interested = interestedRows ?? []
  const interestedIds = [...new Set(interested.map((r) => r.instructor_id).filter(Boolean) as string[])]

  const locByInstr = new Map<string, { label: string; isRange: boolean; address: string | null }[]>()
  const nextByInstr = new Map<string, string>()
  if (interestedIds.length) {
    const { data: locs } = await supabase
      .from("training_locations")
      .select("instructor_id, label, is_range, address")
      .in("instructor_id", interestedIds)
    for (const l of locs ?? []) {
      const arr = locByInstr.get(l.instructor_id) ?? []
      arr.push({ label: l.label, isRange: l.is_range, address: l.address })
      locByInstr.set(l.instructor_id, arr)
    }
    const { data: slots } = await supabase
      .from("availability_slots")
      .select("instructor_id, starts_at, capacity, booked_count")
      .in("instructor_id", interestedIds)
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
    for (const s of slots ?? []) {
      if (s.booked_count < s.capacity && !nextByInstr.has(s.instructor_id)) {
        nextByInstr.set(s.instructor_id, s.starts_at)
      }
    }
  }

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
          Tell verified local instructors what you need. They see only your borough
          and the request — never your identity. Interested instructors show up
          here, and you choose who to work with.
        </p>
      </div>

      <LocationPrompt zip={myCase.client.zip} borough={myCase.client.borough} />

      <MarketplacePanel hasOpenOffer={hasOpenOffer} />

      {interested.length > 0 && (
        <div>
          <h2 className="engraved mb-1 text-text-low">Instructors interested in you</h2>
          <p className="mb-3 text-sm text-text-mid">
            {interested.length} verified instructor{interested.length === 1 ? " wants" : "s want"} to
            help. Pick one — the rest are released.
          </p>
          <div className="space-y-3">
            {interested.map((r) => (
              <InstructorCard
                key={`${r.offer_id}-${r.instructor_id}`}
                data={{
                  name: r.name ?? "Instructor",
                  bio: r.bio,
                  // Badge on VERIFIED, not on "typed a DCJS number".
                  verified: r.verified,
                  priceCents: r.price_18h_cents,
                  quotedPriceCents: r.quoted_price_cents,
                  ratingAvg: r.rating_avg,
                  ratingCount: r.rating_count,
                  distanceMi: r.distance_mi,
                  serviceRadiusMi: r.service_radius_mi,
                  note: r.note,
                  locations: locByInstr.get(r.instructor_id ?? "") ?? [],
                  nextAvailable: nextByInstr.get(r.instructor_id ?? "") ?? null,
                  yearsExperience: r.years_experience,
                  background: r.background,
                  languages: r.languages,
                  websiteUrl: r.website_url,
                  instagramHandle: r.instagram_handle,
                  classFormat: r.class_format,
                  typicalClassSize: r.typical_class_size,
                  providesRange: r.provides_range,
                  separateRangeNote: r.separate_range_note,
                  rangeFeeIncluded: r.range_fee_included,
                  ammoIncluded: r.ammo_included,
                  materialsIncluded: r.materials_included,
                  whatsToBring: r.whats_to_bring,
                  schedulingNotes: r.scheduling_notes,
                  responseTimeNote: r.response_time_note,
                  offersIntroCall: r.offers_intro_call,
                  introCallNote: r.intro_call_note,
                }}
                action={
                  <ChooseButton
                    offerId={r.offer_id ?? ""}
                    instructorId={r.instructor_id ?? ""}
                    instructorName={r.name ?? "Instructor"}
                  />
                }
              />
            ))}
          </div>
        </div>
      )}

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
                <CardContent className="p-4">
                  <div className="flex items-center justify-between gap-3">
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
                  </div>
                  <div className="mt-4 border-t border-hairline pt-4">
                    <div className="engraved mb-2 text-text-low">Message your instructor</div>
                    <MessageThread
                      caseId={e.id}
                      messages={msgByEng.get(e.id) ?? []}
                      send={sendEngagementMessage}
                      placeholder={`Message ${inst?.name ?? "your instructor"}…`}
                    />
                  </div>
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
