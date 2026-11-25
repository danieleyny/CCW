"use client"

import Link from "next/link"
import { useActionState } from "react"
import { updatePassword, type AuthFormState } from "@/app/auth/actions"
import { PasswordField } from "@/components/auth/password-field"
import { AuthAlert, AuthHeading, AuthPrivateLine, AuthSubmitButton } from "@/components/auth/auth-form-ui"

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
    <div>
      <AuthHeading title="Set a new password" description="Choose a new password for your account." />
      <form action={formAction} className="mt-7 space-y-5">
          {state.error && <AuthAlert>{state.error}</AuthAlert>}
          <PasswordField id="password" name="password" label="New password" autoComplete="new-password" required showStrength invalid={Boolean(state.error)} variant="auth" />
          <PasswordField id="confirm" name="confirm" label="Confirm new password" autoComplete="new-password" required invalid={Boolean(state.error)} variant="auth" />
          <div className="space-y-[18px] pt-1">
            <AuthSubmitButton pending={pending} pendingText="Saving…">Save new password</AuthSubmitButton>
            <p className="text-center text-[15px] text-[#46526D]">
            <Link href="/auth/forgot-password" className="font-bold text-[#14254A] underline decoration-[#D3B36B] decoration-2 underline-offset-4">
              Request a new reset link
            </Link>
            </p>
            <AuthPrivateLine />
          </div>
      </form>
    </div>
  )
}
