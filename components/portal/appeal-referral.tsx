"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { CheckCircle2, Scale } from "lucide-react"
import { requestAttorneyReferral } from "@/app/portal/appeal/actions"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export function AppealReferralButton({
  label,
  pendingLabel,
  successMessage,
  urgent = false,
}: {
  label: string
  pendingLabel: string
  successMessage: string
  urgent?: boolean
}) {
  const [done, setDone] = useState(false)
  const [pending, start] = useTransition()

  if (done) {
    return (
      <p className="appeal-v2-referral-success" role="status">
        <CheckCircle2 aria-hidden="true" /> {successMessage}
      </p>
    )
  }

  return (
    <Button
      className={cn("appeal-v2-referral-button", urgent && "appeal-v2-referral-urgent")}
      disabled={pending}
      onClick={() =>
        start(async () => {
          const res = await requestAttorneyReferral()
          if (res.error) toast.error(res.error)
          else setDone(true)
        })
      }
    >
      <Scale aria-hidden="true" /> {pending ? pendingLabel : label}
    </Button>
  )
}
