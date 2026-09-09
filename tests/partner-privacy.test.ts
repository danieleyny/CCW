/**
 * Attorney intake — the privacy + no-pipeline guarantees.
 *
 * The rule (ATTORNEY_INTAKE_FORM_PROMPT): the attorney's direct phone and email must
 * NEVER appear in public marketing output — every route to him goes through the screened
 * consultation form we own. His phone/email stay in config for staff use only. And a
 * legal enquiry is NOT a sales lead: the request must create no client/case/task/
 * appointment row — Formspree notification only.
 */
import { describe, expect, it } from "vitest"
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PARTNERS, partnerBySlug } from "@/config/partners"
import { attorneyProfileSchema } from "@/components/marketing/json-ld"
import { submissionLabel } from "@/lib/formspree"
import {
  consultationSchema,
  toFieldErrors,
  CONSULTATION_TOPICS,
  CONSULTATION_STAGES,
  DISCUSS_MIN,
  ACK_VALUE,
} from "@/lib/partners/consultation"

const root = process.cwd()
const read = (rel: string) => readFileSync(join(root, rel), "utf8")

// Every PUBLIC-FACING partner render surface. None may dial or mail the attorney or read
// his phone/email — those paths are what put his direct line into the rendered HTML.
const PUBLIC_SURFACES = [
  "components/marketing/partner-card.tsx",
  "components/marketing/partner-profile.tsx",
  "components/marketing/consultation-form.tsx",
  "app/(marketing)/partners/page.tsx",
  "app/(marketing)/partners/[slug]/page.tsx",
  "app/(marketing)/ethanbrecher/page.tsx",
  "app/(marketing)/ethanbrecher/consultation/page.tsx",
]

describe("attorney privacy — no direct line in public output", () => {
  it("no public partner surface emits tel:, mailto:, or reads .phone/.email", () => {
    const hits: string[] = []
    for (const rel of PUBLIC_SURFACES) {
      const src = read(rel)
      for (const [name, re] of [
        ["tel: link", /tel:/],
        ["mailto: link", /mailto:/],
        ["partner .phone", /\.phone\b/],
        ["partner .email", /\.email\b/],
      ] as const) {
        if (re.test(src)) hits.push(`${rel}: ${name}`)
      }
    }
    expect(hits, `A public surface exposes the attorney's direct line:\n${hits.join("\n")}`).toEqual([])
  })

  it("the attorney JSON-LD carries neither his phone nor his email", () => {
    for (const p of PARTNERS) {
      const json = JSON.stringify(attorneyProfileSchema(p))
      expect(json, `${p.slug} JSON-LD leaks phone`).not.toContain(p.phone)
      expect(json, `${p.slug} JSON-LD leaks email`).not.toContain(p.email)
    }
  })

  it("keeps phone + email in config for staff (they are not removed, only hidden)", () => {
    const ethan = partnerBySlug("ethanbrecher")
    expect(ethan?.phone).toBeTruthy()
    expect(ethan?.email).toBeTruthy()
  })
})

describe("attorney consultation — not a sales lead", () => {
  it("the action creates no pipeline rows (no admin client, no case tables)", () => {
    const src = read("app/(marketing)/consultation-actions.ts")
    for (const banned of ["createAdminClient", "materializeCaseRequirements", '"clients"', '"cases"', '"tasks"', '"appointments"', '"activity_log"']) {
      expect(src, `consultation action must not reference ${banned}`).not.toContain(banned)
    }
    // It DOES notify Formspree with the dedicated source.
    expect(src).toContain("attorney_consultation")
    expect(src).toContain("notifyFormspree")
  })

  it("Formspree labels the request clearly", () => {
    expect(submissionLabel("attorney_consultation")).toBe("Attorney consultation request")
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

  it("requires the acknowledgement and the conflicts answer", () => {
    const noAck = consultationSchema.safeParse({ ...valid, acknowledge: "" })
    expect(noAck.success).toBe(false)
    if (!noAck.success) expect(toFieldErrors(noAck.error)).toHaveProperty("acknowledge")

    const noRep = consultationSchema.safeParse({ ...valid, represented: "" })
    expect(noRep.success).toBe(false)
    if (!noRep.success) expect(toFieldErrors(noRep.error)).toHaveProperty("represented")
  })

  it(`requires a description of at least ${DISCUSS_MIN} characters`, () => {
    const short = consultationSchema.safeParse({ ...valid, discuss: "denied, help" })
    expect(short.success).toBe(false)
    if (!short.success) expect(toFieldErrors(short.error)).toHaveProperty("discuss")
  })
})
