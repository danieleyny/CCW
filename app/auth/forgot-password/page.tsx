"use client"

import Link from "next/link"
import { useActionState } from "react"
import { requestPasswordReset, type ResetRequestState } from "@/app/auth/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  AuthAlert,
  AuthHeading,
  AuthPrivateLine,
  AuthSubmitButton,
  authInputClass,
  authInvalidInputClass,
  authLabelClass,
} from "@/components/auth/auth-form-ui"
import { cn } from "@/lib/utils"

export default function ForgotPasswordPage() {
  const [state, formAction, pending] = useActionState<ResetRequestState, FormData>(
    requestPasswordReset,
    {}
  )

  // Neutral success — identical whether or not the email exists, so it never
  // reveals which addresses are registered.
  if (state.sent) {
    return (
      <div>
        <AuthHeading
          title="Check your email"
          description={
            <>
            If an account exists for that email, we&apos;ve sent a link to reset your password.
            The link expires shortly — use it soon.
            </>
          }
        />
        <div className="mt-7 space-y-[18px]">
          <p className="text-center text-[15px] text-[#46526D]">
            <Link href="/auth/login" className="font-bold text-[#14254A] underline decoration-[#D3B36B] decoration-2 underline-offset-4">
              Back to sign in
            </Link>
          </p>
          <AuthPrivateLine />
        </div>
      </div>
    )
  }

  return (
    <div>
      <AuthHeading title="Reset your password" description="Enter your email and we’ll send you a link to set a new password." />
      <form action={formAction} className="mt-7 space-y-5">
          {state.error && <AuthAlert>{state.error}</AuthAlert>}
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
          <div className="space-y-[18px] pt-1">
            <AuthSubmitButton pending={pending} pendingText="Sending…">Send reset link</AuthSubmitButton>
            <p className="text-center text-[15px] text-[#46526D]">
            <Link href="/auth/login" className="font-bold text-[#14254A] underline decoration-[#D3B36B] decoration-2 underline-offset-4">
              Back to sign in
            </Link>
            </p>
            <AuthPrivateLine />
          </div>
      </form>
    </div>
  )
}
