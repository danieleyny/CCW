import { RequestCallButton } from "@/components/portal/concierge/request-call-button"
import { BookCallLink } from "@/components/portal/concierge/book-call-link"
import type { IntroCallState } from "@/lib/concierge/onboarding"
import { buildCalendlyBookingUrl } from "@/lib/calendly"

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

/**
 * CONCIERGE Phase 2 — book the intro call. Calendly opens as a top-level page so
 * its booking security is not constrained by a third-party iframe. Provider is
 * behind an env var so a native scheduler can replace Calendly later without
 * touching this surface:
 *  • CALENDLY_CONCIERGE_URL set → direct scheduler link (the webhook fills the booking).
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
          <BookCallLink url={buildCalendlyBookingUrl(calendlyUrl, introToken)} copy={copy} />
        ) : (
          <RequestCallButton alreadyRequested={introCall?.status === "requested"} copy={copy} />
        )}
      </div>
    </>
  )

  if (embedded) return content

  return <div className="rounded-lg border bg-card p-5">{content}</div>
}
