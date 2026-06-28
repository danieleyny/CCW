"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock } from "lucide-react"
import { toast } from "sonner"
import { createBooking } from "@/app/portal/marketplace/actions"
import { Button } from "@/components/ui/button"

const TYPE_LABEL: Record<string, string> = {
  combined_18h: "18-hour course",
  classroom_16h: "16-hour classroom",
  live_fire_2h: "2-hour range",
  consult: "Consultation",
}

export interface BookableSlot {
  id: string
  type: string
  starts_at: string
  instructorName: string
  locationLabel: string | null
}

export function SlotBooker({ slots }: { slots: BookableSlot[] }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()

  function book(slotId: string) {
    startTransition(async () => {
      const res = await createBooking(slotId)
      if (res.error) toast.error(res.error)
      else {
        toast.success("Requested — your instructor will confirm and send a calendar invite.")
        router.refresh()
      }
    })
  }

  if (slots.length === 0) {
    return <p className="text-sm text-text-mid">No open sessions right now. Check back soon.</p>
  }

  return (
    <ul className="space-y-2">
      {slots.map((s) => (
        <li key={s.id} className="flex items-center justify-between gap-3 rounded-lg border bg-card p-3 text-sm">
          <span className="flex items-center gap-2">
            <CalendarClock className="size-4 text-signal" />
            <span>{new Date(s.starts_at).toLocaleString("en-US", { dateStyle: "medium", timeStyle: "short" })}</span>
            <span className="text-text-low">· {TYPE_LABEL[s.type] ?? s.type}</span>
            {s.locationLabel && <span className="text-text-low">· {s.locationLabel}</span>}
          </span>
          <Button size="sm" disabled={pending} onClick={() => book(s.id)}>
            Book
          </Button>
        </li>
      ))}
    </ul>
  )
}
