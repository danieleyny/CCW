/**
 * Marketplace offer creation + geo-matching (no `server-only` so scripts can use
 * it). A client broadcasts an offer; we geocode their area once and match to
 * VERIFIED, in-radius instructors via the PostGIS RPC — the same hard filter
 * that keeps unverified instructors invisible.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { geocodeNyc } from "@/lib/geo/nyc"

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

  let matched = 0
  if (geo) {
    const { data: near } = await admin.rpc("instructors_within_radius", {
      p_lat: geo.lat,
      p_lng: geo.lng,
      p_radius_mi: radius,
      p_jurisdiction: params.jurisdiction,
    })
    const rows = (near ?? []).map((r) => ({
      offer_id: offer.id,
      instructor_id: r.id,
      distance_mi: Number(r.distance_mi),
    }))
    if (rows.length) {
      const { error: matchErr } = await admin.from("offer_matches").insert(rows)
      if (matchErr) throw matchErr
      matched = rows.length
      // Offer stays 'open' (available to accept) until an instructor accepts it.
    }
  }
  return { offerId: offer.id, matched }
}
