import { NextResponse, type NextRequest } from "next/server"
import { runReminders } from "@/lib/reminders"
import { runRenewals } from "@/lib/renewals"
import { runRetention } from "@/lib/retention"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * Daily automation endpoint (Vercel Cron — see vercel.json). Runs reminder
 * nudges, the renewal engine, and the retention sweep.
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

    // Retention runs in its own catch, not inside the Promise.all: a failure in
    // a sweep that is OFF by default must never take the reminder run — the
    // thing that actually nudges applicants — down with it.
    let retention: Awaited<ReturnType<typeof runRetention>> | { error: string }
    try {
      retention = await runRetention(createAdminClient())
    } catch (err) {
      console.error("[cron] retention failed:", err)
      retention = { error: "retention failed" }
    }

    return NextResponse.json({ ok: true, reminders, renewals, retention })
  } catch (err) {
    console.error("[cron] failed:", err)
    return NextResponse.json({ ok: false, error: "Cron failed" }, { status: 500 })
  }
}
