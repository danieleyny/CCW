import { CalendarClock } from "lucide-react"
import { Button } from "@/components/ui/button"
import type { BookCallCopy } from "@/components/portal/concierge/book-call"

/**
 * Open Calendly as a top-level page instead of inside a third-party iframe.
 * Mobile privacy protections and Calendly's session security can reject an
 * embedded checkout even when the invitee is legitimate. A normal link keeps
 * the booking flow first-party to Calendly while preserving our case token.
 */
export function BookCallLink({ url, copy }: { url: string; copy: BookCallCopy }) {
  return (
    <Button asChild className="min-h-[44px]">
      <a href={url} target="_blank" rel="noopener noreferrer">
        <CalendarClock className="size-4" aria-hidden />
        {copy.chooseTime}
        <span className="sr-only"> ({copy.openNewTab})</span>
      </a>
    </Button>
  )
}
