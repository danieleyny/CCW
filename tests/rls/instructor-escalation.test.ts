/**
 * PRIVILEGE-ESCALATION REGRESSION TESTS.
 *
 * Every assertion here was a WORKING EXPLOIT against the local database before
 * `20260718001400_instructor_escalation_guards.sql`. They are written as
 * exploits rather than as unit tests on the trigger functions, because what
 * matters is that the attack fails — not that a function exists.
 *
 * The pattern to copy if you add more: mutate as the attacker's own JWT, then
 * re-read with the service role. PostgREST returns success-with-zero-rows when
 * RLS filters an UPDATE, so "no error came back" proves nothing at all — only
 * the re-read does.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { adminClient, anonClientFor, supabaseReachable, DEMO_PASSWORD } from "../helpers/supabase"

/** Its own account — see the note in beforeAll. */
const ESCALATION_EMAIL = "escalation-probe@carrypath.test"

type DB = SupabaseClient<Database>

const reachable = await supabaseReachable()
const admin = adminClient()

let instructor: DB
let instructorId = ""
let instructorUserId = ""
let clientId = ""
let clientProfileId = ""
let caseId = ""
let engagementId = ""

describe.skipIf(!reachable)("instructor privilege escalation is closed", () => {
  beforeAll(async () => {
    // A DEDICATED instructor, not the seeded one. These tests flip `verified`
    // off to prove the exploit fails, and vitest runs files in parallel — using
    // the shared fixture made the marketplace tests fail intermittently, which
    // is a worse bug than the one being tested.
    const { data: created } = await admin.auth.admin.createUser({
      email: ESCALATION_EMAIL,
      password: DEMO_PASSWORD,
      email_confirm: true,
      user_metadata: { full_name: "Escalation Probe", role: "instructor" },
    })
    instructorUserId = created.user!.id
    await admin.from("profiles").upsert({ id: instructorUserId, full_name: "Escalation Probe", role: "instructor" })

    const { data: i } = await admin
      .from("instructors")
      .insert({
        name: "Escalation Probe",
        email: ESCALATION_EMAIL,
        profile_id: instructorUserId,
        verified: true,
        jurisdictions: ["nyc"],
      })
      .select("id, rating_avg, rating_count")
      .single()
    instructorId = i!.id


    instructor = await anonClientFor(ESCALATION_EMAIL)

    const { data: c } = await admin
      .from("clients")
      .select("id, profile_id")
      .not("profile_id", "is", null)
      .limit(1)
      .single()
    clientId = c!.id
    clientProfileId = c!.profile_id!

    const { data: k } = await admin
      .from("cases")
      .insert({ client_id: clientId, stage: "lead" })
      .select("id")
      .single()
    caseId = k!.id

    const { data: e } = await admin
      .from("engagements")
      .insert({ case_id: caseId, instructor_id: instructorId, type: "training", status: "active" })
      .select("id")
      .single()
    engagementId = e!.id
  })

  afterAll(async () => {
    if (caseId) await admin.from("cases").delete().eq("id", caseId)
    if (instructorId) await admin.from("instructors").delete().eq("id", instructorId)
    if (instructorUserId) await admin.auth.admin.deleteUser(instructorUserId)
  })

  it("an instructor cannot verify their own DCJS credential", async () => {
    // `verified` is what makes them visible to applicants, lets them accept
    // offers, and earns the "DCJS-credentialed" badge. It must mean an admin
    // looked at the credential.
    await admin.from("instructors").update({ verified: false }).eq("id", instructorId)

    await instructor.from("instructors").update({ verified: true }).eq("id", instructorId)

    const { data } = await admin.from("instructors").select("verified").eq("id", instructorId).single()
    expect(data!.verified, "an instructor verified themselves").toBe(false)
  })

  it("an instructor cannot invent their own rating", async () => {
    await instructor
      .from("instructors")
      .update({ rating_avg: 5, rating_count: 999 })
      .eq("id", instructorId)

    const { data } = await admin
      .from("instructors")
      .select("rating_avg, rating_count")
      .eq("id", instructorId)
      .single()
    expect(data!.rating_count, "an instructor wrote their own review count").not.toBe(999)
  })

  it("an instructor can still edit their own profile copy", async () => {
    // The guard must not turn into a wall — profile editing is the whole point
    // of instructors_update_own.
    const bio = `Teaching since 2004. ${Date.now()}`
    await instructor.from("instructors").update({ bio }).eq("id", instructorId)

    const { data } = await admin.from("instructors").select("bio").eq("id", instructorId).single()
    expect(data!.bio).toBe(bio)
  })

  it("an instructor cannot resurrect a cancelled engagement to regain case access", async () => {
    await admin.from("engagements").update({ status: "cancelled" }).eq("id", engagementId)

    await instructor
      .from("engagements")
      .update({ status: "active", scope_full_assist: true })
      .eq("id", engagementId)

    const { data } = await admin
      .from("engagements")
      .select("status, scope_full_assist")
      .eq("id", engagementId)
      .single()
    expect(data!.status, "a cancelled engagement was re-activated").toBe("cancelled")
    expect(data!.scope_full_assist, "an instructor widened their own access scope").toBe(false)

    await admin.from("engagements").update({ status: "active" }).eq("id", engagementId)
  })

  it("an instructor cannot post a message as somebody else", async () => {
    const { error } = await instructor.from("messages").insert({
      case_id: caseId,
      engagement_id: engagementId,
      sender_id: clientProfileId, // impersonating the applicant
      body: "SPOOF-sender",
    })
    expect(error, "sender_id was not bound to the session").not.toBeNull()

    const { data } = await admin.from("messages").select("id").eq("body", "SPOOF-sender")
    expect(data ?? []).toEqual([])
  })

  it("an instructor cannot post into a case they hold no engagement on", async () => {
    // One valid engagement used to be a key to every case.
    const { data: foreign } = await admin
      .from("cases")
      .select("id")
      .neq("id", caseId)
      .limit(1)
      .single()
    const { data: me } = await instructor.auth.getUser()

    const { error } = await instructor.from("messages").insert({
      case_id: foreign!.id,
      engagement_id: engagementId,
      sender_id: me.user!.id,
      body: "SPOOF-case",
    })
    expect(error, "case_id was not bound to the engagement").not.toBeNull()

    const { data } = await admin.from("messages").select("id").eq("body", "SPOOF-case")
    expect(data ?? []).toEqual([])
  })

  it("an instructor can still write in their own engagement lane", async () => {
    const { data: me } = await instructor.auth.getUser()
    const { error } = await instructor.from("messages").insert({
      case_id: caseId,
      engagement_id: engagementId,
      sender_id: me.user!.id,
      body: "legitimate message",
    })
    expect(error, error?.message).toBeNull()
  })

  it("a cancelled engagement closes the message lane", async () => {
    await admin.from("engagements").update({ status: "cancelled" }).eq("id", engagementId)
    const { data: me } = await instructor.auth.getUser()

    const { error } = await instructor.from("messages").insert({
      case_id: caseId,
      engagement_id: engagementId,
      sender_id: me.user!.id,
      body: "after cancellation",
    })
    expect(error, "the chat lane outlived the engagement").not.toBeNull()

    await admin.from("engagements").update({ status: "active" }).eq("id", engagementId)
  })
})
