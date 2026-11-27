import { NextResponse } from "next/server"
import { GOOGLE_REVIEW_URL } from "@/lib/reviews"

/** A stable, branded URL staff can share even if Google's destination changes. */
export function GET() {
  return NextResponse.redirect(GOOGLE_REVIEW_URL, 307)
}
