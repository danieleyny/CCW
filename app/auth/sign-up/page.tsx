"use client"

import { useActionState, useEffect, useRef } from "react"
import { Lock } from "lucide-react"
import { signUp, type AuthFormState } from "@/app/auth/actions"
import { SIGNUP_PREFILL_KEY } from "@/components/marketing/lead-form"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { PasswordField } from "@/components/auth/password-field"
import { HoneypotField } from "@/components/shared/honeypot-field"
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

const JOURNEY = ["Account", "Intake", "Checklist"]

export default function SignUpPage() {
  const [state, formAction, pending] = useActionState<AuthFormState, FormData>(
    signUp,
    {}
  )
  const nameRef = useRef<HTMLInputElement>(null)
  const emailRef = useRef<HTMLInputElement>(null)

  // Pre-fill from the eligibility quiz / lead form so they don't retype. We set
  // the input values directly (no setState in effect, no hydration mismatch).
  useEffect(() => {
    try {
      const raw = window.sessionStorage.getItem(SIGNUP_PREFILL_KEY)
      if (!raw) return
      const { name, email } = JSON.parse(raw) as { name?: string; email?: string }
      if (name && nameRef.current) nameRef.current.value = name
      if (email && emailRef.current) emailRef.current.value = email
      window.sessionStorage.removeItem(SIGNUP_PREFILL_KEY)
    } catch {
      // ignore
    }
  }, [])

  return (
    <div>
      {/* Account creation is step 1 of a real process, not a dead end. */}
      <div className="mb-5">
        <div aria-hidden className="flex items-center gap-1.5">
          {JOURNEY.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  i === 0 ? "bg-[#14254A] text-white ring-2 ring-[#14254A]/15" : "bg-[#14254A]/10 text-[#7A8296]"
                )}
              >
                {i + 1}
              </span>
              <span className={cn("font-mono text-[10.5px] font-medium uppercase tracking-wide", i === 0 ? "text-[#14254A]" : "text-[#7A8296]")}>
                {s}
              </span>
              {i < JOURNEY.length - 1 && <span className="h-px w-3 bg-[#14254A]/15" />}
            </div>
          ))}
        </div>
        <span className="sr-only">Step 1 of 3</span>
      </div>
      <AuthHeading
        title="Create your account"
        description="Two minutes here, then a guided interview builds your personalized document checklist."
      />
      <form action={formAction} className="mt-7 space-y-5">
        {/* SEC-06 — honeypot: hidden from humans, tempting to bots. */}
        <HoneypotField />
          {state.error && <AuthAlert>{state.error}</AuthAlert>}
          <div className="space-y-2">
            <Label htmlFor="fullName" className={authLabelClass}>Full name</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required ref={nameRef} aria-invalid={Boolean(state.error)} className={cn(authInputClass, state.error && authInvalidInputClass)} />
          </div>
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
              ref={emailRef}
              aria-invalid={Boolean(state.error)}
              className={cn(authInputClass, state.error && authInvalidInputClass)}
            />
          </div>
          <PasswordField name="password" autoComplete="new-password" required showStrength invalid={Boolean(state.error)} variant="auth" />
          <div className="space-y-[18px] pt-1">
          <AuthSubmitButton pending={pending} pendingText="Creating account…">Create account</AuthSubmitButton>
          {/* Trust strip — the third item is a compliance point AND a differentiator. */}
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11px] text-[#7A8296]">
            <span className="inline-flex items-center gap-1"><Lock className="size-3" /> Encrypted</span>
            <span aria-hidden>·</span>
            <span>No card required</span>
            <span aria-hidden>·</span>
            <span>You always file your own application</span>
          </div>
          <AuthAccountPrompt mode="existing" />
          <AuthPrivateLine />
          </div>
      </form>
    </div>
  )
}
