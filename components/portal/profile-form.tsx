"use client"

import { useActionState } from "react"
import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { updateProfile, changePassword, type ProfileState } from "@/app/portal/profile/actions"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"

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
  const { messages } = usePortalI18n()
  const t = messages.ui
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.accountTitle}</CardTitle>
        <p className="text-sm text-text-mid">
          {t.accountDescription}{" "}
          <Link href="/portal/details" className="text-signal underline underline-offset-2">
            {messages.shell.yourDetails}
          </Link>
          .
        </p>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">{t.fullName}</Label>
            <Input id="fullName" name="fullName" defaultValue={fullName} required />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">{t.email}</Label>
            <Input id="email" value={email} disabled readOnly />
            <p className="text-xs text-text-low">
              {t.signInEmailHelp}
            </p>
          </div>
          <div className="space-y-2">
            <Label htmlFor="phone">{t.phone}</Label>
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
              <CheckCircle2 className="size-4" /> {t.saved}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? t.saving : t.saveChanges}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}

function PasswordCard() {
  const [state, formAction, pending] = useActionState<ProfileState, FormData>(changePassword, {})
  const { messages } = usePortalI18n()
  const t = messages.ui
  return (
    <Card>
      <CardHeader>
        <CardTitle>{t.changePassword}</CardTitle>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="password">{t.newPassword}</Label>
            <Input
              id="password"
              name="password"
              type="password"
              autoComplete="new-password"
              placeholder={t.atLeastEight}
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="confirm">{t.confirmPassword}</Label>
            <Input id="confirm" name="confirm" type="password" autoComplete="new-password" required />
          </div>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
          {state.ok && (
            <p className="flex items-center gap-1.5 text-sm text-ok" role="status">
              <CheckCircle2 className="size-4" /> {t.passwordUpdated}
            </p>
          )}
          <Button type="submit" disabled={pending}>
            {pending ? t.updating : t.updatePassword}
          </Button>
        </CardContent>
      </form>
    </Card>
  )
}
