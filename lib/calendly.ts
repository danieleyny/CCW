/**
 * Build the top-level Calendly URL used by the client portal.
 *
 * `utm_content` is the opaque per-case token consumed by our webhook. Remove
 * iframe-only presentation parameters so the invitee gets Calendly's normal,
 * first-party booking page instead of an embedded session.
 */
export function buildCalendlyBookingUrl(baseUrl: string, caseToken: string): string {
  const url = new URL(baseUrl)

  url.searchParams.delete("embed_domain")
  url.searchParams.delete("embed_type")
  url.searchParams.delete("hide_event_type_details")
  url.searchParams.delete("hide_landing_page_details")
  url.searchParams.delete("hide_gdpr_banner")
  url.searchParams.set("utm_content", caseToken)

  return url.toString()
}
