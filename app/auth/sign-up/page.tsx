"use client"

import Link from "next/link"
import { useActionState, useEffect, useRef } from "react"
import { signUp, type AuthFormState } from "@/app/auth/actions"
import { SIGNUP_PREFILL_KEY } from "@/components/marketing/lead-form"
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
      <CardHeader>
        <CardTitle className="text-xl">Create your account</CardTitle>
        <CardDescription>
          Start your NYC concealed carry application with CARRY.
        </CardDescription>
      </CardHeader>
      <form action={formAction}>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full name</Label>
            <Input id="fullName" name="fullName" autoComplete="name" required ref={nameRef} />
          </div>
          <div className="space-y-2">
            <Label htmlFor="email">Email</Label>
            <Input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              placeholder="you@example.com"
              required
              ref={emailRef}
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="password">Password</Label>
            <Input
              id="password"
              name="password"
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
            {pending ? "Creating account…" : "Create account"}
          </Button>
          <p className="text-center text-sm text-muted-foreground">
            Already have an account?{" "}
            <Link href="/auth/login" className="font-medium text-primary underline-offset-4 hover:underline">
              Sign in
            </Link>
          </p>
        </CardFooter>
      </form>
    </Card>
  )
}
