import { NextResponse } from "next/server"
import { getPublicFees, getPublicPackages } from "@/lib/public-data"

/**
 * Public, cacheable pricing feed for independently deployed acquisition sites.
 * It exposes only the same package and government-fee data already rendered on
 * the public pricing page; no account, case, or applicant data is reachable.
 */
export async function GET() {
  const [packages, fees] = await Promise.all([getPublicPackages(), getPublicFees()])

  return NextResponse.json(
    { packages, fees },
    {
      headers: {
        "Cache-Control": "public, s-maxage=3600, stale-while-revalidate=86400",
        "Access-Control-Allow-Origin": "https://firearmlicensenyc.com",
      },
    }
  )
}
