"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Handshake } from "lucide-react"
import { setReferralConsent } from "@/app/portal/actions"
import { Button } from "@/components/ui/button"

/**
 * The applicant's control over the referral channel. A company introduced them; this lets
 * them choose whether that company sees their PROGRESS STAGE — never their documents,
 * answers, or anything else. Default is private; sharing is explicit and revocable.
 */
export function ReferralConsentCard({ caseId, company, sharing }: { caseId: string; company: string; sharing: boolean }) {
  const [on, setOn] = useState(sharing)
  const [pending, start] = useTransition()

  function set(share: boolean) {
    start(async () => {
      const r = await setReferralConsent(caseId, share)
      if (r?.error) return void toast.error(r.error)
      setOn(share)
      toast.success(share ? "Shared — they'll see your stage only." : "Sharing off — your application is private again.")
    })
  }

  return (
    <div className="rounded-lg border border-hairline bg-card p-4">
      <div className="flex items-start gap-3">
        <Handshake className="mt-0.5 size-5 shrink-0 text-brass" />
        <div className="min-w-0 flex-1">
          <h3 className="text-sm font-semibold">Share your progress with {company}?</h3>
          <p className="mt-1 text-sm text-text-mid">
            {company} introduced you to us. This is your personal application, so it stays private by default.
            If you like, you can let them see <span className="font-medium">only your progress stage</span> —
            never your documents, your answers, or anything you disclosed. You can turn this off at any time.
          </p>
          <div className="mt-3 flex items-center gap-2">
            {on ? (
              <>
                <span className="rounded-full bg-ok/12 px-2 py-0.5 text-[11px] text-ok">Sharing your stage</span>
                <Button size="sm" variant="outline" disabled={pending} onClick={() => set(false)}>
                  Stop sharing
                </Button>
              </>
            ) : (
              <>
                <span className="rounded-full bg-surface-2 px-2 py-0.5 text-[11px] text-text-mid">Private</span>
                <Button size="sm" disabled={pending} onClick={() => set(true)}>
                  Share my stage
                </Button>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  )
}
