"use client"

import { useTransition } from "react"
import { FileDown, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { prepareSponsorForm } from "@/app/sponsor/actions"
import { Button } from "@/components/ui/button"

/** SPN-01: download the OFFICIAL company form pre-filled with what we hold. The
 *  company completes the officer/business fields + notarised signatures, then
 *  uploads the finished form. */
export function PrepareCompanyFormButton({ caseId }: { caseId: string }) {
  const [pending, start] = useTransition()
  return (
    <Button
      size="sm"
      variant="ghost"
      className="min-h-[36px]"
      disabled={pending}
      onClick={() =>
        start(async () => {
          const r = await prepareSponsorForm(caseId)
          if (r.error || !r.url) {
            toast.error(r.error ?? "Couldn't prepare the form.")
            return
          }
          window.open(r.url, "_blank", "noopener,noreferrer")
        })
      }
    >
      {pending ? <Loader2 className="size-3.5 animate-spin" /> : <FileDown className="size-3.5" />}
      <span className="ml-1">Pre-filled form</span>
    </Button>
  )
}
