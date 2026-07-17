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

type DB = SupabaseClient<Database>
type Jurisdiction = Database["public"]["Enums"]["jurisdiction_key"]
type OfferType = Database["public"]["Enums"]["offer_type"]

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
): Promise<{ offerId: string; matched: number }> {
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
    rows = (near ?? []).map((r) => ({
      offer_id: offer.id,
      instructor_id: r.id,
      distance_mi: Number(r.distance_mi),
    }))
  } else {
    // No borough set yet → don't strand the offer. Match every verified
    // instructor serving this jurisdiction (distance unknown until we have geo).
    const { data: all } = await admin
      .from("instructors")
      .select("id")
      .eq("verified", true)
      .contains("jurisdictions", [params.jurisdiction])
    rows = (all ?? []).map((r) => ({ offer_id: offer.id, instructor_id: r.id, distance_mi: null }))
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
  return { offerId: offer.id, matched }
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
  return inserted?.length ?? 0
}
