"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, Check } from "lucide-react"
import { toast } from "sonner"
import { createBooking } from "@/app/portal/marketplace/actions"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"
import { Button } from "@/components/ui/button"

export interface BookableSlot {
  id: string
  type: string
  starts_at: string
  instructorName: string
  locationLabel: string | null
  dateLabel: string
  timeLabel: string
}

export function SlotBooker({ slots, instructorName }: { slots: BookableSlot[]; instructorName: string }) {
  const router = useRouter()
  const { messages } = usePortalI18n()
  const copy = messages.marketplace
  const [selected, setSelected] = useState(slots[0]?.id ?? "")
  const [pending, startTransition] = useTransition()
  const firstName = instructorName.trim().split(/\s+/)[0] || instructorName
  const selectedSlot = slots.find((slot) => slot.id === selected) ?? null
  const typeLabel: Record<string, string> = {
    combined_18h: copy.typeCombined,
    classroom_16h: copy.typeClassroom,
    live_fire_2h: copy.typeRange,
    consult: copy.typeConsult,
  }

  function book() {
    if (!selectedSlot) return
    startTransition(async () => {
      const result = await createBooking(selectedSlot.id)
      if (result.error) toast.error(result.error)
      else {
        toast.success(copy.bookingToast)
        router.refresh()
      }
    })
  }

  if (slots.length === 0) {
    return <p className="marketplace-v2-empty-slots">{interpolate(copy.noSlots, { name: firstName })}</p>
  }

  return (
    <div>
      <div className="marketplace-v2-slots" role="radiogroup" aria-label={copy.bookTitle}>
        {slots.map((slot) => {
          const checked = selected === slot.id
          return (
            <button key={slot.id} type="button" role="radio" aria-checked={checked} data-selected={checked} onClick={() => setSelected(slot.id)}>
              <span className="marketplace-v2-slot-type">{typeLabel[slot.type] ?? slot.type}</span>
              <strong>{slot.dateLabel}</strong>
              <span><CalendarClock aria-hidden="true" />{slot.timeLabel}{slot.locationLabel ? ` · ${slot.locationLabel}` : ""}</span>
              {checked ? <Check className="marketplace-v2-slot-check" aria-hidden="true" /> : null}
            </button>
          )
        })}
      </div>
      <div className="marketplace-v2-book-action">
        <span>{selectedSlot ? "" : copy.selectDate}</span>
        <Button disabled={pending || !selectedSlot} onClick={book}>
          {pending ? copy.sending : interpolate(copy.bookDate, { date: selectedSlot?.dateLabel ?? "" })}
        </Button>
      </div>
    </div>
  )
}
