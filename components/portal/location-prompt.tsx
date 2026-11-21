"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { MapPin, Check } from "lucide-react"
import { toast } from "sonner"
import { saveClientLocation } from "@/app/portal/marketplace/actions"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Collects the applicant's ZIP so instructors can be ranked by distance.
 * When a ZIP is already set, shows it with an "Update" affordance; otherwise
 * prompts for one. The ZIP never reaches instructors — only borough + distance.
 */
export function LocationPrompt({ zip, borough }: { zip: string | null; borough: string | null }) {
  const router = useRouter()
  const { messages } = usePortalI18n()
  const copy = messages.marketplace
  const [editing, setEditing] = useState(!zip)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveClientLocation(formData)
      if (res.error) toast.error(res.error)
      else {
        toast.success(copy.locationSaved)
        setEditing(false)
        router.refresh()
      }
    })
  }

  if (!editing) {
    return (
      <div className="marketplace-v2-location-card is-set">
        <div className="marketplace-v2-location-heading">
          <span><MapPin aria-hidden="true" /></span>
          <div><p className="portal-t-label">{copy.yourArea}</p><strong>{borough ?? "NYC"}{zip ? ` · ${zip}` : ""}</strong></div>
        </div>
        <Button variant="ghost" onClick={() => setEditing(true)}>
          {copy.changeArea}
        </Button>
      </div>
    )
  }

  return (
    <form action={onSubmit} className="marketplace-v2-location-card">
      <div className="marketplace-v2-location-heading">
        <span><MapPin aria-hidden="true" /></span>
        <div><p className="portal-t-label">{copy.setLocation}</p><h2>{copy.locationTitle}</h2><p>{copy.locationBody}</p></div>
      </div>
      <div className="marketplace-v2-location-form">
        <Input
          name="zip"
          inputMode="numeric"
          maxLength={5}
          placeholder="11215"
          defaultValue={zip ?? ""}
          aria-label={copy.zipLabel}
        />
        <Button type="submit" disabled={pending}>
          {pending ? copy.saving : <><Check aria-hidden="true" /> {copy.save}</>}
        </Button>
        {zip && (
          <Button type="button" variant="ghost" onClick={() => setEditing(false)}>
            {copy.cancel}
          </Button>
        )}
      </div>
    </form>
  )
}
