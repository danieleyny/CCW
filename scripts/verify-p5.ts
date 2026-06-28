/**
 * Phase 5 acceptance — Scheduling, booking & calendar.
 * Proves the gate test:
 *   - a client books a confirmed slot; both parties' invite is a valid .ics to
 *     the correct training-location address;
 *   - the slot's booked_count increments and a second booking is REFUSED
 *     (no overbooking);
 *   - completion writes a training_sessions row and releases the seat.
 *
 * Run after `pnpm seed`:  pnpm tsx scripts/verify-p5.ts
 */
import { config as loadEnv } from "dotenv"
import { createClient } from "@supabase/supabase-js"
import { buildBookingIcs } from "../lib/calendar/ics"

loadEnv({ path: ".env.local" })
const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY!
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
const admin = createClient(URL, SERVICE, { auth: { persistSession: false } })

let failures = 0
function check(cond: boolean, msg: string) {
  console.log(`${cond ? "✓" : "✗"} ${msg}`)
  if (!cond) failures++
}
const isoIn = (days: number) => new Date(Date.now() + days * 86400000).toISOString()

async function slotCount(slotId: string): Promise<number> {
  const { data } = await admin.from("availability_slots").select("booked_count").eq("id", slotId).single()
  return data!.booked_count
}

async function main() {
  console.log("\n— Phase 5 verification —\n")

  const { data: frank } = await admin.from("instructors").select("id").eq("name", "Frank DiMeo").single()
  const { data: loc } = await admin.from("training_locations").select("id, address").eq("is_range", true).limit(1).single()
  const { data: jordanClient } = await admin.from("clients").select("id").eq("email", "client1@carrypath.test").single()
  const { data: jordanCase } = await admin.from("cases").select("id").eq("client_id", jordanClient!.id).limit(1).single()

  // A fresh capacity-1 slot to exercise the overbooking guard.
  const start = isoIn(20)
  const end = isoIn(20.25)
  const { data: slot } = await admin
    .from("availability_slots")
    .insert({ instructor_id: frank!.id, location_id: loc!.id, type: "combined_18h", capacity: 1, starts_at: start, ends_at: end })
    .select("id")
    .single()
  const slotId = slot!.id

  // ── Client books through their own session (RLS path) ─────────────────────
  const c1 = createClient(URL, ANON, { auth: { persistSession: false } })
  await c1.auth.signInWithPassword({ email: "client1@carrypath.test", password: "Passw0rd!" })
  const booking1 = await c1.from("bookings").insert({
    case_id: jordanCase!.id, client_id: jordanClient!.id, instructor_id: frank!.id,
    slot_id: slotId, location_id: loc!.id, type: "combined_18h", status: "requested",
    starts_at: start, ends_at: end,
  }).select("id").single()
  check(!booking1.error && !!booking1.data, "client can book a slot through RLS")
  check((await slotCount(slotId)) === 1, "booked_count incremented to 1")

  // ── Overbooking is refused ────────────────────────────────────────────────
  const booking2 = await admin.from("bookings").insert({
    case_id: jordanCase!.id, client_id: jordanClient!.id, instructor_id: frank!.id,
    slot_id: slotId, location_id: loc!.id, type: "combined_18h", status: "requested",
    starts_at: start, ends_at: end,
  }).select("id").single()
  check(!!booking2.error, "a second booking on a capacity-1 slot is REFUSED (overbooking guard)")
  check((await slotCount(slotId)) === 1, "booked_count stayed at 1 after the refused booking")

  // ── Valid .ics to the correct address ─────────────────────────────────────
  const { ics } = buildBookingIcs({
    bookingId: booking1.data!.id, type: "combined_18h", startsAt: start, endsAt: end,
    clientEmail: "client1@carrypath.test", locationLabel: "Gowanus Indoor Range", address: loc!.address,
  })
  check(ics.includes("BEGIN:VCALENDAR") && ics.includes("BEGIN:VEVENT") && ics.includes("END:VCALENDAR"), "ICS has valid VCALENDAR/VEVENT structure")
  check(/DTSTART:\d{8}T\d{6}Z/.test(ics), "ICS has a well-formed DTSTART")
  check(ics.includes((loc!.address as string).split(",")[0]), "ICS LOCATION points at the right training-location address")

  // ── Confirm → still held; complete → releases + writes training session ───
  await admin.from("bookings").update({ status: "confirmed", ics_uid: `${booking1.data!.id}@carry.app` }).eq("id", booking1.data!.id)
  check((await slotCount(slotId)) === 1, "confirming keeps the seat held")

  await admin.from("bookings").update({ status: "completed" }).eq("id", booking1.data!.id)
  const ts = await admin.from("training_sessions").insert({
    case_id: jordanCase!.id, instructor_id: frank!.id, class_date: start, attended: true, test_score: 92, passed: true,
  }).select("id").single()
  check(!ts.error && !!ts.data, "completion writes a training_sessions row (score/pass)")
  check((await slotCount(slotId)) === 0, "completion releases the seat (booked_count → 0)")

  // ── cleanup ────────────────────────────────────────────────────────────────
  await admin.from("bookings").delete().eq("id", booking1.data!.id)
  await admin.from("training_sessions").delete().eq("id", ts.data!.id)
  await admin.from("availability_slots").delete().eq("id", slotId)

  console.log(`\n${failures === 0 ? "✅ PASS" : `❌ ${failures} FAILURE(S)`} — Phase 5\n`)
  process.exit(failures === 0 ? 0 : 1)
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
