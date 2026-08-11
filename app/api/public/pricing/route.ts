import { NextResponse } from "next/server"
import { getPublicFees, getPublicPackages } from "@/lib/public-data"

/**
 * Public, cacheable pricing feed for the independently deployed acquisition
 * sites (firearmlicensenyc.com, nycgunlaws.com).
 *
 * It exposes only the same package and government-fee data already rendered on
 * this site's public pricing page; no account, case, or applicant data is
 * reachable. This endpoint is the ONLY coupling between the satellites and this
 * application — it exists so those deployments never need a Supabase service
 * role key, which would otherwise have to be replicated across every satellite
 * to read a public price list.
 *
 * The satellites fetch this SERVER-SIDE, so the CORS header below is not what
 * authorizes them — it is here only so a browser-side fetch from a satellite
 * origin would also work. Keep the allowlist in sync as satellites are added.
 */
const ALLOWED_ORIGINS = new Set([
  "https://firearmlicensenyc.com",
  "https://www.firearmlicensenyc.com",
  "https://nycgunlaws.com",
  "https://www.nycgunlaws.com",
])

export async function GET(request: Request) {
  const [packages, fees] = await Promise.all([getPublicPackages(), getPublicFees()])

  const origin = request.headers.get("origin")
  const headers: Record<string, string> = {
    "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
  }
  if (origin && ALLOWED_ORIGINS.has(origin)) {
    headers["Access-Control-Allow-Origin"] = origin
    headers["Vary"] = "Origin"
  }

  return NextResponse.json({ packages, fees }, { headers })
}
