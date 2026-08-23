import { NextResponse, type NextRequest } from "next/server"
import { timingSafeEqual } from "node:crypto"
import { createAdminClient } from "@/lib/supabase/admin"
import { runFormTemplateDriftCheck } from "@/lib/forms/drift"

/** Constant-time bearer-token comparison (SEC-24). */
function bearerMatches(header: string | null, secret: string): boolean {
  if (!header) return false
  const expected = `Bearer ${secret}`
  const a = Buffer.from(header)
  const b = Buffer.from(expected)
  return a.length === b.length && timingSafeEqual(a, b)
}

/**
 * Weekly template freshness check (Vercel Cron). Re-fetches each official form and
 * flags any that no longer match the file we hold — a matched=false row in
 * form_template_checks. Fails CLOSED without CRON_SECRET, like the reminders cron.
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

  try {
    const result = await runFormTemplateDriftCheck(createAdminClient())
    return NextResponse.json({ ok: true, ...result })
  } catch (e) {
    return NextResponse.json({ error: e instanceof Error ? e.message : "failed" }, { status: 500 })
  }
}
