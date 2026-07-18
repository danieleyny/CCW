"use client"

import { useTransition } from "react"
import { toast } from "sonner"
import { chooseInstructor } from "@/app/portal/marketplace/actions"
import { Button } from "@/components/ui/button"

/** "Choose" button for an interested instructor — confirms, then binds them. */
export function ChooseButton({
  offerId,
  instructorId,
  instructorName,
}: {
  offerId: string
  instructorId: string
  instructorName: string
}) {
  const [pending, startTransition] = useTransition()

  function choose() {
    if (!confirm(`Choose ${instructorName} for your training? Other interested instructors will be released.`)) {
      return
    }
    startTransition(async () => {
      const fd = new FormData()
      fd.set("offerId", offerId)
      fd.set("instructorId", instructorId)
      const res = await chooseInstructor(fd)
      if (res.error) toast.error(res.error)
      else toast.success(`${instructorName} is now your instructor — you can message and schedule.`)
    })
  }

  return (
    <Button size="sm" onClick={choose} disabled={pending}>
      {pending ? "Choosing…" : "Choose this instructor"}
    </Button>
  )
}
