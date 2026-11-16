import { RequestCallButton } from "@/components/portal/concierge/request-call-button"
import { BookCallModal } from "@/components/portal/concierge/book-call-modal"
import type { IntroCallState } from "@/lib/concierge/onboarding"

export interface BookCallCopy {
  title: string
  description: string
  chooseTime: string
  modalTitle: string
  modalDescription: string
  scheduledToast: string
  frameTitle: string
  trouble: string
  openNewTab: string
  request: string
  sending: string
  requestReceived: string
}

const DEFAULT_COPY: BookCallCopy = {
  title: "Book your 30-minute intro call",
  description: "Nothing to prepare — we'll walk through your case and answer anything.",
  chooseTime: "Request my intro call",
  modalTitle: "Book your intro call",
  modalDescription: "Pick a time for your 30-minute concierge intro call.",
  scheduledToast: "Your intro call is booked — we'll confirm the details shortly.",
  frameTitle: "Schedule your concierge intro call",
  trouble: "Having trouble?",
  openNewTab: "Open in a new tab",
  request: "Request my intro call",
  sending: "Sending…",
  requestReceived: "Request received — we'll reach out to lock in a time.",
}

/** Build the embed URL: opaque token (must survive for the webhook to match),
 *  no duplicate Calendly header, no GDPR banner. The single place these are built. */
function embedUrl(base: string, token: string): string {
  const sep = base.includes("?") ? "&" : "?"
  return `${base}${sep}utm_content=${encodeURIComponent(token)}&hide_event_type_details=1&hide_gdpr_banner=1`
}

/**
 * CONCIERGE Phase 2 — book the intro call. A COMPACT card: nothing loads until the
 * applicant clicks "Choose a time", which opens the scheduler in a modal (see
 * BookCallModal). Provider is behind an env var so a native scheduler can replace
 * Calendly later without touching this surface:
 *  • CALENDLY_CONCIERGE_URL set → the modal scheduler (the webhook fills the booking).
 *  • unset (default) → the "request a call" fallback, which always works.
 *
 * A BOOKED call is NOT rendered here — it folds into the control tower as a
 * milestone line (see app/portal/concierge/page.tsx), so a one-time step stops
 * taking prime space once it's done.
 */
export function BookCall({
  calendlyUrl,
  introToken,
  introCall,
  embedded = false,
  copy = DEFAULT_COPY,
}: {
  calendlyUrl: string | null
  /** Opaque per-case token passed to Calendly (never the internal case id). */
  introToken: string
  introCall: IntroCallState | null
  embedded?: boolean
  copy?: BookCallCopy
}) {
  // Defensive: the booked state lives in the control tower now, not here.
  if (introCall?.scheduledAt) return null

  const content = (
    <>
      <h2 className="portal-title-font text-[25px] font-medium tracking-tight">{copy.title}</h2>
      <p className="mt-1 max-w-prose text-sm text-text-mid">{copy.description}</p>

      <div className="concierge-book-call-control mt-4">
        {calendlyUrl ? (
          <BookCallModal url={embedUrl(calendlyUrl, introToken)} copy={copy} />
        ) : (
          <RequestCallButton alreadyRequested={introCall?.status === "requested"} copy={copy} />
        )}
      </div>
    </>
  )

  if (embedded) return content

  return <div className="rounded-lg border bg-card p-5">{content}</div>
}
