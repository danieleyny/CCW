import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import type { Json } from "@/lib/supabase/types"
import { sendEmail } from "@/lib/email"
import { rateLimit, clientIpFrom } from "@/lib/rate-limit"
import { brand } from "@/config/brand"
import {
  SUBSCRIBE_OFFERS,
  allowedOrigins,
  unsubToken,
  offerSubject,
  offerEmail,
} from "@/lib/subscribe"

export const runtime = "nodejs"

const schema = z.object({
  email: z.string().email("Enter a valid email"),
  offer: z.enum(SUBSCRIBE_OFFERS),
  from: z.string().min(1).max(120).default("unknown"),
  payload: z.record(z.string(), z.unknown()).optional(),
  jurisdiction: z.enum(["ny", "nj"]).optional(),
  company: z.string().optional(), // honeypot
})

function cors(origin: string | null): Record<string, string> {
  const h: Record<string, string> = { Vary: "Origin" }
  if (origin && allowedOrigins().includes(origin)) {
    h["Access-Control-Allow-Origin"] = origin // reflect only allowlisted; never "*"
    h["Access-Control-Allow-Methods"] = "POST, OPTIONS"
    h["Access-Control-Allow-Headers"] = "Content-Type"
    h["Access-Control-Max-Age"] = "86400"
  }
  return h
}

export function OPTIONS(req: NextRequest) {
  const origin = req.headers.get("origin")
  const ok = !!origin && allowedOrigins().includes(origin)
  return new NextResponse(null, { status: ok ? 204 : 403, headers: cors(origin) })
}

export async function POST(req: NextRequest) {
  const origin = req.headers.get("origin")
  const headers = cors(origin)

  // A cross-origin browser request from an unlisted origin is refused.
  if (origin && !allowedOrigins().includes(origin)) {
    return NextResponse.json({ ok: false, error: "origin not allowed" }, { status: 403, headers })
  }

  let body: unknown
  try {
    body = await req.json()
  } catch {
    return NextResponse.json({ ok: false, error: "bad request" }, { status: 400, headers })
  }

  const parsed = schema.safeParse(body)
  if (!parsed.success) {
    return NextResponse.json(
      { ok: false, error: parsed.error.issues[0]?.message ?? "invalid input" },
      { status: 400, headers }
    )
  }
  const v = parsed.data

  // Honeypot: pretend success, write nothing (same as captureLead).
  if ((v.company ?? "").trim() !== "") return NextResponse.json({ ok: true }, { headers })

  // Per-IP brake on this unauthenticated write endpoint.
  const ip = clientIpFrom(req.headers)
  if (!rateLimit(`subscribe:${ip}`, 5)) {
    return NextResponse.json({ ok: false, error: "Too many requests — try again shortly." }, { status: 429, headers })
  }

  const admin = createAdminClient()
  // Upsert on (email, offer): a repeat submit is idempotent, not a duplicate.
  const { data, error } = await admin
    .from("subscribers")
    .upsert(
      { email: v.email, offer: v.offer, source: v.from, payload: (v.payload ?? {}) as unknown as Json, jurisdiction: v.jurisdiction ?? null },
      { onConflict: "email,offer" }
    )
    .select("id")
    .single()
  if (error || !data) {
    return NextResponse.json({ ok: false, error: "could not subscribe" }, { status: 500, headers })
  }

  // Confirmation email — no-ops safely without RESEND_API_KEY (ships dark).
  const unsubUrl = `${brand.url}/api/unsubscribe?token=${encodeURIComponent(unsubToken(data.id))}`
  const { html, text } = offerEmail(v.offer, unsubUrl)
  await sendEmail({ to: v.email, subject: offerSubject(v.offer), html, text })

  return NextResponse.json({ ok: true }, { headers })
}
