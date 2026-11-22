import { createElement } from "react"
import { renderToStaticMarkup } from "react-dom/server"
import { describe, expect, it } from "vitest"
import HeroHeadline from "@/components/marketing/hero/HeroHeadline"
import { ID, attorneyProfileSchema, organizationSchema } from "@/components/marketing/json-ld"
import {
  partnerBySlug,
  partnershipStatement,
  publishedPartners,
} from "@/config/partners"
import {
  filterEligiblePublicInstructors,
  isPublicInstructorSlugEligible,
  retiredPublicInstructorExclusionCount,
} from "@/lib/instructors/public"
import { MARKETING_ROUTES } from "@/lib/marketing-routes"
import robots from "@/app/robots"
import { buildMetadata } from "@/lib/seo"

describe("confirmed public partnership", () => {
  it("publishes the approved partner and one canonical relationship sentence", () => {
    const partner = partnerBySlug("ethanbrecher")
    expect(partner).not.toBeNull()
    expect(partner!.visibility).toBe("public")
    expect(publishedPartners()).toContainEqual(partner)
    expect(partnershipStatement(partner!)).toBe(
      "Gun License NYC partners with Ethan A. Brecher of the Law Office of Ethan A. Brecher, LLC."
    )
    expect(MARKETING_ROUTES.some((route) => route.path === "/partners")).toBe(true)
  })

  it("keeps the attorney and firm distinct from the Gun License NYC organization", () => {
    const partner = partnerBySlug("ethanbrecher")!
    const graph = attorneyProfileSchema(partner)["@graph"]
    const person = graph.find((node) => node["@type"] === "Person")!
    const firm = graph.find((node) => node["@type"] === "LegalService")!

    expect(person["@id"]).not.toBe(firm["@id"])
    expect(person.worksFor).toEqual({ "@id": firm["@id"] })
    expect(person.worksFor).not.toEqual({ "@id": ID.organization })
  })
})

describe("machine-readable identity", () => {
  it("preserves the stable organization ID without an unconfirmed legal name", () => {
    expect(organizationSchema["@id"]).toBe("https://gunlicensenyc.com/#organization")
    expect(organizationSchema).not.toHaveProperty("legalName")
  })

  it("keeps current search and user-directed crawler roles on the public policy", () => {
    const rules = robots().rules
    expect(Array.isArray(rules)).toBe(true)
    const userAgents = (rules as Array<{ userAgent: string }>).map((rule) => rule.userAgent)
    expect(userAgents).toContain("OAI-SearchBot")
    expect(userAgents).toContain("Claude-SearchBot")
    expect(userAgents).toContain("Claude-User")
  })

  it("keeps preview deployments noindex and fully disallowed", () => {
    const previous = process.env.VERCEL_ENV
    process.env.VERCEL_ENV = "preview"
    try {
      expect(robots().rules).toEqual({ userAgent: "*", disallow: "/" })
      const metadata = buildMetadata({
        title: "Preview test",
        description: "Preview deployments remain unavailable to search engines.",
        path: "/preview-test",
      })
      expect(metadata.robots).toEqual({ index: false, follow: false })
    } finally {
      if (previous === undefined) delete process.env.VERCEL_ENV
      else process.env.VERCEL_ENV = previous
    }
  })
})

describe("public instructor publication guard", () => {
  it("uses one exact exclusion without broad name or slug-pattern filtering", () => {
    const fictitious = [
      { slug: "partner22-fictitious", name: "Taylor Example" },
      { slug: "neutral-demo-instructor", name: "Morgan Example" },
    ]

    expect(retiredPublicInstructorExclusionCount()).toBe(1)
    expect(isPublicInstructorSlugEligible(fictitious[0].slug)).toBe(true)
    expect(filterEligiblePublicInstructors(fictitious)).toEqual(fictitious)
  })
})

describe("homepage semantic copy", () => {
  it("renders the animated hero phrase once in DOM text", () => {
    const html = renderToStaticMarkup(createElement(HeroHeadline))
    const text = html.replace(/<[^>]+>/g, "")
    expect(text.match(/Clear by ours\./g)).toHaveLength(1)
    expect(html).toContain('data-text="Clear by ours."')
  })
})
