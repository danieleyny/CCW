/**
 * What the applicant's sponsor page should do with its sponsorship query result.
 * Pure so the P0-1 invariant is unit-tested: a query ERROR must NEVER be treated as
 * "no sponsorship" and bounce the applicant home — that silent redirect is exactly
 * what made the consent screen unreachable in production. An error surfaces a card;
 * only a clean, genuinely empty result redirects.
 */
export type SponsorPageOutcome = "error" | "redirect" | "render"

export function decideSponsorPage(input: { hasError: boolean; rowCount: number }): SponsorPageOutcome {
  if (input.hasError) return "error"
  if (input.rowCount === 0) return "redirect"
  return "render"
}
