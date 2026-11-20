/**
 * Instructor go-live rules and the integrity guards around them.
 *
 * Two things here protect the applicant, not the instructor:
 *  - "DCJS-credentialed" means an admin verified it. Typing a number into a box
 *    is not a credential, and the badge used to render on the string's presence.
 *  - The required 18-hour course is IN-PERSON under NY's CCIA. An instructor
 *    advertising a virtual course creates a legal problem for the applicant.
 */
import { describe, expect, it } from "vitest"
import {
  evaluateProfile,
  isLiveEligible,
  findVirtualCourseClaim,
  findBannedClaim,
  instructorStatus,
} from "@/lib/instructors/profile"
import { qualifyingOffersFor } from "@/lib/marketplace/offers"

const full = {
  bio: "Twelve years teaching new shooters in Brooklyn, with a focus on first-time carriers who have never handled a firearm.",
  price_18h_cents: 60000,
  class_format: "small_group",
  languages: ["English", "Spanish"],
  provides_range: true,
  separate_range_note: null,
  locations: [{ is_range: false, address: "123 W 30th St, New York, NY" }],
  verified: true,
  active: true,
  onboarding_completed_at: "2026-07-19T00:00:00Z",
}

describe("profile completeness", () => {
  it("a fully filled profile is complete and live-eligible", () => {
    const c = evaluateProfile(full)
    expect(c.complete).toBe(true)
    expect(c.percent).toBe(100)
    expect(c.missing).toEqual([])
    expect(isLiveEligible(full)).toBe(true)
  })

  it("an empty profile lists everything that's missing, and is not live", () => {
    const c = evaluateProfile({
      bio: null,
      price_18h_cents: null,
      class_format: null,
      languages: [],
      provides_range: null,
      separate_range_note: null,
      locations: [],
    })
    expect(c.complete).toBe(false)
    expect(c.percent).toBe(0)
    expect(c.missing.map((m) => m.key).sort()).toEqual([
      "bio",
      "classroom",
      "format",
      "languages",
      "price",
      "range",
    ])
  })

  it("a borough with no street address is not a classroom location", () => {
    // "Manhattan" is not somewhere you can drive to for 16 hours of class.
    const c = evaluateProfile({ ...full, locations: [{ is_range: false, address: "  " }] })
    expect(c.missing.map((m) => m.key)).toContain("classroom")
  })

  it("a range-only location doesn't satisfy the classroom requirement", () => {
    const c = evaluateProfile({
      ...full,
      locations: [{ is_range: true, address: "9 Range Rd, Bronx, NY" }],
    })
    expect(c.missing.map((m) => m.key)).toContain("classroom")
  })

  it("not providing the range is fine — staying silent about it is not", () => {
    // The range fee is the most common surprise cost in this transaction.
    const silent = evaluateProfile({ ...full, provides_range: false, separate_range_note: null })
    expect(silent.missing.map((m) => m.key)).toContain("range")

    const named = evaluateProfile({
      ...full,
      provides_range: false,
      separate_range_note: "We use Westside Range in Manhattan; their range fee is paid on the day.",
    })
    expect(named.complete).toBe(true)
  })

  it("an unverified instructor is never live, however complete the profile", () => {
    expect(isLiveEligible({ ...full, verified: false })).toBe(false)
    expect(isLiveEligible({ ...full, active: false })).toBe(false)
  })

  it("onboarding is required to go live, even verified with a complete profile (Phase 13)", () => {
    expect(isLiveEligible({ ...full, onboarding_completed_at: null })).toBe(false)
  })
})

describe("compliance guards on instructor-written copy", () => {
  it("catches a virtual/online claim about the required course", () => {
    for (const claim of [
      "We offer a virtual course for busy professionals.",
      "The 16-hour class can be completed online.",
      "Remote training available — 18-hour certification over Zoom.",
      "Online 18-hour course, then range day.",
    ]) {
      expect(findVirtualCourseClaim(claim), claim).toBeTruthy()
    }
  })

  it("leaves a legitimate free intro call alone", () => {
    for (const ok of [
      "I offer a free virtual intro call before you book, so you can meet me first.",
      "Happy to do a quick Zoom introduction — the course itself is in person in Brooklyn.",
      "All instruction is in person; I answer questions by phone beforehand.",
    ]) {
      expect(findVirtualCourseClaim(ok), ok).toBeNull()
    }
  })

  it("catches guarantee / expedite / endorsement language", () => {
    expect(findBannedClaim("Guaranteed approval with my course.")).toBeTruthy()
    expect(findBannedClaim("I can expedite your application.")).toBeTruthy()
    expect(findBannedClaim("NYPD-endorsed instructor.")).toBeTruthy()
    expect(findBannedClaim("Twelve years teaching new shooters in Queens.")).toBeNull()
  })
})

describe("admin instructor operations", () => {
  it("derives status from the same go-live rules", () => {
    const timestamps = { created_at: "2026-11-01T00:00:00Z", updated_at: "2026-11-10T00:00:00Z" }
    expect(instructorStatus({ ...full, ...timestamps }, new Date("2026-11-19T00:00:00Z")).key).toBe("live")
    const waiting = instructorStatus({ ...full, ...timestamps, verified: false }, new Date("2026-11-19T00:00:00Z"))
    expect(waiting.key).toBe("needs_verification")
    expect(waiting.waitingDays).toBe(9)
    expect(instructorStatus({ ...full, ...timestamps, verified: false, bio: "short" }).key).toBe("setting_up")
    expect(instructorStatus({ ...full, ...timestamps, active: false }).key).toBe("inactive")
  })

  it("uses one pure geographic filter for match preview and backfill", () => {
    const instructor = { jurisdictions: ["nyc" as const], lat: 40.7506, lng: -73.9971, service_radius_mi: 10 }
    const offers = [
      { id: "near", jurisdiction: "nyc" as const, lat: 40.7831, lng: -73.9712, radius_mi: 5, expires_at: null },
      { id: "coarse", jurisdiction: "nyc" as const, lat: null, lng: null, radius_mi: 5, expires_at: null },
      { id: "wrong", jurisdiction: "nassau" as const, lat: null, lng: null, radius_mi: 25, expires_at: null },
      { id: "expired", jurisdiction: "nyc" as const, lat: null, lng: null, radius_mi: 25, expires_at: "2026-11-18T00:00:00Z" },
    ]
    expect(qualifyingOffersFor(instructor, offers, new Date("2026-11-19T00:00:00Z")).map((offer) => offer.id)).toEqual(["near", "coarse"])
  })
})
