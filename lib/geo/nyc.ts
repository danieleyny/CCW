/**
 * Zero-cost, offline NYC geocoding. We never call a paid geo API or hit the
 * network on a search — instead we resolve a borough (and a handful of common
 * ZIPs) to a cached centroid once, at signup / offer creation, and let PostGIS
 * do radius matching from there. Good enough for "instructors within N miles".
 */

export interface LatLng {
  lat: number
  lng: number
}

export const BOROUGH_CENTROIDS: Record<string, LatLng> = {
  manhattan: { lat: 40.7831, lng: -73.9712 },
  brooklyn: { lat: 40.6782, lng: -73.9442 },
  queens: { lat: 40.7282, lng: -73.7949 },
  bronx: { lat: 40.8448, lng: -73.8648 },
  "staten island": { lat: 40.5795, lng: -74.1502 },
}

// A small ZIP → centroid table for common NYC ZIPs (extend as needed).
const ZIP_CENTROIDS: Record<string, LatLng> = {
  "10001": { lat: 40.7506, lng: -73.9971 }, // Manhattan / Chelsea
  "10027": { lat: 40.8115, lng: -73.9536 }, // Harlem
  "11201": { lat: 40.6939, lng: -73.9899 }, // Brooklyn Heights
  "11215": { lat: 40.6627, lng: -73.9866 }, // Park Slope
  "11101": { lat: 40.7505, lng: -73.94 }, // Long Island City
  "11375": { lat: 40.7211, lng: -73.8448 }, // Forest Hills
  "10451": { lat: 40.8205, lng: -73.9256 }, // South Bronx
  "10301": { lat: 40.6404, lng: -74.0876 }, // Staten Island
}

function normalizeBorough(b: string): string {
  return b.trim().toLowerCase().replace(/^the\s+/, "")
}

/** Resolve an NYC borough and/or ZIP to a cached centroid. */
export function geocodeNyc(input: { borough?: string | null; zip?: string | null }): LatLng | null {
  if (input.zip) {
    const z = input.zip.trim().slice(0, 5)
    if (ZIP_CENTROIDS[z]) return ZIP_CENTROIDS[z]
  }
  if (input.borough) {
    const c = BOROUGH_CENTROIDS[normalizeBorough(input.borough)]
    if (c) return c
  }
  return null
}

export const BOROUGHS = ["Manhattan", "Brooklyn", "Queens", "Bronx", "Staten Island"] as const

/** Best-effort reverse lookup: nearest borough centroid to a lat/lng. */
export function boroughFromLatLng(lat: number | null, lng: number | null): string | null {
  if (lat == null || lng == null) return null
  let best: { label: string; d: number } | null = null
  for (const label of BOROUGHS) {
    const c = BOROUGH_CENTROIDS[label.toLowerCase()]
    const d = milesBetween({ lat, lng }, c)
    if (!best || d < best.d) best = { label, d }
  }
  return best?.label ?? null
}

/** Straight-line distance in miles (haversine) — for display / sanity checks. */
export function milesBetween(a: LatLng, b: LatLng): number {
  const R = 3958.8
  const dLat = ((b.lat - a.lat) * Math.PI) / 180
  const dLng = ((b.lng - a.lng) * Math.PI) / 180
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2
  return R * 2 * Math.atan2(Math.sqrt(s), Math.sqrt(1 - s))
}
