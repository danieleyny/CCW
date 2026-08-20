import { createHmac, timingSafeEqual } from "node:crypto"
import { NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"

/**
 * CONCIERGE Phase 2 — Calendly booking webhook. Wired now, INERT until
 * CALENDLY_WEBHOOK_SIGNING_KEY is set (owner action). It records a concierge
 * intro-call booking onto intro_calls, mapping back to the case via the
 * utm_content we pass into the embed URL (= case_id).
 *
 * Fails closed: no signing key → 200 no-op (never processes an unverified body);
 * bad signature → 401. Runs under the service-role client (the caller is
 * Calendly, not an authenticated user), scoped to a single intro_calls upsert.
 */
export const runtime = "nodejs"

function verify(signingKey: string, header: string | null, rawBody: string): boolean {
  if (!header) return false
  // Header form: "t=<unix>,v1=<hex>"
  const parts = Object.fromEntries(
    header.split(",").map((kv) => {
      const [k, v] = kv.split("=")
      return [k?.trim(), v?.trim()]
    })
  ) as { t?: string; v1?: string }
  if (!parts.t || !parts.v1) return false
  const expected = createHmac("sha256", signingKey).update(`${parts.t}.${rawBody}`).digest("hex")
  try {
    const a = Buffer.from(expected)
    const b = Buffer.from(parts.v1)
    return a.length === b.length && timingSafeEqual(a, b)
  } catch {
    return false
  }
}

export async function POST(req: Request) {
  const signingKey = process.env.CALENDLY_WEBHOOK_SIGNING_KEY
  // Inert until configured — accept and ignore so Calendly test pings don't error.
  if (!signingKey) return NextResponse.json({ ok: true, inert: true })

  const raw = await req.text()
  if (!verify(signingKey, req.headers.get("calendly-webhook-signature"), raw)) {
    return NextResponse.json({ error: "bad signature" }, { status: 401 })
  }

  let body: {
    event?: string
    payload?: {
      uri?: string
      tracking?: { utm_content?: string }
      scheduled_event?: { uri?: string; start_time?: string; location?: { join_url?: string } }
    }
  }
  try {
    body = JSON.parse(raw)
  } catch {
    return NextResponse.json({ error: "bad json" }, { status: 400 })
  }

  const p = body.payload ?? {}
  // QA Phase 9 — utm_content is an OPAQUE per-case token, not the internal id.
  // Validate its shape and confirm the case exists; otherwise 200 + a skipped
  // reason, so a malformed/unknown token never 500s into Calendly's retry loop.
  const token = p.tracking?.utm_content
  if (!token || !UUID_RE.test(token)) {
    return NextResponse.json({ ok: true, skipped: "no or malformed case token" })
  }

  const admin = createAdminClient()
  const { data: kase } = await admin.from("cases").select("id").eq("calendly_token", token).maybeSingle()
  if (!kase) return NextResponse.json({ ok: true, skipped: "case not found" })

  const canceled = body.event === "invitee.canceled"
  const { error } = await admin.from("intro_calls").upsert(
    {
      case_id: kase.id,
      provider: "calendly",
      status: canceled ? "canceled" : "booked",
      scheduled_at: canceled ? null : (p.scheduled_event?.start_time ?? null),
      join_url: canceled ? null : (p.scheduled_event?.location?.join_url ?? null),
      external_event_id: p.scheduled_event?.uri ?? p.uri ?? null,
    },
    { onConflict: "case_id" }
  )
  if (error) {
    console.error("[calendly] intro_calls upsert failed:", error.message)
    return NextResponse.json({ error: "record failed" }, { status: 500 })
  }

  return NextResponse.json({ ok: true })
}

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
