/**
 * Attorney intake — the privacy + no-pipeline guarantees, updated for Ethan Brecher's
 * written answers (Sept 2026).
 *
 * The model now: his phone + email are PUBLIC (he asked for them displayed), but ONLY in
 * the advertising footer — every other route to him still goes through the screened
 * consultation form. And the request goes DIRECTLY to him: no Formspree, no copy to our
 * inbox (privilege), and it FAILS CLOSED if it can't be sent. Still no pipeline rows.
 */
import { afterEach, describe, expect, it, vi } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { PARTNERS, partnerBySlug } from "@/config/partners"
import { attorneyProfileSchema } from "@/components/marketing/json-ld"
import { PartnerAdvertisingFooter } from "@/components/marketing/partner-advertising-footer"
import {
  consultationSchema,
  CONSULTATION_TOPICS,
  CONSULTATION_STAGES,
  DISCUSS_MIN,
  DISCUSS_MAX,
  ACK_VALUE,
} from "@/lib/partners/consultation"

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

describe("attorney contact — tel:/mailto: live ONLY in the advertising footer", () => {
  it("the advertising footer emits real tel: and mailto: links", () => {
    const ethan = partnerBySlug("ethanbrecher")!
    const html = renderToStaticMarkup(createElement(PartnerAdvertisingFooter, { partner: ethan }))
    expect(html).toContain("tel:")
    expect(html).toContain(`mailto:${ethan.email}`)
    expect(html).toContain(ethan.advertisingDisclaimer)
  })

  it("no OTHER public partner surface emits tel: or mailto:", () => {
    const OTHERS = [
      "components/marketing/partner-card.tsx",
      "components/marketing/partner-profile.tsx",
      "components/marketing/consultation-form.tsx",
      "app/(marketing)/partners/page.tsx",
      "app/(marketing)/partners/[slug]/page.tsx",
      "app/(marketing)/ethanbrecher/page.tsx",
      "app/(marketing)/ethanbrecher/consultation/page.tsx",
    ]
    const hits: string[] = []
    for (const rel of OTHERS) {
      const src = read(rel)
      if (/tel:/.test(src)) hits.push(`${rel}: tel:`)
      if (/mailto:/.test(src)) hits.push(`${rel}: mailto:`)
    }
    expect(hits, `Only the advertising footer may link the attorney directly:\n${hits.join("\n")}`).toEqual([])
  })

  it("the advertising footer renders on both of his routes", () => {
    for (const rel of [
      "app/(marketing)/ethanbrecher/page.tsx",
      "app/(marketing)/ethanbrecher/consultation/page.tsx",
    ]) {
      // The profile route renders the footer via <PartnerProfile>; the consultation route
      // renders it directly. Both reach it — assert the wiring is present.
      const src = read(rel)
      expect(src.includes("PartnerAdvertisingFooter") || src.includes("PartnerProfile")).toBe(true)
    }
    // And the profile body itself renders the footer.
    expect(read("components/marketing/partner-profile.tsx")).toContain("PartnerAdvertisingFooter")
  })
})

describe("attorney JSON-LD now carries his public phone + email", () => {
  it("emits the office phone and email he asked to display", () => {
    const p = partnerBySlug("ethanbrecher")!
    const json = JSON.stringify(attorneyProfileSchema(p))
    expect(json).toContain(p.phone)
    expect(json).toContain(p.email)
  })
})

describe("every non-hidden partner has an advertising disclaimer", () => {
  it("advertisingDisclaimer is non-empty", () => {
    for (const p of PARTNERS.filter((x) => x.visibility !== "hidden")) {
      expect(p.advertisingDisclaimer.trim().length, `${p.slug} missing advertisingDisclaimer`).toBeGreaterThan(0)
    }
  })
})

describe("consultation action — direct to the attorney, no copy to us", () => {
  it("does not import or call Formspree, never references the brand inbox, sends only to the partner", () => {
    const src = read("app/(marketing)/consultation-actions.ts")
    expect(src).not.toContain("notifyFormspree")
    expect(src).not.toContain("brand.contact.email")
    expect(src).toContain("to: partner.email")
  })

  it("creates no pipeline rows (no admin client, no case tables)", () => {
    const src = read("app/(marketing)/consultation-actions.ts")
    for (const banned of ["createAdminClient", "materializeCaseRequirements", '"clients"', '"cases"', '"tasks"', '"appointments"', '"activity_log"']) {
      expect(src, `consultation action must not reference ${banned}`).not.toContain(banned)
    }
  })
})

// Behavioral: the action FAILS CLOSED. Mock its side-effecting deps so we can drive it.
const sendEmailMock = vi.fn()
vi.mock("next/headers", () => ({ headers: async () => new Headers() }))
vi.mock("@/lib/rate-limit", () => ({ rateLimit: () => true, clientIpFrom: () => "test-ip" }))
vi.mock("@/lib/honeypot", () => ({ honeypotTripped: () => false }))
vi.mock("@/lib/email", () => ({ sendEmail: (...args: unknown[]) => sendEmailMock(...args) }))
vi.mock("@/lib/email/template", () => ({ renderEmail: () => ({ html: "<p>x</p>", text: "x" }) }))

function validForm(): FormData {
  const fd = new FormData()
  const fields: Record<string, string> = {
    name: "Jane Q. Public",
    email: "jane@example.com",
    phone: "212-555-0100",
    bestTimes: "",
    topic: CONSULTATION_TOPICS[0],
    stage: CONSULTATION_STAGES[0],
    targetDate: "",
    discuss: "My application was denied last month and I need to understand my options in detail.",
    represented: "no",
    acknowledge: ACK_VALUE,
    partnerSlug: "ethanbrecher",
  }
  for (const [k, v] of Object.entries(fields)) fd.set(k, v)
  return fd
}

describe("consultation action fails closed", () => {
  afterEach(() => sendEmailMock.mockReset())

  it("returns ok when the email is actually sent", async () => {
    sendEmailMock.mockResolvedValue({ skipped: false, id: "abc" })
    const { requestConsultation } = await import("@/app/(marketing)/consultation-actions")
    const res = await requestConsultation({}, validForm())
    expect(res.ok).toBe(true)
    // The one recipient is the attorney, not our inbox.
    expect(sendEmailMock).toHaveBeenCalledWith(expect.objectContaining({ to: partnerBySlug("ethanbrecher")!.email }))
  })

  it("returns an error (never ok) when the email is skipped", async () => {
    sendEmailMock.mockResolvedValue({ skipped: true })
    const { requestConsultation } = await import("@/app/(marketing)/consultation-actions")
    const res = await requestConsultation({}, validForm())
    expect(res.ok).toBeUndefined()
    expect(res.error).toContain(partnerBySlug("ethanbrecher")!.email)
  })

  it("returns an error (never ok) when the email errors", async () => {
    sendEmailMock.mockResolvedValue({ skipped: false, error: { message: "boom" } })
    const { requestConsultation } = await import("@/app/(marketing)/consultation-actions")
    const res = await requestConsultation({}, validForm())
    expect(res.ok).toBeUndefined()
    expect(res.error).toBeTruthy()
  })
})

describe("consultation schema", () => {
  const valid = {
    name: "Jane Q. Public",
    email: "jane@example.com",
    phone: "212-555-0100",
    bestTimes: "weekday mornings",
    topic: CONSULTATION_TOPICS[0],
    stage: CONSULTATION_STAGES[0],
    targetDate: "",
    discuss: "My application was denied last month and I need to understand my options.",
    represented: "no",
    acknowledge: ACK_VALUE,
    partnerSlug: "ethanbrecher",
  }

  it("accepts a complete, valid request", () => {
    expect(consultationSchema.safeParse(valid).success).toBe(true)
  })

  it(`requires a description of at least ${DISCUSS_MIN} characters`, () => {
    expect(consultationSchema.safeParse({ ...valid, discuss: "denied, help" }).success).toBe(false)
  })

  it(`rejects a description longer than ${DISCUSS_MAX} characters`, () => {
    expect(consultationSchema.safeParse({ ...valid, discuss: "a".repeat(DISCUSS_MAX + 1) }).success).toBe(false)
  })
})
