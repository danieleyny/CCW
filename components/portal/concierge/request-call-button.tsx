"use client"

import { useState, useTransition } from "react"
import { CalendarClock, Check, Loader2 } from "lucide-react"
import { requestIntroCall } from "@/app/portal/concierge/actions"
import { Button } from "@/components/ui/button"
import type { BookCallCopy } from "@/components/portal/concierge/book-call"

/**
 * CONCIERGE Phase 2 — the Calendly-off fallback (the default). One tap records
 * the request and opens a staff task; the applicant is never dead-ended waiting
 * on an embed that isn't configured yet.
 */
export function RequestCallButton({ alreadyRequested, copy }: { alreadyRequested: boolean; copy: BookCallCopy }) {
  const [done, setDone] = useState(alreadyRequested)
  const [pending, start] = useTransition()
  const [error, setError] = useState<string | null>(null)

  if (done) {
    return (
      <p className="flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/8 p-3 text-sm text-ok">
        <Check className="size-4 shrink-0" /> {copy.requestReceived}
      </p>
    )
  }

  return (
    <div className="space-y-2">
      <Button
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null)
            const r = await requestIntroCall()
            if (r.error) setError(r.error)
            else setDone(true)
          })
        }
      >
        {pending ? (
          <>
            <Loader2 className="mr-1.5 size-4 animate-spin" /> {copy.sending}
          </>
        ) : (
          <>
            <CalendarClock className="mr-1.5 size-4" /> {copy.request}
          </>
        )}
      </Button>
      {error && (
        <p className="text-xs text-danger" role="alert">
          {error}
        </p>
      )}
    </div>
  )
}
