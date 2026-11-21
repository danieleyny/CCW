import { redirect } from "next/navigation"
import { CalendarDays, EyeOff, ShieldCheck } from "lucide-react"
import { cancelOffer } from "./actions"
import { sendEngagementMessage, markEngagementMessagesRead } from "@/app/portal/actions"
import { ChooseButton } from "@/components/portal/choose-instructor"
import { InstructorCard, type InstructorCardData } from "@/components/portal/instructor-card"
import { LocationPrompt } from "@/components/portal/location-prompt"
import { deriveMarketplaceStep } from "@/components/portal/marketplace-journey"
import {
  MarketplaceCompare,
  MarketplaceHubTabs,
  MarketplacePanel,
  MarketplaceStepBar,
  type CompareInstructor,
} from "@/components/portal/marketplace-panel"
import { SlotBooker, type BookableSlot } from "@/components/portal/slot-booker"
import { MessageThread, type MessageRow } from "@/components/shared/message-thread"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import {
  APPLICATION_TYPE_LABELS,
  isApplicationType,
  isPremiseResidence,
  type ApplicationType,
} from "@/lib/application-types"
import { formatDateTime, formatTime, formatWeekdayDate } from "@/lib/format"
import { getLocale, getMessages } from "@/lib/i18n"
import { interpolate } from "@/lib/i18n/interpolate"
import type { Messages } from "@/lib/i18n/messages"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"

export const metadata = { title: "Find an instructor" }

export default async function MarketplacePage() {
  const [myCase, messages, locale] = await Promise.all([getMyCase(), getMessages(), getLocale()])
  const copy = messages.marketplace
  if (!myCase) {
    return <p className="marketplace-v2-inline-error">{copy.errorTitle}</p>
  }
  if (isPremiseResidence(myCase.application_type as ApplicationType | null)) redirect("/portal")

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

  const openOffer = (offers ?? []).find((offer) => offer.status === "open") ?? null
  const hasOpenOffer = Boolean(openOffer)

  const { data: { user: me } } = await supabase.auth.getUser()
  const engInstrName = new Map<string, string>()
  for (const engagement of engagements ?? []) {
    const instructor = engagement.instructors as unknown as { name: string } | null
    engInstrName.set(engagement.id, instructor?.name ?? "Instructor")
  }
  const engIds = (engagements ?? []).map((engagement) => engagement.id)
  const msgByEng = new Map<string, MessageRow[]>()
  if (engIds.length) {
    const { data: msgs } = await supabase
      .from("messages")
      .select("id, body, created_at, engagement_id, sender_id")
      .in("engagement_id", engIds)
      .order("created_at")
    for (const message of msgs ?? []) {
      const engagementId = message.engagement_id as string
      const mine = message.sender_id === me?.id
      const rows = msgByEng.get(engagementId) ?? []
      rows.push({
        id: message.id,
        body: message.body,
        created_at: message.created_at,
        senderName: mine ? myCase.client.full_name : engInstrName.get(engagementId) ?? "Instructor",
        senderRole: mine ? "client" : "instructor",
      })
      msgByEng.set(engagementId, rows)
    }
  }

  const { data: interestedRows } = await supabase
    .from("applicant_interest_feed")
    .select(
      "offer_id, type, instructor_id, distance_mi, note, quoted_price_cents, name, bio, dcjs_id, verified, price_18h_cents, rating_avg, rating_count, service_radius_mi, years_experience, background, languages, website_url, instagram_handle, class_format, typical_class_size, provides_range, separate_range_note, range_fee_included, ammo_included, materials_included, whats_to_bring, scheduling_notes, response_time_note, offers_intro_call, intro_call_note"
    )
  const interested = [...(interestedRows ?? [])].sort((a, b) => {
    if (a.distance_mi == null) return 1
    if (b.distance_mi == null) return -1
    return Number(a.distance_mi) - Number(b.distance_mi)
  })
  const interestedIds = [...new Set(interested.map((row) => row.instructor_id).filter(Boolean) as string[])]

  const locByInstr = new Map<string, { label: string; isRange: boolean; address: string | null }[]>()
  const nextByInstr = new Map<string, string>()
  if (interestedIds.length) {
    const { data: locs } = await supabase
      .from("training_locations")
      .select("instructor_id, label, is_range, address")
      .in("instructor_id", interestedIds)
    for (const location of locs ?? []) {
      const rows = locByInstr.get(location.instructor_id) ?? []
      rows.push({ label: location.label, isRange: location.is_range, address: location.address })
      locByInstr.set(location.instructor_id, rows)
    }
    const { data: slots } = await supabase
      .from("availability_slots")
      .select("instructor_id, starts_at, capacity, booked_count")
      .in("instructor_id", interestedIds)
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
    for (const slot of slots ?? []) {
      if (slot.booked_count < slot.capacity && !nextByInstr.has(slot.instructor_id)) {
        nextByInstr.set(slot.instructor_id, slot.starts_at)
      }
    }
  }

  const { data: activeEng } = await supabase
    .from("engagements")
    .select("instructor_id")
    .eq("case_id", myCase.id)
    .eq("status", "active")
  const engInstructorIds = [...new Set((activeEng ?? []).map((engagement) => engagement.instructor_id))]

  let bookable: BookableSlot[] = []
  if (engInstructorIds.length) {
    const { data: slots } = await supabase
      .from("availability_slots")
      .select("id, type, starts_at, capacity, booked_count, instructor_id, location_id")
      .in("instructor_id", engInstructorIds)
      .gt("starts_at", new Date().toISOString())
      .order("starts_at", { ascending: true })
    const open = (slots ?? []).filter((slot) => slot.booked_count < slot.capacity)

    const instrName = new Map<string, string>()
    const { data: instrs } = await supabase.from("instructors").select("id, name").in("id", engInstructorIds)
    for (const instructor of instrs ?? []) instrName.set(instructor.id, instructor.name)

    const locIds = [...new Set(open.map((slot) => slot.location_id).filter(Boolean) as string[])]
    const locName = new Map<string, string>()
    if (locIds.length) {
      const { data: locs } = await supabase.from("training_locations").select("id, label").in("id", locIds)
      for (const location of locs ?? []) locName.set(location.id, location.label)
    }

    bookable = open.map((slot) => ({
      id: slot.id,
      type: slot.type,
      starts_at: slot.starts_at,
      instructorName: instrName.get(slot.instructor_id) ?? "Instructor",
      locationLabel: slot.location_id ? locName.get(slot.location_id) ?? null : null,
      dateLabel: formatWeekdayDate(slot.starts_at, locale),
      timeLabel: formatTime(slot.starts_at, locale),
    }))
  }

  const { data: bookings } = await supabase
    .from("bookings")
    .select("id, type, status, starts_at")
    .eq("case_id", myCase.id)
    .order("starts_at", { ascending: true })

  const activeBookings = (bookings ?? []).filter((booking) => booking.status !== "cancelled")
  const hasActiveEngagement = (engagements ?? []).length > 0
  const currentStep = deriveMarketplaceStep({
    hasActiveEngagement,
    hasBooking: activeBookings.length > 0,
    hasOpenOffer,
  })
  const booked = currentStep === 4 && activeBookings.length > 0
  const chosenName = hasActiveEngagement ? engInstrName.get((engagements ?? [])[0]?.id ?? "") ?? "Instructor" : null
  const applicationType = isApplicationType(myCase.application_type)
    ? APPLICATION_TYPE_LABELS[myCase.application_type]
    : "Concealed Carry"
  const area = myCase.client.borough ?? myCase.client.zip ?? applicationType

  const cards: CompareInstructor[] = interested.map((row) => {
    const instructorId = row.instructor_id ?? ""
    const next = nextByInstr.get(instructorId)
    const data: InstructorCardData = {
      name: row.name ?? "Instructor",
      bio: row.bio,
      verified: row.verified,
      priceCents: row.price_18h_cents,
      quotedPriceCents: row.quoted_price_cents,
      ratingAvg: row.rating_avg,
      ratingCount: row.rating_count,
      distanceMi: row.distance_mi,
      serviceRadiusMi: row.service_radius_mi,
      note: row.note,
      locations: locByInstr.get(instructorId) ?? [],
      nextAvailableLabel: next ? formatWeekdayDate(next, locale) : null,
      yearsExperience: row.years_experience,
      background: row.background,
      languages: row.languages,
      websiteUrl: row.website_url,
      instagramHandle: row.instagram_handle,
      classFormat: row.class_format,
      typicalClassSize: row.typical_class_size,
      providesRange: row.provides_range,
      separateRangeNote: row.separate_range_note,
      rangeFeeIncluded: row.range_fee_included,
      ammoIncluded: row.ammo_included,
      materialsIncluded: row.materials_included,
      whatsToBring: row.whats_to_bring,
      schedulingNotes: row.scheduling_notes,
      responseTimeNote: row.response_time_note,
      offersIntroCall: row.offers_intro_call,
      introCallNote: row.intro_call_note,
    }
    return { offerId: row.offer_id ?? "", instructorId, data }
  })

  const bookedLabel = activeBookings[0] ? formatDateTime(activeBookings[0].starts_at, locale) : null
  const hubItems = (engagements ?? []).map((engagement) => {
    const instructor = engagement.instructors as unknown as { name: string } | null
    const name = instructor?.name ?? "Instructor"
    const firstName = name.split(/\s+/)[0] || name
    const slots = bookable.filter((slot) => slot.instructorName === name)
    return {
      id: engagement.id,
      name,
      content: (
        <div className="marketplace-v2-hub-grid">
          <div className="marketplace-v2-hub-main">
            <section className="marketplace-v2-book-card" aria-labelledby={`book-${engagement.id}`}>
              <p className="portal-t-eyebrow">{copy.stepBook}</p>
              <h2 id={`book-${engagement.id}`}>{copy.bookTitle}</h2>
              <p>{interpolate(copy.bookBody, { name: firstName })}</p>
              <SlotBooker slots={slots} instructorName={name} />
            </section>
            <section className="marketplace-v2-sessions" aria-labelledby={`sessions-${engagement.id}`}>
              <h2 id={`sessions-${engagement.id}`}>{copy.sessionsTitle}</h2>
              {activeBookings.length ? (
                <ul>{activeBookings.map((booking) => (
                  <li key={booking.id}>
                    <span><CalendarDays aria-hidden="true" /><span><strong>{formatDateTime(booking.starts_at, locale)}</strong><small>{slotTypeLabel(booking.type, copy)}</small></span></span>
                    <StatusBadge status={booking.status} />
                  </li>
                ))}</ul>
              ) : <p>—</p>}
            </section>
          </div>
          <aside className="marketplace-v2-chat-card" id={`marketplace-chat-${engagement.id}`}>
            <header><span className="marketplace-v2-avatar" aria-hidden="true">{initials(name)}</span><div><h2>{interpolate(copy.instructorTitle, { name })}</h2><p><ShieldCheck aria-hidden="true" />{copy.verified}</p></div></header>
            <MessageThread
              caseId={engagement.id}
              messages={msgByEng.get(engagement.id) ?? []}
              send={sendEngagementMessage}
              markRead={markEngagementMessagesRead.bind(null, engagement.id)}
              placeholder={`${copy.messageName.replace("{name}", firstName)}…`}
            />
          </aside>
        </div>
      ),
    }
  })

  return (
    <div className="marketplace-v2-page">
      <header className="marketplace-v2-header">
        <p className="portal-t-eyebrow">{interpolate(copy.eyebrow, { applicationType })}</p>
        <h1>{chosenName ? interpolate(copy.titleWith, { name: chosenName }) : copy.titleFind}</h1>
        <p>{copy.subline}</p>
      </header>

      <MarketplaceStepBar current={currentStep} booked={booked} />

      {currentStep === 1 ? (
        <div className="marketplace-v2-step-one">
          <LocationPrompt zip={myCase.client.zip} borough={myCase.client.borough} />
          <MarketplacePanel hasOpenOffer={hasOpenOffer} hasLocation={Boolean(myCase.client.zip && myCase.client.borough)} />
        </div>
      ) : null}

      {currentStep === 2 ? (
        <div className="marketplace-v2-compare-layout">
          <main className="marketplace-v2-compare-main">
            {cards.length ? (
              <>
                <div className="marketplace-v2-compare-heading">
                  <div><h2>{interpolate(copy.interestedTitle, { count: cards.length, suffix: cards.length === 1 ? "" : "s" })}</h2><p>{copy.sortedDistance}</p></div>
                  <MarketplaceCompare instructors={cards} />
                </div>
                <div className="marketplace-v2-instructor-grid">
                  {cards.map((item) => (
                    <InstructorCard key={`${item.offerId}-${item.instructorId}`} data={item.data} action={<ChooseButton offerId={item.offerId} instructorId={item.instructorId} instructorName={item.data.name} />} />
                  ))}
                </div>
              </>
            ) : (
              <section className="marketplace-v2-no-interest"><span><ShieldCheck aria-hidden="true" /></span><div><h2>{copy.noInterestTitle}</h2><p>{copy.noInterestBody}</p></div></section>
            )}
          </main>
          <aside className="marketplace-v2-sidebar">
            {openOffer ? <section><p className="portal-t-label">{copy.requestCardTitle}</p><h2>{interpolate(copy.trainingNear, { area })}</h2><p>{interpolate(copy.sentOpenInterested, { date: formatWeekdayDate(openOffer.created_at, locale), count: cards.length })}</p><form action={cancelOffer}><input type="hidden" name="offerId" value={openOffer.id} /><Button type="submit" variant="outline">{copy.cancelRequest}</Button></form></section> : null}
            <LocationPrompt zip={myCase.client.zip} borough={myCase.client.borough} />
            <section className="marketplace-v2-privacy-card"><EyeOff aria-hidden="true" /><div><h2>{copy.privacyTitle}</h2><p>{copy.privacyBody}</p></div></section>
          </aside>
        </div>
      ) : null}

      {currentStep === 4 ? (
        <div className="marketplace-v2-hub">
          {bookedLabel ? <p className="marketplace-v2-booked-note"><ShieldCheck aria-hidden="true" />{interpolate(copy.bookedNote, { date: bookedLabel })}</p> : null}
          <MarketplaceHubTabs items={hubItems} />
        </div>
      ) : null}
    </div>
  )
}

function initials(name: string) {
  return name.split(/\s+/).filter(Boolean).slice(0, 2).map((part) => part[0]?.toUpperCase()).join("")
}

function slotTypeLabel(type: string, copy: Messages["marketplace"]) {
  if (type === "combined_18h") return copy.typeCombined
  if (type === "classroom_16h") return copy.typeClassroom
  if (type === "live_fire_2h") return copy.typeRange
  if (type === "consult") return copy.typeConsult
  return type
}
