/**
 * The review ASK, not review DISPLAY. We never fabricate ratings or testimonials;
 * we build the mechanism to request a real review at the one honest moment — when
 * a case is licensed. The link is a Google Business Profile short URL set via
 * `NEXT_PUBLIC_REVIEW_URL`, so this stays silent until the profile actually
 * exists. No AggregateRating schema is ever emitted from this.
 *
 * NEXT_PUBLIC_ so both the license-issued email (server) and the portal
 * license screen (client) read the same value.
 */
export function reviewUrl(): string | null {
  const u = process.env.NEXT_PUBLIC_REVIEW_URL
  return u && u.startsWith("https://") ? u : null
}
