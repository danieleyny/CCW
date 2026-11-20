/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { clientIpFrom, rateLimit } from "@/lib/rate-limit"
const input = z.object({ classId: z.string().uuid().nullable(), email: z.string().email() })
export async function POST(request: NextRequest) {
  if (!rateLimit(`training-waitlist:${clientIpFrom(request.headers)}`, 5, 10 * 60_000)) return NextResponse.json({ error: "Please wait before trying again." }, { status: 429 })
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "Enter a valid email address." }, { status: 400 })
  const db = createAdminClient() as any
  const { error } = await db.from("training_waitlist").upsert({ class_id: parsed.data.classId, email: parsed.data.email.toLowerCase() }, { onConflict: "class_id,email" })
  return error ? NextResponse.json({ error: "Unable to save your request." }, { status: 500 }) : NextResponse.json({ ok: true })
}
