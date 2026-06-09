import { NextResponse, type NextRequest } from "next/server"
import { runReminders } from "@/lib/reminders"
import { runRenewals } from "@/lib/renewals"

/**
 * Daily automation endpoint (Vercel Cron — see vercel.json). Runs reminder
 * nudges and the renewal engine. Protected by CRON_SECRET when set; in local dev
 * (no secret) it's open for manual testing.
 */
export async function GET(request: NextRequest) {
  const secret = process.env.CRON_SECRET
  if (secret) {
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
