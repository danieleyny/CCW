"use client"

import Link from "next/link"
import { Suspense, useActionState } from "react"
import { useSearchParams } from "next/navigation"
import { login, type AuthFormState } from "@/app/auth/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordField } from "@/components/auth/password-field"
import {
  AuthAccountPrompt,
  AuthAlert,
  AuthHeading,
  AuthPrivateLine,
  AuthSubmitButton,
  authInputClass,
  authInvalidInputClass,
  authLabelClass,
} from "@/components/auth/auth-form-ui"
import { cn } from "@/lib/utils"

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
    <div>
      <AuthHeading
        title="Welcome back"
        description="Sign in to see your next step, documents and messages."
      />
      <form action={formAction} className="mt-7 space-y-5">
          <input type="hidden" name="redirect" value={redirect} />
          {loggedOut && (
            <AuthAlert tone="ok">
              You&apos;ve been signed out.
            </AuthAlert>
          )}
          {switching && (
            <AuthAlert tone="neutral">
              Sign in with a different account.
            </AuthAlert>
          )}
          {state.error && (
            <AuthAlert>
              {state.error} Try again, or{" "}
              <Link href="/auth/forgot-password" className="font-bold underline underline-offset-2">
                reset your password
              </Link>.
            </AuthAlert>
          )}
          <div className="space-y-2">
            <Label htmlFor="email" className={authLabelClass}>Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              inputMode="email"
              autoCapitalize="none"
              autoComplete="email"
              placeholder="you@example.com"
              required
              aria-invalid={Boolean(state.error)}
              className={cn(authInputClass, state.error && authInvalidInputClass)}
            />
          </div>
          <PasswordField
            name="password"
            autoComplete="current-password"
            required
            invalid={Boolean(state.error)}
            variant="auth"
            labelAction={(
            <Link href="/auth/forgot-password" className="font-medium text-primary underline-offset-4 hover:underline">
              Forgot password?
            </Link>
            )}
          />
          <div className="space-y-[18px] pt-1">
            <AuthSubmitButton pending={pending} pendingText="Signing in…">Sign in</AuthSubmitButton>
            <AuthAccountPrompt />
            <AuthPrivateLine />
          </div>
      </form>
    </div>
  )
}
