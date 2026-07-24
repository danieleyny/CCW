"use client"

import { useState, useTransition } from "react"
import { Send, CheckCircle2 } from "lucide-react"
import { sendReferenceNudge } from "@/app/r/nudge/actions"
import { Button } from "@/components/ui/button"

/**
 * The applicant lands here from the reminder email. The SEND happens on this
 * button click (a server action), never on page load — so an email client
 * prefetching the link can't silently email the reference.
 */
export function ReferenceNudge({ token, referenceName }: { token: string; referenceName: string }) {
  const [pending, start] = useTransition()
  const [done, setDone] = useState<{ emailed: boolean; hadEmail: boolean } | null>(null)
  const [error, setError] = useState<string | null>(null)

  if (done) {
    return (
      <div className="mt-6 rounded-lg border border-ok/30 bg-ok/10 p-4 text-sm text-ok">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-4" />
          {done.emailed
            ? `Reminder sent to ${referenceName}.`
            : done.hadEmail
              ? `${referenceName} was already reminded — their link is refreshed and ready.`
              : `${referenceName}'s link is refreshed, but there's no email on file to send it to. Add one from your portal, or share the link yourself.`}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6">
      <Button
        size="lg"
        disabled={pending}
        onClick={() =>
          start(async () => {
            setError(null)
            const r = await sendReferenceNudge(token)
            if (r.error) setError(r.error)
            else setDone({ emailed: !!r.emailed, hadEmail: !!r.hadEmail })
          })
        }
      >
        <Send className="mr-1.5 size-4" />
        {pending ? "Sending…" : `Send ${referenceName} a reminder`}
      </Button>
      {error && <p className="mt-3 text-sm text-danger">{error}</p>}
    </div>
  )
}
