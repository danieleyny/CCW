"use client"

import { useTransition } from "react"
import { FileText, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { prepareApplication } from "@/app/portal/requirements/actions"
import { Button } from "@/components/ui/button"

/**
 * Prepare the FULL NYPD application (PD 643-041) as a filled draft PDF from
 * everything we hold. The applicant reviews, signs, and files it themselves — we
 * never file. Warns if the five-year history overflowed the form's four rows.
 */
export function PrepareApplicationButton({ caseId }: { caseId: string }) {
  const [pending, start] = useTransition()
  return (
    <div className="rounded-lg border border-hairline bg-card p-4">
      <div className="flex items-center gap-2">
        <FileText className="size-4 text-brass" />
        <h3 className="text-sm font-semibold">Your NYPD application, prepared</h3>
      </div>
      <p className="mt-1 max-w-prose text-sm text-text-mid">
        We fill the official Handgun License Application (PD 643-041) from everything you&apos;ve given us.
        Review it, sign it, and file it yourself at the NYPD portal — the Social Security number and the
        handgun list are left for you to enter at filing.
      </p>
      <Button
        size="sm"
        className="mt-3 min-h-[40px]"
        disabled={pending}
        onClick={() =>
          start(async () => {
            const r = await prepareApplication(caseId)
            if (r.error || !r.url) {
              toast.error(r.error ?? "Couldn't prepare the application.")
              return
            }
            if (r.overflow) {
              toast.warning(
                "Your five-year history has more than four entries — the extra rows need a continuation sheet. Tell your case team."
              )
            }
            window.open(r.url, "_blank", "noopener,noreferrer")
          })
        }
      >
        {pending ? <Loader2 className="size-4 animate-spin" /> : <FileText className="size-4" />}
        Prepare my application (PDF)
      </Button>
    </div>
  )
}
