"use client"

import Link from "next/link"
import { useActionState, useEffect, useRef } from "react"
import { Lock } from "lucide-react"
import { signUp, type AuthFormState } from "@/app/auth/actions"
import { SIGNUP_PREFILL_KEY } from "@/components/marketing/lead-form"
import { brand } from "@/config/brand"
import { cn } from "@/lib/utils"
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
    <Card>
      {/* Account creation is step 1 of a real process, not a dead end. */}
      <div className="px-6 pt-6">
        <div aria-hidden className="flex items-center justify-center gap-1.5">
          {JOURNEY.map((s, i) => (
            <div key={s} className="flex items-center gap-1.5">
              <span
                className={cn(
                  "flex size-5 items-center justify-center rounded-full text-[10px] font-semibold",
                  i === 0 ? "bg-brass text-brand-foreground ring-2 ring-brass/30" : "bg-surface-3 text-text-low"
                )}
              >
                {i + 1}
              </span>
              <span className={cn("text-[10.5px] font-medium uppercase tracking-wide", i === 0 ? "text-brass" : "text-text-low")}>
                {s}
              </span>
              {i < JOURNEY.length - 1 && <span className="h-px w-3 bg-hairline" />}
            </div>
          ))}
        </div>
        <span className="sr-only">Step 1 of 3</span>
      </div>
      <CardHeader className="pt-4">
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Two minutes here, then a guided interview builds your personalized document checklist.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        {/* SEC-06 — honeypot: hidden from humans, tempting to bots. Off-screen +
            aria-hidden + tab-excluded so no real user ever fills it. */}
        <input
          type="text"
          name="company"
          tabIndex={-1}
          autoComplete="off"
          aria-hidden="true"
          className="absolute left-[-9999px] h-0 w-0 opacity-0"
        />
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName" className="text-[13px]">Full name</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required ref={nameRef} className="h-12" />
          </div>
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
              ref={emailRef}
              className="h-12"
            />
          </div>
          <PasswordField name="password" autoComplete="new-password" required showStrength />
          {state.error && (
            <p className="text-sm text-destructive" role="alert">
              {state.error}
            </p>
          )}
        </CardContent>
        <CardFooter className="mt-2 flex-col gap-3">
          <Button type="submit" className="h-[52px] w-full" disabled={pending}>
            {pending ? "Creating account…" : "Create account"}
          </Button>
          {/* Trust strip — the third item is a compliance point AND a differentiator. */}
          <div className="flex flex-wrap items-center justify-center gap-x-2.5 gap-y-1 text-[11px] text-text-low">
            <span className="inline-flex items-center gap-1"><Lock className="size-3" /> Encrypted</span>
            <span aria-hidden>·</span>
            <span>No card required</span>
            <span aria-hidden>·</span>
            <span>You always file your own application</span>
          </div>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
      {/* V3-P0.7 — standing legal disclaimer, always at account creation. In a
          <details> so it's reachable without JS (renders open-able server-side)
          without pushing the form below the fold. Verbatim from config/brand.ts. */}
      <details className="border-t border-hairline px-6 py-3">
        <summary className="cursor-pointer text-[11px] font-medium text-text-mid">
          Important legal notice — read before you continue
        </summary>
        <p className="mt-2 text-[11px] leading-relaxed text-text-low">{brand.disclaimer}</p>
      </details>
    </Card>
  )
}
