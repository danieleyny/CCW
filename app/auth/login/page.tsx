"use client"

import Link from "next/link"
import { Suspense, useActionState } from "react"
import { useSearchParams } from "next/navigation"
import { login, type AuthFormState } from "@/app/auth/actions"
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
import { PasswordField } from "@/components/auth/password-field"

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}

function LoginForm() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    login,
    {}
  )
  const params = useSearchParams()
  const redirect = params.get("redirect") ?? "/dashboard"
  const loggedOut = params.get("loggedout") === "1"
  const switching = params.get("switch") === "1"

  return (
    <Card>
      <CardHeader>
        <CardTitle className="text-xl">Sign in</CardTitle>
        <CardDescription>Access your Gun License NYC dashboard.</CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <input type="hidden" name="redirect" value={redirect} />
          {loggedOut && (
            <p className="rounded-md border border-ok/30 bg-ok/8 px-3 py-2 text-sm text-ok" role="status">
              You&apos;ve been signed out.
            </p>
          )}
          {switching && (
            <p className="rounded-md border border-hairline bg-muted/40 px-3 py-2 text-sm text-muted-foreground" role="status">
              Sign in with a different account.
            </p>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[13px]">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
              required
              className="h-12"
            />
          </div>
          <PasswordField name="password" autoComplete="current-password" required />
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-2 flex-col gap-3">
          <Button type="submit" className="h-[52px] w-full" disabled={pending}>
            {pending ? "Signing in…" : "Sign in"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            <Link href="/auth/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
              Forgot your password?
            </Link>
          </p>
          <p className="text-center text-sm text-muted-foreground">
            New here?{" "}
            <Link href="/auth/sign-up" className="font-medium text-primary underline-offset-4 hover:underline">
              Create an account
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
