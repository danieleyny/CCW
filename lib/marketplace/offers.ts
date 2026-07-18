/**
 * Marketplace offer creation + geo-matching (no `server-only` so scripts can use
 * it). A client broadcasts an offer; we geocode their area once and match to
 * VERIFIED, in-radius instructors via the PostGIS RPC — the same hard filter
 * that keeps unverified instructors invisible.
 *
 * Matching is TWO-sided so an offer is never stranded:
 *  - At CREATION we match the offer to every verified in-radius instructor. If
 *    the client hasn't set a borough yet (no geocode), we fall back to matching
 *    every verified instructor serving the jurisdiction — coarse, but visible.
 *  - When an instructor LOADS THEIR FEED we backfill any open offer they now
 *    qualify for (they verified after the offer was posted, or the offer had no
 *    precise geo). Without this, matching was frozen at creation time and a
 *    later-arriving instructor could never see an existing open request.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { geocodeNyc, milesBetween } from "@/lib/geo/nyc"
import { isLiveEligible } from "@/lib/instructors/profile"

type DB = SupabaseClient<Database>
type Jurisdiction = Database["public"]["Enums"]["jurisdiction_key"]
type OfferType = Database["public"]["Enums"]["offer_type"]

/** Everything isLiveEligible() reads, plus what auto-offer needs. */
const ELIGIBILITY_COLUMNS =
  "id, verified, active, bio, price_18h_cents, class_format, languages, provides_range, separate_range_note, " +
  "auto_offer_enabled, auto_offer_note, auto_offer_price_cents, profile_id, name"

type EligibilityRow = {
  id: string
  verified: boolean
  active: boolean
  bio: string | null
  price_18h_cents: number | null
  class_format: string | null
  languages: string[] | null
  provides_range: boolean | null
  separate_range_note: string | null
  auto_offer_enabled: boolean
  auto_offer_note: string | null
  auto_offer_price_cents: number | null
  profile_id: string | null
  name: string
}

/**
 * Verified ISN'T enough to be shown to an applicant — the profile also has to
 * say enough to choose from (lib/instructors/profile). This filters a candidate
 * list down to the ones who may actually appear, and returns their rows so the
 * caller can act on auto-offer settings without a second query.
 */
async function liveEligible(admin: DB, ids: string[]): Promise<EligibilityRow[]> {
  if (ids.length === 0) return []
  const { data } = await admin.from("instructors").select(ELIGIBILITY_COLUMNS).in("id", ids)
  const rows = (data ?? []) as unknown as EligibilityRow[]

  const withLocations = await Promise.all(
    rows.map(async (r) => {
      const { data: locs } = await admin
        .from("training_locations")
        .select("is_range, address")
        .eq("instructor_id", r.id)
      return { row: r, locations: locs ?? [] }
    })
  )

  return withLocations.filter(({ row, locations }) => isLiveEligible({ ...row, locations })).map((x) => x.row)
}

/**
 * AUTO-OFFER: instructors can opt into answering new in-area requests
 * automatically, with the note and price they set once. Without it, a request
 * posted at 9pm sits unanswered until somebody happens to open the app — which
 * is the applicant's experience of "nobody wants to teach me".
 *
 * It only ever expresses INTEREST. The applicant still chooses, and nothing here
 * creates an engagement or exposes their identity.
 */
async function applyAutoOffers(
  admin: DB,
  offerId: string,
  instructors: EligibilityRow[]
): Promise<number> {
  const auto = instructors.filter((i) => i.auto_offer_enabled)
  if (auto.length === 0) return 0

  let sent = 0
  for (const instructor of auto) {
    const { data: updated } = await admin
      .from("offer_matches")
      .update({
        responded: "interested",
        responded_at: new Date().toISOString(),
        note: instructor.auto_offer_note,
        quoted_price_cents: instructor.auto_offer_price_cents ?? instructor.price_18h_cents,
      })
      .eq("offer_id", offerId)
      .eq("instructor_id", instructor.id)
      // Never overwrite a human decision they already made on this request.
      .is("responded", null)
      .select("offer_id")
    if (updated?.length) sent++
  }
  return sent
}

export interface CreateOfferParams {
  caseId: string
  type: OfferType
  jurisdiction: Jurisdiction
  borough?: string | null
  zip?: string | null
  radiusMi?: number
  needsNote?: string | null
}

export async function createAndMatchOffer(
  admin: DB,
  params: CreateOfferParams
): Promise<{ offerId: string; matched: number; autoSent: number }> {
  const geo = geocodeNyc({ borough: params.borough, zip: params.zip })
  const radius = params.radiusMi ?? 25

  const { data: offer, error } = await admin
    .from("case_offers")
    .insert({
      case_id: params.caseId,
      type: params.type,
      jurisdiction: params.jurisdiction,
      area_label: params.borough ?? null,
      lat: geo?.lat ?? null,
      lng: geo?.lng ?? null,
      radius_mi: radius,
      needs_note: params.needsNote ?? null,
      status: "open",
    })
    .select("id")
    .single()
  if (error) throw error

  let rows: { offer_id: string; instructor_id: string; distance_mi: number | null }[] = []

  if (geo) {
    // Precise area → verified instructors within the requested radius.
    const { data: near } = await admin.rpc("instructors_within_radius", {
      p_lat: geo.lat,
      p_lng: geo.lng,
      p_radius_mi: radius,
      p_jurisdiction: params.jurisdiction,
    })
    const distanceById = new Map((near ?? []).map((r) => [r.id, Number(r.distance_mi)]))
    const eligible = await liveEligible(admin, [...distanceById.keys()])
    rows = eligible.map((r) => ({
      offer_id: offer.id,
      instructor_id: r.id,
      distance_mi: distanceById.get(r.id) ?? null,
    }))
  } else {
    // No borough set yet → don't strand the offer. Match every verified
    // instructor serving this jurisdiction (distance unknown until we have geo).
    const { data: all } = await admin
      .from("instructors")
      .select("id")
      .eq("verified", true)
      .contains("jurisdictions", [params.jurisdiction])
    const eligible = await liveEligible(admin, (all ?? []).map((r) => r.id))
    rows = eligible.map((r) => ({ offer_id: offer.id, instructor_id: r.id, distance_mi: null }))
  }

  let matched = 0
  if (rows.length) {
    // Ignore the rare duplicate (idempotent with the unique(offer_id,instructor_id)).
    const { error: matchErr } = await admin
      .from("offer_matches")
      .upsert(rows, { onConflict: "offer_id,instructor_id", ignoreDuplicates: true })
    if (matchErr) throw matchErr
    matched = rows.length
    // Offer stays 'open' (available to accept) until an instructor accepts it.
  }

  // Instructors who opted into auto-offering answer immediately, so a request
  // posted at midnight isn't met with silence.
  const autoSent = matched
    ? await applyAutoOffers(
        admin,
        offer.id,
        await liveEligible(admin, rows.map((r) => r.instructor_id))
      )
    : 0

  return { offerId: offer.id, matched, autoSent }
}

/**
 * Match a single verified instructor to every OPEN offer they now qualify for
 * that they aren't matched to yet. Run on instructor feed load so matching
 * reflects the present — not just who was online when each offer was posted.
 * Uses the service-role client (system-generated match rows, exactly as the
 * marketplace migration intends). No-op for unverified instructors.
 */
export async function backfillMatchesForInstructor(
  admin: DB,
  instructorId: string
): Promise<number> {
  const { data: instr } = await admin
    .from("instructors")
    .select("id, verified, lat, lng, jurisdictions")
    .eq("id", instructorId)
    .maybeSingle()
  if (!instr || !instr.verified) return 0
  // Verified but incomplete → not shown to applicants, so not backfilled either.
  const [eligible] = await liveEligible(admin, [instructorId])
  if (!eligible) return 0

  const juris = new Set((instr.jurisdictions ?? []) as Jurisdiction[])
  if (juris.size === 0) return 0

  const { data: offers } = await admin
    .from("case_offers")
    .select("id, jurisdiction, lat, lng, radius_mi, expires_at")
    .eq("status", "open")
  const now = Date.now()

  const qualifying = (offers ?? []).filter((o) => {
    if (!juris.has(o.jurisdiction)) return false
    if (o.expires_at && new Date(o.expires_at).getTime() <= now) return false
    // Offer has no precise geo (client hasn't set a borough) → jurisdiction-wide.
    if (o.lat == null || o.lng == null) return true
    // Both located → within the offer's requested radius.
    if (instr.lat == null || instr.lng == null) return false
    return (
      milesBetween({ lat: instr.lat, lng: instr.lng }, { lat: o.lat, lng: o.lng }) <=
      (o.radius_mi ?? 25)
    )
  })
  if (qualifying.length === 0) return 0

  const rows = qualifying.map((o) => ({
    offer_id: o.id,
    instructor_id: instructorId,
    distance_mi:
      o.lat != null && o.lng != null && instr.lat != null && instr.lng != null
        ? Number(milesBetween({ lat: instr.lat, lng: instr.lng }, { lat: o.lat, lng: o.lng }).toFixed(2))
        : null,
  }))

  // Insert only the missing ones; the unique constraint + ignoreDuplicates makes
  // this safe under concurrent feed loads.
  const { data: inserted, error } = await admin
    .from("offer_matches")
    .upsert(rows, { onConflict: "offer_id,instructor_id", ignoreDuplicates: true })
    .select("offer_id")
  if (error) throw error

  // Auto-offer applies to backfilled requests too — otherwise an instructor who
  // turned it on yesterday still has to answer today's older requests by hand.
  for (const row of inserted ?? []) {
    await applyAutoOffers(admin, row.offer_id, [eligible])
  }
  return inserted?.length ?? 0
}
