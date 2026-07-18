"use client"

import { useState, useTransition } from "react"
import { MapPin, Check } from "lucide-react"
import { toast } from "sonner"
import { saveClientLocation } from "@/app/portal/marketplace/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Collects the applicant's ZIP so instructors can be ranked by distance.
 * When a ZIP is already set, shows it with an "Update" affordance; otherwise
 * prompts for one. The ZIP never reaches instructors — only borough + distance.
 */
export function LocationPrompt({ zip, borough }: { zip: string | null; borough: string | null }) {
  const [editing, setEditing] = useState(!zip)
  const [pending, startTransition] = useTransition()

  function onSubmit(formData: FormData) {
    startTransition(async () => {
      const res = await saveClientLocation(formData)
      if (res.error) toast.error(res.error)
      else {
        toast.success("Location saved — instructors are ranked by distance from here.")
        setEditing(false)
      }
    })
  }

  if (!editing) {
    return (
      <div className="flex items-center justify-between gap-3 rounded-lg border border-hairline bg-surface-2/40 p-4">
        <div className="flex items-center gap-2 text-sm">
          <MapPin className="size-4 text-brass" />
          <span className="text-text-mid">
            Your area: <span className="font-medium text-foreground">{borough ?? "NYC"}</span>
            {zip && <span className="text-text-low"> · {zip}</span>}
          </span>
        </div>
        <Button size="sm" variant="ghost" onClick={() => setEditing(true)}>
          Update
        </Button>
      </div>
    )
  }

  return (
    <form
      action={onSubmit}
      className="rounded-lg border border-brass/30 bg-brass/8 p-4"
    >
      <div className="flex items-center gap-2 text-sm font-medium text-brass-bright">
        <MapPin className="size-4" /> Set your location
      </div>
      <p className="mt-1 text-xs text-text-mid">
        Your ZIP code lets us rank instructors by how close they are. It stays private —
        instructors only ever see your borough and the distance.
      </p>
      <div className="mt-3 flex items-center gap-2">
        <Input
          name="zip"
          inputMode="numeric"
          maxLength={5}
          placeholder="e.g. 11215"
          defaultValue={zip ?? ""}
          className="max-w-[9rem]"
          aria-label="ZIP code"
        />
        <Button type="submit" size="sm" disabled={pending}>
          {pending ? "Saving…" : <><Check className="mr-1 size-3.5" /> Save</>}
        </Button>
        {zip && (
          <Button type="button" size="sm" variant="ghost" onClick={() => setEditing(false)}>
            Cancel
          </Button>
        )}
      </div>
    </form>
  )
}
