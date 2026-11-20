import { describe, expect, it } from "vitest"
import { loadAdminTraining } from "@/lib/admin/training"

function trainingDb(classes: Array<Record<string, unknown>>, registrations: Array<Record<string, unknown>>) {
  return {
    from(table: string) {
      return {
        select() {
          if (table === "training_classes") return Promise.resolve({ data: classes, error: null })
          if (table === "training_registrations") return Promise.resolve({ data: registrations, error: null })
          return Promise.resolve({ data: null, error: { code: "TEST", message: "unexpected table" } })
        },
      }
    },
  }
}

const classRow = {
  id: "00000000-0000-4000-8000-000000000010",
  slug: "ccw-2026-12",
  title: "December CCW class",
  sessions: [
    { date: "2026-12-12", start: "09:00", end: "17:00", label: "Session 1" },
    { date: "2026-12-13", start: "09:00", end: "17:00", label: "Session 2" },
  ],
  location_public: "Manhattan",
  location_private: "Test range address",
  price_cents: 60000,
  capacity: 12,
  status: "open",
  instructor_name: "Test Instructor",
  vendor_company: "Test Vendor",
  vendor_class_urls: ["https://example.test/register"],
  vendor_access_code: "PRIVATE-CODE",
  created_at: "2026-11-01T12:00:00.000Z",
}

function registration(overrides: Record<string, unknown>) {
  return {
    id: crypto.randomUUID(),
    class_id: classRow.id,
    first_name: "Test",
    middle_name: "",
    last_name: "Registrant",
    email: "registrant@example.test",
    mobile_phone: "2125550100",
    status: "paid",
    amount_cents: 60000,
    stripe_payment_intent_id: "pi_test_123",
    id_file_path: "private/id.png",
    paid_at: "2026-11-10T12:00:00.000Z",
    created_at: "2026-11-09T12:00:00.000Z",
    ...overrides,
  }
}

describe("admin training workspace data", () => {
  it("groups classes, calculates the roster, and creates one actionable row per registration", async () => {
    const paidMissingId = registration({ id: "00000000-0000-4000-8000-000000000101", id_file_path: null })
    const enrolled = registration({ id: "00000000-0000-4000-8000-000000000102", status: "enrolled" })
    const confirmed = registration({ id: "00000000-0000-4000-8000-000000000103", status: "confirmed" })
    const refunded = registration({ id: "00000000-0000-4000-8000-000000000104", status: "refunded" })
    const data = await loadAdminTraining(
      trainingDb([classRow], [paidMissingId, enrolled, confirmed, refunded]),
      { now: new Date("2026-11-18T15:00:00.000Z"), stripeMode: "test", refundsEnabled: true },
    )

    expect(data.selectedId).toBe(classRow.id)
    expect(data.classes[0]).toMatchObject({ group: "upcoming", activeSeats: 3, paidNotEnrolled: 1, confirmed: 1, collectedCents: 180000 })
    expect(data.needs).toHaveLength(2)
    expect(data.needs.find((row) => row.registrationId === paidMissingId.id)).toMatchObject({ missingId: true, need: "Enroll with instructor · ID missing" })
    expect(data.needs.find((row) => row.registrationId === enrolled.id)).toMatchObject({ missingId: false, need: "Confirm seat and send details" })
    expect(data.classes[0]?.registrations[0]).not.toHaveProperty("idFilePath")
    expect(JSON.stringify(data)).not.toContain("PRIVATE-CODE")
    expect(data.refundsEnabled).toBe(true)
  })

  it("treats an open class whose sessions have passed as Past", async () => {
    const past = {
      ...classRow,
      id: "00000000-0000-4000-8000-000000000020",
      sessions: [{ date: "2026-11-01", start: "09:00", end: "17:00", label: "Session 1" }],
    }
    const data = await loadAdminTraining(
      trainingDb([past], []),
      { now: new Date("2026-11-18T15:00:00.000Z"), stripeMode: "not_configured", refundsEnabled: false },
    )

    expect(data.classes[0]?.group).toBe("past")
    expect(data.refundsEnabled).toBe(false)
  })
})
