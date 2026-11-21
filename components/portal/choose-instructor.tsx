"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import { chooseInstructor } from "@/app/portal/marketplace/actions"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"
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
  const router = useRouter()
  const { messages } = usePortalI18n()
  const copy = messages.marketplace
  const [pending, startTransition] = useTransition()
  const firstName = instructorName.trim().split(/\s+/)[0] || instructorName

  function choose() {
    if (!confirm(interpolate(copy.chooseConfirm, { name: instructorName }))) {
      return
    }
    startTransition(async () => {
      const fd = new FormData()
      fd.set("offerId", offerId)
      fd.set("instructorId", instructorId)
      const res = await chooseInstructor(fd)
      if (res.error) toast.error(res.error)
      else {
        toast.success(interpolate(copy.chosenToast, { name: instructorName }))
        router.refresh()
      }
    })
  }

  return (
    <Button onClick={choose} disabled={pending}>
      {pending ? copy.choosing : interpolate(copy.chooseName, { name: firstName })}
    </Button>
  )
}
