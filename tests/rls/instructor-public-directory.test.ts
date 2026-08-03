/**
 * THE LEAK TEST for the public instructor directory (SEO V2 Phase 4).
 *
 * /instructors is the only place instructor data is shown to the anonymous
 * public, so the `public_instructor_directory` view is a privacy boundary, not a
 * convenience. This suite proves, against the real database, that:
 *
 *   1. The view exposes EXACTLY the projected columns — asserted at KEY level
 *      (Object.keys), so a column that is null today can't silently appear
 *      tomorrow. Email, phone, DCJS id, price, background, and every other base
 *      column must be structurally absent.
 *   2. Only rows that are BOTH opted-in (public_profile) AND admin-verified
 *      appear. A verified-but-not-opted-in instructor and an opted-in-but-not-
 *      verified instructor are both invisible.
 *   3. An anonymous (signed-out) client can read the view at all — the directory
 *      is public by design.
 */
import { afterAll, beforeAll, describe, expect, it } from "vitest"
import { adminClient, anonClient, supabaseReachable } from "../helpers/supabase"

const reachable = await supabaseReachable()
const admin = adminClient()
const anon = anonClient()

// Sentinel values on the PUBLIC instructor: if any of these strings surface
// through the view, the projection leaked.
const SECRET_EMAIL = "leak-probe@private.test"
const SECRET_PHONE = "555-000-9999"
const SECRET_DCJS = "DCJS-SECRET-000"

const ids: string[] = []
let publicSlug = ""

async function makeInstructor(fields: Record<string, unknown>): Promise<string> {
  const { data, error } = await admin
    .from("instructors")
    .insert(fields as never)
    .select("id")
    .single()
  if (error) throw error
  ids.push(data!.id)
  return data!.id
}

beforeAll(async () => {
  if (!reachable) return
  // A — opted in AND verified → the only one that should be public.
  await makeInstructor({
    name: "Public Probe Instructor",
    email: SECRET_EMAIL,
    phone: SECRET_PHONE,
    dcjs_id: SECRET_DCJS,
    price_18h_cents: 65000,
    background: "internal-only background note",
    bio: "Patient, first-timer-friendly instruction.",
    languages: ["English", "Spanish"],
    class_format: "small_group",
    public_boroughs: ["Manhattan", "Brooklyn"],
    public_profile: true,
    verified: true,
  })
  // B — verified but NOT opted in → invisible.
  await makeInstructor({
    name: "Verified But Private",
    email: SECRET_EMAIL,
    public_profile: false,
    verified: true,
  })
  // C — opted in but NOT verified → invisible.
  await makeInstructor({
    name: "Opted In But Unverified",
    email: SECRET_EMAIL,
    public_profile: true,
    verified: false,
  })
})

afterAll(async () => {
  if (!reachable || ids.length === 0) return
  await admin.from("instructors").delete().in("id", ids)
})

describe("public_instructor_directory — the leak test", () => {
  it.runIf(reachable)("exposes EXACTLY the projected columns, nothing else", async () => {
    const { data, error } = await anon
      .from("public_instructor_directory")
      .select("*")
      .eq("name", "Public Probe Instructor")
    expect(error).toBeNull()
    expect(data && data.length).toBe(1)
    const keys = Object.keys(data![0]).sort()
    expect(keys).toEqual(["bio", "boroughs", "class_format", "languages", "name", "slug"])
    // Belt and suspenders: sensitive base columns must not be present as keys.
    for (const forbidden of ["email", "phone", "dcjs_id", "price_18h_cents", "background", "id", "profile_id"]) {
      expect(keys).not.toContain(forbidden)
    }
  })

  it.runIf(reachable)("never surfaces sensitive values anywhere in the payload", async () => {
    const { data } = await anon.from("public_instructor_directory").select("*")
    const blob = JSON.stringify(data ?? [])
    expect(blob).not.toContain(SECRET_EMAIL)
    expect(blob).not.toContain(SECRET_PHONE)
    expect(blob).not.toContain(SECRET_DCJS)
  })

  it.runIf(reachable)("shows opted-in + verified, hides the other two", async () => {
    const { data } = await anon.from("public_instructor_directory").select("name")
    const names = (data ?? []).map((r) => r.name)
    expect(names).toContain("Public Probe Instructor")
    expect(names).not.toContain("Verified But Private")
    expect(names).not.toContain("Opted In But Unverified")
  })

  it.runIf(reachable)("derives a readable, url-safe slug", async () => {
    const { data } = await anon
      .from("public_instructor_directory")
      .select("slug")
      .eq("name", "Public Probe Instructor")
      .single()
    publicSlug = data?.slug ?? ""
    expect(publicSlug).toMatch(/^public-probe-instructor-[0-9a-f]{8}$/)
  })
})
