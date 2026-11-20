/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { TRAINING_CONFIG } from "@/content/training/config"
import { createAdminClient } from "@/lib/supabase/admin"
import { TRAINING_BUCKET } from "@/lib/training/server"
import type { TrainingSession } from "@/lib/training/types"
export async function GET(request: NextRequest) {
  if (!process.env.CRON_SECRET || request.headers.get("authorization") !== `Bearer ${process.env.CRON_SECRET}`) return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
  const db = createAdminClient() as any
  const staleAt = new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()
  const { data: pending } = await db.from("training_registrations").select("id,id_file_path").eq("status", "pending_payment").lt("created_at", staleAt)
  const stalePaths = (pending ?? []).map((row: { id_file_path: string | null }) => row.id_file_path).filter(Boolean)
  if (stalePaths.length) await db.storage.from(TRAINING_BUCKET).remove(stalePaths)
  if (pending?.length) await db.from("training_registrations").delete().in("id", pending.map((row: { id: string }) => row.id))
  const { data: classes } = await db.from("training_classes").select("id,sessions")
  const cutoff = new Date(Date.now() - TRAINING_CONFIG.ID_RETENTION_DAYS * 24 * 60 * 60 * 1000)
  for (const course of classes ?? []) {
    const sessions = course.sessions as TrainingSession[]
    const last = [...sessions].sort((a, b) => a.date.localeCompare(b.date)).at(-1)
    if (!last || new Date(`${last.date}T23:59:59-05:00`) > cutoff) continue
    const { data: registrations } = await db.from("training_registrations").select("id,id_file_path").eq("class_id", course.id).not("id_file_path", "is", null)
    const paths = (registrations ?? []).map((row: { id_file_path: string }) => row.id_file_path)
    if (paths.length) await db.storage.from(TRAINING_BUCKET).remove(paths)
    if (registrations?.length) await db.from("training_registrations").update({ id_file_path: null }).in("id", registrations.map((row: { id: string }) => row.id))
  }
  return NextResponse.json({ ok: true, deletedPending: pending?.length ?? 0 })
}
