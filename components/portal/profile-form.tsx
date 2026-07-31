"use client"

import { useActionState } from "react"
import { CheckCircle2 } from "lucide-react"
import { updateProfile, changePassword, type ProfileState } from "@/app/portal/profile/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function ProfileForms({
  fullName,
  email,
  phone,
}: {
  fullName: string
  email: string
  phone: string
}) {
  return (
    <div className="space-y-6">
      <ContactCard fullName={fullName} email={email} phone={phone} />
      <PasswordCard />
    </div>
  )
}

function ContactCard({ fullName, email, phone }: { fullName: string; email: string; phone: string }) {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(updateProfile, {})
  return (
    <Card>
      <CardHeader>
        <CardTitle>Your details</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" defaultValue={fullName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input id="email" value={email} disabled readOnly />
            <p className="text-xs text-text-low">
              This is your sign-in email — contact us if you need to change it.
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">Phone</Label>
            <Input
              id="phone"
              name="phone"
              type="tel"
              inputMode="tel"
              autoComplete="tel"
              defaultValue={phone}
              placeholder="(212) 555-0100"
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="flex items-center gap-1.5 text-sm text-ok" role="status">
              <CheckCircle2 className="size-4" /> Saved.
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Saving…" : "Save changes"}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}

function PasswordCard() {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(changePassword, {})
  return (
    <Card>
      <CardHeader>
        <CardTitle>Change password</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">New password</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder="At least 8 characters"
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">Confirm new password</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
          </div>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="flex items-center gap-1.5 text-sm text-ok" role="status">
              <CheckCircle2 className="size-4" /> Password updated.
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? "Updating…" : "Update password"}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
