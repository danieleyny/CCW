"use client"

import { useState, useTransition } from "react"
import Link from "next/link"
import { HeartHandshake, Check } from "lucide-react"
import { toast } from "sonner"
import { requestTrainingInstructor, requestDmvHelp } from "@/app/portal/requirements/actions"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Button } from "@/components/ui/button"

/**
 * "Find me an instructor" (TRN-01) and "Request help" (DMV-01, concierge only). Both
 * open a request to the case team — email + activity log — and confirm without
 * navigating away, so the applicant can still upload. The button is SECONDARY: an
 * outline in the signal tone, never brass (brass means "your turn").
 */
export function RequestHelpButton({ kind }: { kind: "training" | "dmv" }) {
  const [pending, start] = useTransition()
  const [sent, setSent] = useState(false)
  const [modal, setModal] = useState(false)

  const label = kind === "training" ? "Find me an instructor" : "Request help"

  const go = () =>
    start(async () => {
      const r = kind === "training" ? await requestTrainingInstructor() : await requestDmvHelp()
      if (r.error) {
        toast.error(r.error)
        return
      }
      setSent(true)
      if (kind === "training") setModal(true)
      else toast.success("Your case team will reach out to walk you through it.")
    })

  return (
    <div className="mt-3 flex flex-wrap items-center gap-3">
      <Button
        size="sm"
        variant="outline"
        className="border-signal/50 text-signal hover:bg-signal/10"
        disabled={pending || sent}
        onClick={go}
      >
        {sent ? <Check className="mr-1.5 size-3.5" /> : <HeartHandshake className="mr-1.5 size-3.5" />}
        {sent ? "Request sent" : label}
      </Button>
      {kind === "training" && (
        <Link href="/instructors" className="text-xs text-text-mid underline underline-offset-2 hover:text-foreground">
          or browse instructors yourself
        </Link>
      )}

      {kind === "training" && (
        <Dialog open={modal} onOpenChange={setModal}>
          <DialogContent className="dark max-w-md">
            <DialogHeader>
              <DialogTitle>Request sent</DialogTitle>
            </DialogHeader>
            <p className="text-sm text-text-mid">
              We&apos;ll reach out within the next few days to connect you with a DCJS-approved instructor.
            </p>
            <div className="mt-2 flex justify-end">
              <Button size="sm" onClick={() => setModal(false)}>
                Got it
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      )}
    </div>
  )
}
