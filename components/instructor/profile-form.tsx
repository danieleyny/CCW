"use client"

import { useActionState } from "react"
import { updateInstructorProfile } from "@/app/instructor/actions"
import { BOROUGHS } from "@/lib/geo/nyc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function InstructorProfileForm({
  initial,
}: {
  initial: { bio: string; dcjsId: string; borough: string; radiusMi: number; price18hDollars: string }
}) {
  const [state, action, pending] = useActionState(updateInstructorProfile, {})
  return (
    <form action={action} className="space-y-4">
      <div className="space-y-1.5">
        <Label htmlFor="bio" className="text-xs">Bio</Label>
        <Textarea id="bio" name="bio" rows={3} defaultValue={initial.bio} placeholder="Your experience, specialties, range affiliations…" />
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="dcjsId" className="text-xs">DCJS Duly-Authorized-Instructor ID</Label>
          <Input id="dcjsId" name="dcjsId" defaultValue={initial.dcjsId} placeholder="DAI-…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="borough" className="text-xs">Service-area center (borough)</Label>
          <select
            id="borough"
            name="borough"
            defaultValue={initial.borough || "Manhattan"}
            className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm"
          >
            {BOROUGHS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="radiusMi" className="text-xs">Service radius (miles)</Label>
          <Input id="radiusMi" name="radiusMi" type="number" min={1} max={100} defaultValue={initial.radiusMi} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="price18hDollars" className="text-xs">18-hr course price (USD)</Label>
          <Input id="price18hDollars" name="price18hDollars" type="number" min={0} step="1" defaultValue={initial.price18hDollars} placeholder="e.g. 650" />
        </div>
      </div>
      <div className="flex items-center gap-3">
        <Button type="submit" disabled={pending}>{pending ? "Saving…" : "Save profile"}</Button>
        {state.error && <p className="text-sm text-danger">{state.error}</p>}
        {state.ok && <p className="text-sm text-ok">Saved.</p>}
      </div>
    </form>
  )
}
