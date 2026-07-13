"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Scale, CheckCircle2 } from "lucide-react"
import { requestAttorneyReferral } from "@/app/portal/appeal/actions"
import { Button } from "@/components/ui/button"

export function AppealReferralButton() {
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  if (done) {
    return (
      <p className="flex items-center gap-1.5 rounded-md border border-ok/30 bg-ok/8 p-3 text-sm text-ok">
        <CheckCircle2 className="size-4" /> Referral requested — we&apos;ll connect you with a NY-licensed
        firearms attorney and hand over your complete record.
      </p>
    )
  }
  return (
    <Button
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await requestAttorneyReferral()
          if (res.error) toast.error(res.error)
          else setDone(true)
        })
      }
    >
      <Scale className="size-4" /> Request an attorney referral
    </Button>
  )
}
