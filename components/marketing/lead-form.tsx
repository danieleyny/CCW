"use client"

import { useActionState, useEffect, useState } from "react"
import Link from "next/link"
import { CheckCircle2, ArrowRight } from "lucide-react"
import { captureLead, type LeadState } from "@/app/(marketing)/actions"
import { BOROUGHS } from "@/config/stages"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

/** sessionStorage key the sign-up form reads to pre-fill name + email. */
export const SIGNUP_PREFILL_KEY = "carry_signup_prefill"

export function LeadForm({
  source,
  showMessage = true,
  showBorough = true,
  datetime = false,
  submitLabel = "Submit",
  successTitle = "Thank you.",
  successBody = "We'll reach out within one business day.",
  accountCta = false,
  hidden,
}: {
  source: string
  showMessage?: boolean
  showBorough?: boolean
  datetime?: boolean
  submitLabel?: string
  successTitle?: string
  successBody?: string
  /** When true, the success state pushes the visitor straight into account creation. */
  accountCta?: boolean
  hidden?: Record<string, string>
}) {
  const [state, action, pending] = useActionState<LeadState, FormData>(captureLead, {})
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")

  // On success, stash name + email so /auth/sign-up comes pre-filled and the new
  // account adopts the lead just captured (no PII in the URL).
  useEffect(() => {
    if (state.ok && accountCta && typeof window !== "undefined") {
      try {
        window.sessionStorage.setItem(SIGNUP_PREFILL_KEY, JSON.stringify({ name, email }))
      } catch {
        // sessionStorage unavailable — sign-up just starts blank
      }
    }
  }, [state.ok, accountCta, name, email])

  if (state.ok) {
    if (accountCta) {
      return (
        <div className="rounded-lg border border-ok/30 bg-ok/8 p-8 text-center">
          <CheckCircle2 className="mx-auto size-8 text-ok" />
          <h3 className="mt-3 font-display text-lg font-semibold">{successTitle}</h3>
          <p className="mx-auto mt-1 max-w-md text-sm text-text-mid">
            Create your free account to start now — schedule training, prepare your documents, and
            track every step. We&apos;ve saved your answers.
          </p>
          <div className="mt-6 flex flex-col items-center gap-3">
            <Button asChild size="lg">
              <Link href="/auth/sign-up">
                Create your account &amp; get started <ArrowRight className="size-4" />
              </Link>
            </Button>
            <p className="text-xs text-text-low">
              Prefer to talk first? {successBody}
            </p>
          </div>
        </div>
      )
    }
    return (
      <div className="rounded-lg border border-ok/30 bg-ok/8 p-8 text-center">
        <CheckCircle2 className="mx-auto size-8 text-ok" />
        <h3 className="mt-3 font-display text-lg font-semibold">{successTitle}</h3>
        <p className="mt-1 text-sm text-text-mid">{successBody}</p>
      </div>
    )
  }

  return (
    <form action={action} className="space-y-4">
      <input type="hidden" name="source" value={source} />
      {hidden &&
        Object.entries(hidden).map(([k, v]) => (
          <input key={k} type="hidden" name={k} value={v} />
        ))}
      {/* Honeypot — humans never see this; bots that fill it are dropped server-side. */}
      <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
        <label>
          Company
          <input type="text" name="company" tabIndex={-1} autoComplete="off" />
        </label>
      </div>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead-name">Full name</Label>
          <Input id="lead-name" name="name" required value={name} onChange={(e) => setName(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-email">Email</Label>
          <Input id="lead-email" name="email" type="email" required value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-phone">Phone</Label>
          <Input id="lead-phone" name="phone" placeholder="optional" />
        </div>
        {showBorough && (
          <div className="space-y-1.5">
            <Label htmlFor="lead-borough">Borough</Label>
            <select
              id="lead-borough"
              name="borough"
              defaultValue=""
              className="h-10 w-full rounded-md border border-hairline-strong bg-surface-3 px-3 text-sm text-foreground"
            >
              <option value="">Select…</option>
              {BOROUGHS.map((b) => (
                <option key={b} value={b}>
                  {b}
                </option>
              ))}
              <option value="">Outside NYC</option>
            </select>
          </div>
        )}
      </div>
      {datetime && (
        <div className="space-y-1.5">
          <Label htmlFor="lead-consult">Preferred consult time</Label>
          <Input id="lead-consult" name="consultAt" type="datetime-local" required />
        </div>
      )}
      {showMessage && (
        <div className="space-y-1.5">
          <Label htmlFor="lead-message">Anything we should know?</Label>
          <Textarea id="lead-message" name="message" rows={3} placeholder="optional" />
        </div>
      )}
      {state.error && <p className="text-sm text-destructive">{state.error}</p>}
      <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Sending…" : submitLabel}
      </Button>
    </form>
  )
}
