import { NextResponse } from "next/server"
import { getNextTrainingClass } from "@/lib/training/server"

// The current class, seat count, and checkout gate are runtime data.
export const dynamic = "force-dynamic"

export const revalidate = 60

export async function GET() {
  const next = await getNextTrainingClass()
  return NextResponse.json({ class: next }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=60" } })
}
