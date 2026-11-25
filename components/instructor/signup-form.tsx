"use client"

import { useActionState } from "react"
import { registerInstructor } from "@/app/instructor/actions"
import { BOROUGHS } from "@/lib/geo/nyc"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordField } from "@/components/auth/password-field"
import {
  AuthAlert,
  AuthSubmitButton,
  authInputClass,
  authLabelClass,
} from "@/components/auth/auth-form-ui"

export function InstructorSignupForm() {
  const [state, action, pending] = useActionState(registerInstructor, {})
  return (
    <form action={action} className="space-y-5">
      {state.error && <AuthAlert>{state.error}</AuthAlert>}
      {/* Each field is a flex column with the control pushed to the bottom
          (mt-auto). Grid rows stretch to equal height, so when one label wraps
          to two lines (e.g. "DCJS instructor ID (optional)") its row-partner's
          input still lines up instead of riding higher. */}
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="name" className={authLabelClass}>Full name</Label>
          <Input id="name" name="name" required className={`${authInputClass} mt-auto`} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="email" className={authLabelClass}>Email</Label>
          <Input id="email" name="email" type="email" required className={`${authInputClass} mt-auto`} />
        </div>
        <div className="sm:col-span-2">
          <PasswordField id="password" name="password" autoComplete="new-password" required showStrength variant="auth" />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="phone" className={authLabelClass}>Phone (optional)</Label>
          <Input id="phone" name="phone" type="tel" placeholder="(555) 123-4567" className={`${authInputClass} mt-auto`} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="dcjsId" className={authLabelClass}>DCJS instructor ID (optional)</Label>
          <Input id="dcjsId" name="dcjsId" placeholder="DAI-…" className={`${authInputClass} mt-auto`} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="borough" className={authLabelClass}>Service-area center (borough)</Label>
          <select
            id="borough"
            name="borough"
            defaultValue="Manhattan"
            className={`${authInputClass} mt-auto outline-none`}
          >
            {BOROUGHS.map((b) => (
              <option key={b} value={b}>{b}</option>
            ))}
          </select>
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="zip" className={authLabelClass}>ZIP code (precise center — recommended)</Label>
          <Input id="zip" name="zip" inputMode="numeric" maxLength={5} placeholder="e.g. 11215" className={`${authInputClass} mt-auto`} />
        </div>
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="radiusMi" className={authLabelClass}>Service radius (miles)</Label>
          <Input id="radiusMi" name="radiusMi" type="number" min={1} max={100} defaultValue={25} className={`${authInputClass} mt-auto`} />
        </div>
      </div>
      <p className="text-xs leading-5 text-[#7A8296]">
        We match you with applicants within your <b>service radius</b>, measured from your ZIP code
        (or the center of the borough if you skip the ZIP). Your ZIP is only used to compute distance.
      </p>
      <div className="space-y-1.5">
        <Label htmlFor="bio" className={authLabelClass}>Short bio (optional — applicants read this)</Label>
        <textarea
          id="bio"
          name="bio"
          rows={3}
          maxLength={1000}
          placeholder="Years of experience, teaching style, what first-timers can expect…"
          className="w-full rounded-xl border-[1.5px] border-[#14254A]/15 bg-white px-4 py-3 text-base text-[#14254A] outline-none transition-colors placeholder:text-[#9AA1B2] focus-visible:border-[#14254A] focus-visible:ring-4 focus-visible:ring-[#14254A]/10"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="price18hDollars" className={authLabelClass}>18-hr course price (USD, optional)</Label>
        <Input id="price18hDollars" name="price18hDollars" type="number" min={0} placeholder="e.g. 650" className={authInputClass} />
      </div>
      <AuthSubmitButton pending={pending} pendingText="Creating account…">Apply to teach</AuthSubmitButton>
      <p className="text-xs leading-5 text-[#7A8296]">
        Your account is reviewed by an admin (DCJS credential check) before you appear to clients.
      </p>
    </form>
  )
}
