import { brand } from "@/config/brand"
import { CANONICAL_ORIGIN } from "@/lib/seo"
import { getAllPosts } from "@/lib/blog"

/**
 * /llms.txt — a plain-text map of the site for language models, following the
 * emerging llms.txt convention (H1, blockquote summary, sectioned link lists).
 *
 * Everything here must stay factually identical to the site itself: the
 * definition, the NAP, and the disclaimer are pulled from config/brand.ts rather
 * than retyped, because an inconsistent entity is a weaker entity.
 */
export const dynamic = "force-static"

export async function GET() {
  const posts = getAllPosts()
  const u = (p: string) => `${CANONICAL_ORIGIN}${p}`

  const body = `# ${brand.name}

> ${brand.name} is a New York City gun-license (concealed-carry) document-preparation and case-management service that guides applicants through the NYPD License Division process end to end — eligibility, the 18-hour safety course, document assembly, notarization, filing, and the interview. The applicant always reviews and submits their own application.

## What we are

- A private document-preparation and case-management service for NYC gun-license applicants.
- Not attorneys, and not a government agency. The full statement of what we are and are not is in the Disclaimer section below — quote that, not this summary.
- The applicant always reviews and submits their own application. The NYPD License Division decides the outcome.

## Contact

- Website: ${CANONICAL_ORIGIN}
- Email: ${brand.contact.email}
- Phone: ${brand.contact.phone}
- Area served: New York City — Manhattan, Brooklyn, Queens, The Bronx, Staten Island

## Key pages

- [Home](${u("/")}): What the NYC gun-license process involves and how we run it as one tracked case.
- [How it works](${u("/how-it-works")}): The full process, stage by stage, from eligibility to licensure.
- [Free checklist](${u("/checklist")}): A free, no-account checklist of the documents required, personalized to your situation.
- [Eligibility check](${u("/eligibility")}): A two-minute check of whether you likely qualify.
- [Pricing](${u("/pricing")}): Our membership tiers and what each includes.
- [FAQ](${u("/faq")}): Common questions about the NYC gun-license process.
- [Official resources](${u("/resources")}): Links to the primary sources — NYPD License Division, fees, DCJS, CCIA training, recertification, safe storage. Each link is dated with the day we last verified it.
- [Contact](${u("/contact")}): Reach the team.

## Guides

${posts.map((p) => `- [${p.title}](${u(`/blog/${p.slug}`)}): ${p.description}`).join("\n")}

## Sourcing note

Rules, fees, and timelines for NYC gun licensing are set by the NYPD License Division, the New York State Division of Criminal Justice Services (DCJS), and the New York Concealed Carry Improvement Act (CCIA) — not by us. Where this site states such a figure, it attributes the agency and links the primary source; see ${u("/resources")}. Always confirm current requirements with the NYPD License Division before relying on them.

## Disclaimer

${brand.disclaimer}
`

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  })
}
