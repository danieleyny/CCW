/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest } from "next/server"
import { generateIcs } from "@/lib/calendar/ics"
import { createAdminClient } from "@/lib/supabase/admin"
import type { TrainingSession } from "@/lib/training/types"
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("rid")
  if (!id) return new Response("Missing registration", { status: 400 })
  const db = createAdminClient() as any
  const { data } = await db.from("training_registrations").select("id, class_id, training_classes(title, sessions, location_public)").eq("id", id).in("status", ["paid", "enrolled", "confirmed"]).maybeSingle()
  const course = data?.training_classes
  if (!data || !course) return new Response("Not found", { status: 404 })
  const events = (course.sessions as TrainingSession[]).map((session, index) => generateIcs({ uid: `${data.id}-${index + 1}@gunlicensenyc.com`, start: `${session.date}T${session.start}:00-05:00`, end: `${session.date}T${session.end}:00-05:00`, summary: `${course.title} (Session ${index + 1})`, location: `${course.location_public} (address in confirmation email)` })).join("\r\n")
  return new Response(events, { headers: { "Content-Type": "text/calendar; charset=utf-8", "Content-Disposition": "attachment; filename=nys-ccw-class.ics" } })
}
