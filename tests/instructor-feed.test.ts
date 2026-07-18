/**
 * The instructor feed's three behaviours, driven against the real database and
 * the real views (as the instructor, through RLS — not with service-role
 * shortcuts that would prove nothing).
 *
 *  1. GREEN DOT — a new unanswered request counts as unseen; opening the feed
 *     clears it.
 *  2. EXCLUSIVITY — once an applicant chooses, the request leaves every other
 *     instructor's feed. Nobody works a request that's already gone.
 *  3. AUTO-OFFER — an opted-in instructor answers a new in-area request without
 *     touching the app, but only if they're verified AND profile-complete.
 */
import { afterAll, beforeAll, describe, expect, it, vi } from "vitest"

vi.mock("@/lib/email", () => ({ sendEmail: vi.fn(async () => ({ ok: true })) }))

import { countUnseenRequests, markFeedSeen } from "@/lib/instructors/feed-signal"
import { createAndMatchOffer } from "@/lib/marketplace/offers"
import { adminClient, anonClientFor, supabaseReachable } from "./helpers/supabase"

const reachable = await supabaseReachable()
const admin = adminClient()

/** The seeded instructor, and a second one so "every OTHER instructor" is real. */
let seeded: { id: string; feed_seen_at: string | null }
let second = ""
let caseId = ""
let clientId = ""
const madeOffers: string[] = []

/** A complete, verified profile — anything less is not live-eligible. */
async function makeLiveInstructor(name: string, extra: Record<string, unknown> = {}) {
  const { data } = await admin
    .from("instructors")
    .insert({
      name,
      verified: true,
      active: true,
      bio: "Two decades teaching first-time carriers across the five boroughs, patiently.",
      price_18h_cents: 65000,
      class_format: "small_group",
      languages: ["English"],
      provides_range: true,
      jurisdictions: ["nyc"],
      lat: 40.7128,
      lng: -74.006,
      service_radius_mi: 25,
      ...extra,
    })
    .select("id")
    .single()
  await admin
    .from("training_locations")
    .insert({ instructor_id: data!.id, label: "Test Classroom", address: "1 Test St, New York, NY", is_range: false })
  return data!.id
}

describe.skipIf(!reachable)("instructor feed", () => {
  beforeAll(async () => {
    const { data: instr } = await admin
      .from("instructors")
      .select("id, feed_seen_at")
      .eq("email", "instructor@carrypath.test")
      .single()
    seeded = instr!

    // The seeded instructor must be live-eligible for any of this to fire.
    await admin
      .from("instructors")
      .update({
        bio: "Two decades teaching first-time carriers across the five boroughs, patiently.",
        price_18h_cents: 65000,
        class_format: "small_group",
        languages: ["English"],
        provides_range: true,
      })
      .eq("id", seeded.id)
    const { count } = await admin
      .from("training_locations")
      .select("id", { count: "exact", head: true })
      .eq("instructor_id", seeded.id)
      .eq("is_range", false)
    if (!count) {
      await admin.from("training_locations").insert({
        instructor_id: seeded.id,
        label: "Seed Classroom",
        address: "2 Seed St, New York, NY",
        is_range: false,
      })
    }

    second = await makeLiveInstructor("Second Instructor")

    // The case must belong to a client we can sign in as — choose_instructor is
    // auth.uid()-scoped through case_visible(), so service-role can't call it.
    const { data: client } = await admin
      .from("clients")
      .select("id")
      .eq("email", "client1@carrypath.test")
      .single()
    clientId = client!.id
    const { data: kase } = await admin
      .from("cases")
      .insert({ client_id: clientId, stage: "lead" })
      .select("id")
      .single()
    caseId = kase!.id
  })

  afterAll(async () => {
    for (const id of madeOffers) await admin.from("case_offers").delete().eq("id", id)
    if (caseId) await admin.from("cases").delete().eq("id", caseId)
    if (second) {
      await admin.from("training_locations").delete().eq("instructor_id", second)
      await admin.from("instructors").delete().eq("id", second)
    }
  })

  it("a new request counts as unseen, and opening the feed clears it", async () => {
    // Counted AS THE INSTRUCTOR: the feed view is auth.uid()-scoped, which is
    // exactly how the nav calls it. Service-role would see nothing and prove
    // nothing.
    const asInstructor = await anonClientFor("instructor@carrypath.test")

    await markFeedSeen(asInstructor, seeded.id) // start from a clean watermark
    const { data: before } = await admin.from("instructors").select("feed_seen_at").eq("id", seeded.id).single()
    expect(await countUnseenRequests(asInstructor, { id: seeded.id, feed_seen_at: before!.feed_seen_at })).toBe(0)

    const res = await createAndMatchOffer(admin, {
      caseId,
      type: "training",
      jurisdiction: "nyc",
      borough: "Manhattan",
    })
    madeOffers.push(res.offerId)
    expect(res.matched).toBeGreaterThan(0)

    const unseen = await countUnseenRequests(asInstructor, { id: seeded.id, feed_seen_at: before!.feed_seen_at })
    expect(unseen, "the green dot should be lit").toBeGreaterThan(0)

    // Opening the feed is the "seen" signal.
    await markFeedSeen(asInstructor, seeded.id)
    const { data: after } = await admin.from("instructors").select("feed_seen_at").eq("id", seeded.id).single()
    expect(
      await countUnseenRequests(asInstructor, { id: seeded.id, feed_seen_at: after!.feed_seen_at }),
      "the dot should be gone once they've looked"
    ).toBe(0)
  })

  it("choosing an instructor removes the request from every other instructor's feed", async () => {
    const res = await createAndMatchOffer(admin, {
      caseId,
      type: "training",
      jurisdiction: "nyc",
      borough: "Manhattan",
    })
    madeOffers.push(res.offerId)

    // Both instructors express interest — a real competitive request.
    await admin
      .from("offer_matches")
      .update({ responded: "interested", responded_at: new Date().toISOString() })
      .eq("offer_id", res.offerId)

    // Read the feed AS the seeded instructor, through the view + RLS.
    const instructorClient = await anonClientFor("instructor@carrypath.test")
    const seesIt = async () => {
      const { data } = await instructorClient
        .from("instructor_offer_feed")
        .select("offer_id")
        .eq("offer_id", res.offerId)
      return (data ?? []).length > 0
    }
    expect(await seesIt(), "the request should start out visible").toBe(true)

    // The applicant picks the OTHER instructor — as themselves, and the call has
    // to actually succeed (a silently-failed RPC would make this test pass for
    // the wrong reason).
    const applicant = await anonClientFor("client1@carrypath.test")
    const { error: chooseErr } = await applicant.rpc("choose_instructor", {
      p_offer_id: res.offerId,
      p_instructor_id: second,
    })
    expect(chooseErr, chooseErr?.message).toBeNull()

    expect(
      await seesIt(),
      "a request that's already been won must not sit in anyone else's feed"
    ).toBe(false)

    // And it's genuinely resolved, not just hidden.
    const { data: offer } = await admin.from("case_offers").select("status").eq("id", res.offerId).single()
    expect(offer!.status).toBe("accepted")
    const { data: loser } = await admin
      .from("offer_matches")
      .select("responded")
      .eq("offer_id", res.offerId)
      .eq("instructor_id", seeded.id)
      .single()
    expect(loser!.responded).toBe("declined")
  })

  it("auto-offer answers a new in-area request without the instructor lifting a finger", async () => {
    await admin
      .from("instructors")
      .update({
        auto_offer_enabled: true,
        auto_offer_note: "Happy to help — I teach in Manhattan most weeknights.",
        auto_offer_price_cents: 59900,
      })
      .eq("id", second)

    const res = await createAndMatchOffer(admin, {
      caseId,
      type: "training",
      jurisdiction: "nyc",
      borough: "Manhattan",
    })
    madeOffers.push(res.offerId)
    expect(res.autoSent).toBe(1)

    const { data: auto } = await admin
      .from("offer_matches")
      .select("responded, note, quoted_price_cents")
      .eq("offer_id", res.offerId)
      .eq("instructor_id", second)
      .single()
    expect(auto!.responded).toBe("interested")
    expect(auto!.quoted_price_cents).toBe(59900)
    expect(auto!.note).toMatch(/happy to help/i)

    // The instructor who didn't opt in is untouched — no silent answering.
    const { data: manual } = await admin
      .from("offer_matches")
      .select("responded")
      .eq("offer_id", res.offerId)
      .eq("instructor_id", seeded.id)
      .single()
    expect(manual!.responded).toBeNull()
  })

  it("an incomplete profile never auto-offers, and never reaches an applicant at all", async () => {
    // Verified but with nothing an applicant could choose from.
    const thin = await makeLiveInstructor("Thin Profile", {
      bio: null,
      price_18h_cents: null,
      class_format: null,
      languages: [],
      provides_range: null,
      auto_offer_enabled: true,
      auto_offer_note: "I'll take it",
    })
    await admin.from("training_locations").delete().eq("instructor_id", thin)

    try {
      const res = await createAndMatchOffer(admin, {
        caseId,
        type: "training",
        jurisdiction: "nyc",
        borough: "Manhattan",
      })
      madeOffers.push(res.offerId)

      const { data: match } = await admin
        .from("offer_matches")
        .select("instructor_id")
        .eq("offer_id", res.offerId)
        .eq("instructor_id", thin)
      expect(match ?? [], "an incomplete profile must not be matched to anybody").toEqual([])
    } finally {
      await admin.from("instructors").delete().eq("id", thin)
    }
  })
})
