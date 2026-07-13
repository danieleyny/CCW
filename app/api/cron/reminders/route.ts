import { NextResponse, type NextRequest } from "next/server"
import { runReminders } from "@/lib/reminders"
import { runRenewals } from "@/lib/renewals"

/**
 * Daily automation endpoint (Vercel Cron — see vercel.json). Runs reminder
 * nudges and the renewal engine.
 *
 * V3-P0.5 — fails CLOSED: a deployment without CRON_SECRET refuses to run
 * (previously it was wide open). Local dev (NODE_ENV=development) stays open
 * for manual testing only.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (!secret) {
    if (process.env.NODE_ENV !== "development") {
      return NextResponse.json({ error: "CRON_SECRET is not configured" }, { status: 503 })
    }
  } else {
    const auth = request.headers.get("authorization")
    if (auth !== `Bearer ${secret}`) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }
  }

  try {
    const [reminders, renewals] = await Promise.all([runReminders(), runRenewals()])
    return NextResponse.json({ ok: true, reminders, renewals })
  } catch (err) {
    console.error("[cron] failed:", err)
    return NextResponse.json({ ok: false, error: "Cron failed" }, { status: 500 })
  }
}
