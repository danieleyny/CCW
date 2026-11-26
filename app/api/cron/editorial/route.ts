import { timingSafeEqual } from "node:crypto"
import { NextResponse, type NextRequest } from "next/server"
import { runEditorialAutomation } from "@/lib/blog/automation"

export const maxDuration = 300

function bearerMatches(header: string | null, secret: string) {
  if (!header) return false
  const actual = Buffer.from(header)
  const expected = Buffer.from(`Bearer ${secret}`)
  return actual.length === expected.length && timingSafeEqual(actual, expected)
}

/**
 * Twice-weekly supervised research and drafting. This endpoint can only create
 * private drafts; the existing human fact/legal review gate controls publishing.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 })
    }
  } else if (!bearerMatches(request.headers.get("authorization"), secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  }

  const result = await runEditorialAutomation({ trigger: "scheduled" })
  const status = result.status === "failed" ? 500 : result.status === "already_running" ? 409 : 200
  return NextResponse.json({ ok: result.status === "completed" || result.status === "skipped", ...result }, { status })
}
