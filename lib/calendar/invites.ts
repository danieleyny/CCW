import "server-only"

import { createAdminClient } from "@/lib/supabase/admin"
import { sendEmail } from "@/lib/email"
import { buildBookingIcs, mapLink } from "./ics"

/**
 * Email both parties a .ics invite for a confirmed booking. Runs via the
 * service-role client so the instructor's side never needs to read client PII.
 */
export async function sendBookingInvites(bookingId: string) {
  const admin = createAdminClient()
  const { data: b } = await admin
    .from("bookings")
    .select("id, ics_uid, type, starts_at, ends_at, location_id, client_id, instructor_id")
    .eq("id", bookingId)
    .single()
  if (!b) return { sent: 0 }

  const [{ data: client }, { data: instr }] = await Promise.all([
    admin.from("clients").select("full_name, email").eq("id", b.client_id).single(),
    admin.from("instructors").select("name, email").eq("id", b.instructor_id).single(),
  ])

  let locationLabel: string | null = null
  let address: string | null = null
  if (b.location_id) {
    const { data: loc } = await admin
      .from("training_locations")
      .select("label, address")
      .eq("id", b.location_id)
      .single()
    locationLabel = loc?.label ?? null
    address = loc?.address ?? null
  }

  const { ics, locationStr, typeLabel } = buildBookingIcs({
    bookingId: b.id,
    icsUid: b.ics_uid,
    type: b.type,
    startsAt: b.starts_at,
    endsAt: b.ends_at,
    clientEmail: client?.email,
    locationLabel,
    address,
  })

  const when = new Date(b.starts_at).toLocaleString("en-US", { dateStyle: "full", timeStyle: "short" })
  const body = `<div style="font-family:sans-serif;line-height:1.5">
    <p>Your Gun License NYC <b>${typeLabel}</b> is confirmed.</p>
    <p><b>When:</b> ${when}</p>
    ${locationStr ? `<p><b>Where:</b> ${locationStr}${address ? ` — <a href="${mapLink(address)}">open map</a>` : ""}</p>` : ""}
    <p>A calendar invite is attached. Bring a photo ID and eye/ear protection.</p>
  </div>`
  const attachments = [{ filename: "carry-training.ics", content: ics, contentType: "text/calendar" }]

  let sent = 0
  if (client?.email) {
    await sendEmail({ to: client.email, subject: "Your Gun License NYC training is confirmed", html: body, attachments })
    sent++
  }
  if (instr?.email) {
    await sendEmail({ to: instr.email, subject: "Training session confirmed", html: body, attachments })
    sent++
  }
  return { sent, ics }
}
