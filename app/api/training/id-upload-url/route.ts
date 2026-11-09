import { NextRequest, NextResponse } from "next/server"
import { z } from "zod"
import { createAdminClient } from "@/lib/supabase/admin"
import { clientIpFrom, rateLimit } from "@/lib/rate-limit"
import { TRAINING_BUCKET } from "@/lib/training/server"

const input = z.object({
  classId: z.string().uuid(), contentType: z.enum(["image/jpeg", "image/png", "image/heic", "application/pdf"]),
  size: z.number().int().positive().max(10 * 1024 * 1024),
})

export async function POST(request: NextRequest) {
  if (!rateLimit(`training-upload:${clientIpFrom(request.headers)}`, 8, 10 * 60_000)) {
    return NextResponse.json({ error: "Please wait before uploading another file." }, { status: 429 })
  }
  const parsed = input.safeParse(await request.json().catch(() => null))
  if (!parsed.success) return NextResponse.json({ error: "That file is not accepted." }, { status: 400 })
  const ext = parsed.data.contentType === "application/pdf" ? "pdf" : parsed.data.contentType.split("/")[1].replace("jpeg", "jpg")
  const fileKey = `pending/${parsed.data.classId}/${crypto.randomUUID()}.${ext}`
  const db = createAdminClient()
  const { data, error } = await db.storage.from(TRAINING_BUCKET).createSignedUploadUrl(fileKey, { upsert: false })
  if (error || !data) return NextResponse.json({ error: "Unable to prepare a secure upload." }, { status: 500 })
  return NextResponse.json({ signedUrl: data.signedUrl, token: data.token, fileKey, expiresIn: 600 })
}
