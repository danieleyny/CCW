"use client"

import Link from "next/link"
import { useActionState } from "react"
import { updatePassword, type AuthFormState } from "@/app/auth/actions"
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

/**
 * Landing for the recovery link. The callback route (type=recovery) establishes
 * the recovery session before forwarding here, so updateUser({ password }) has a
 * session to act on. If it's missing/expired, the action returns a friendly
 * error and we point the user back to request a fresh link.
 */
export default function ResetPasswordPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    updatePassword,
    {}
  )

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Set a new password</CardTitle>
        <CardDescription>Choose a new password for your account.</CardDescription>
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
            <Input
              id="confirm"
              name="confirm"
              type="password"
              autoComplete="new-password"
              required
            />
          </div>
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-2 flex-col gap-3">
          <Button type="submit" className="w-full" disabled={pending}>
            {pending ? "Saving…" : "Save new password"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
              Request a new reset link
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
