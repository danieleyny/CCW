import { CalendarCheck2, Video } from "lucide-react"
import { formatDateTime } from "@/lib/format"
import { RequestCallButton } from "@/components/portal/concierge/request-call-button"
import type { IntroCallState } from "@/lib/concierge/onboarding"

/**
 * CONCIERGE Phase 2 — book the intro call. Provider is behind an env var so a
 * native scheduler can replace Calendly later without touching this surface:
 *  • CALENDLY_CONCIERGE_URL set → embed Calendly (the webhook fills the booking).
 *  • unset (default) → the "request a call" fallback, which always works.
 * A confirmed booking (from the webhook) takes over the card entirely.
 */
export function BookCall({
  calendlyUrl,
  introToken,
  introCall,
}: {
  calendlyUrl: string | null
  /** Opaque per-case token passed to Calendly (never the internal case id). */
  introToken: string
  introCall: IntroCallState | null
}) {
  // Booked + timed → show the confirmed call, nothing to do.
  if (introCall?.scheduledAt) {
    return (
      <div className="rounded-lg border border-ok/30 bg-ok/8 p-5">
        <div className="flex items-center gap-2 text-ok">
          <CalendarCheck2 className="size-5" />
          <h2 className="text-lg font-semibold tracking-tight">Your intro call is booked</h2>
        </div>
        <p className="mt-2 text-sm text-text-mid">{formatDateTime(introCall.scheduledAt)}</p>
        {introCall.joinUrl && (
          <a
            href={introCall.joinUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-3 inline-flex min-h-[44px] items-center gap-2 rounded-md border border-ok/40 px-4 text-sm font-medium text-ok transition-colors hover:bg-ok/10"
          >
            <Video className="size-4" /> Join link
          </a>
        )}
      </div>
    )
  }

  return (
    <div className="rounded-lg border bg-card p-5">
      <h2 className="text-lg font-semibold tracking-tight">Book your intro call</h2>
      <p className="mt-1 max-w-prose text-sm text-text-mid">
        A quick call with your concierge to walk through your case, answer questions, and set the plan.
        Fifteen minutes — no prep needed.
      </p>

      <div className="mt-4">
        {calendlyUrl ? (
          <iframe
            title="Schedule your concierge intro call"
            src={`${calendlyUrl}${calendlyUrl.includes("?") ? "&" : "?"}utm_content=${encodeURIComponent(
              introToken
            )}&hide_gdpr_banner=1`}
            className="h-[640px] w-full rounded-md border border-hairline"
            loading="lazy"
          />
        ) : (
          <RequestCallButton alreadyRequested={introCall?.status === "requested"} />
        )}
      </div>
    </div>
  )
}
