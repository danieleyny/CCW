"use client"

import { useActionState } from "react"
import { registerInstructor } from "@/app/instructor/actions"
import { BOROUGHS } from "@/lib/geo/nyc"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

export function InstructorSignupForm() {
  const [state, action, pending] = useActionState(registerInstructor, {})
  return (
    <form action={action} className="space-y-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="name" className="text-xs">Full name</Label>
          <Input id="name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="email" className="text-xs">Email</Label>
          <Input id="email" name="email" type="email" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="password" className="text-xs">Password</Label>
          <Input id="password" name="password" type="password" required minLength={8} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="dcjsId" className="text-xs">DCJS instructor ID (optional)</Label>
          <Input id="dcjsId" name="dcjsId" placeholder="DAI-…" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="borough" className="text-xs">Service-area center</Label>
          <select id="borough" name="borough" defaultValue="Manhattan" className="h-10 w-full rounded-md border border-input bg-background px-3 text-sm">
            {BOROUGHS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="radiusMi" className="text-xs">Service radius (miles)</Label>
          <Input id="radiusMi" name="radiusMi" type="number" min={1} max={100} defaultValue={25} />
        </div>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="price18hDollars" className="text-xs">18-hr course price (USD, optional)</Label>
        <Input id="price18hDollars" name="price18hDollars" type="number" min={0} placeholder="e.g. 650" />
      </div>
      <Button type="submit" disabled={pending} className="w-full">
        {pending ? "Creating account…" : "Apply to teach"}
      </Button>
      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      <p className="text-xs text-text-low">
        Your account is reviewed by an admin (DCJS credential check) before you appear to clients.
      </p>
    </form>
  )
}
