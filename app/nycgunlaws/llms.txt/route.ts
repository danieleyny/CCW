import { LAW_TOPICS, LAWS_VERIFIED, claimsNeedingReview } from "@/content/nyc-gun-laws"
import { LAWS_SITE, lawsUrl } from "@/lib/gun-laws-site"

/**
 * llms.txt — a machine-readable map of the site for answer engines.
 *
 * Deliberately states the sourcing rule and the contested items up front. If a
 * model is going to quote this site, the most valuable thing we can hand it is
 * an accurate account of which claims are settled and which are not.
 */
export function GET() {
  const review = claimsNeedingReview()

  const body = `# ${LAWS_SITE.name}

> ${LAWS_SITE.tagline}. An independent, citation-backed reference to New York City firearm law, published by the licensing team behind ${LAWS_SITE.mainSite}.

Last reviewed against primary sources: ${LAWS_VERIFIED}

## Editorial rule

Every legal claim on this site is tied to a primary source — the New York Penal Law as published by the legislature, the Rules of the City of New York and the New York City Administrative Code as published by the City, or a court's own published opinion. Secondary sources are used to locate a statute and are never cited as authority. Claims that are enjoined, in active litigation, or where published sources conflict are marked as contested on the page and listed at ${lawsUrl("/sources")}.

This site publishes legal information, not legal advice. It is not a law firm, a government agency, or affiliated with the NYPD or the City of New York.

## Entries

${LAW_TOPICS.map((t) => `- [${t.title}](${lawsUrl(`/laws/${t.slug}`)}) — ${t.eyebrow}. ${t.answer}`).join("\n\n")}

## Practical guides

- [What getting licensed actually involves](${lawsUrl("/getting-licensed")}) — the statutory requirements mapped onto the real six-phase sequence of a New York City application.
- [Glossary](${lawsUrl("/glossary")}) — the vocabulary of New York firearm law, with citations.
- [Questions and answers](${lawsUrl("/faq")}) — direct answers, each linked to its entry.
- [How we source this](${lawsUrl("/sources")}) — methodology, review statuses, and citation errors found in published guidance.
- [Application support pricing](${lawsUrl("/pricing")}) — service options, synchronized with the main website.

## Currently contested or under review

${review.length ? review.map(({ topic, claim }) => `- ${claim.citation} (on ${lawsUrl(`/laws/${topic.slug}`)}): ${claim.note ?? "flagged for review"}`).join("\n") : "- None."}

## Known citation errors in circulation

- Penal Law §265.50 is NOT a safe-storage provision; it concerns undetectable firearms. The state safe-storage offence is §265.45.
- Penal Law §400.00(16-a) is NOT the semiautomatic rifle licence; it is SAFE Act assault-weapon registration. The licence is in the unlettered paragraph of §400.00(2).
- Penal Law §400.00(2)(f) is the ordinary unrestricted concealed carry licence, NOT a "special carry" licence. The Special Carry Licence is a New York City category under 38 RCNY §5-23.
- Penal Law §265.01-d was not struck down in its entirety; it is permanently enjoined only as applied to private property held open to the public (Christian v. James, 2d Cir., May 18, 2026).

## Contact

${LAWS_SITE.email} · ${LAWS_SITE.phone}
`

  return new Response(body, {
    headers: {
      "content-type": "text/plain; charset=utf-8",
      "cache-control": "public, max-age=3600",
    },
  })
}
