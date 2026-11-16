"use client"

import { useActionState, useState } from "react"
import { Loader2 } from "lucide-react"
import { redeemAccessCode, type RedeemResult } from "@/app/portal/choose-path/actions"
import { Input } from "@/components/ui/input"
import { Button } from "@/components/ui/button"

/**
 * ACCESS CODES · Phase 1 — a quiet "Have an access code?" link under a payment
 * CTA. Deliberately modest (a prominent bypass control invites probing; a small
 * promo-code field reads as normal retail). All validation is server-side in
 * redeemAccessCode — this component never sees the valid codes. On success the
 * action redirects to the destination the purchase would have reached.
 */
export function AccessCodeField({
  packageKey,
  planName,
}: {
  packageKey: string | null
  planName?: string
}) {
  const [open, setOpen] = useState(false)
  const [state, action, pending] = useActionState<RedeemResult, FormData>(redeemAccessCode, {})

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        disabled={!packageKey}
        className="portal-access-trigger"
      >
        Have an access code?
      </button>
    )
  }

  if (!packageKey) return null

  return (
    <form action={action} className="portal-access-form">
      <p className="portal-access-label portal-t-label">
        Access code for {planName ?? "selected plan"}
      </p>
      <input type="hidden" name="packageKey" value={packageKey} />
      <div className="flex gap-2">
        <Input
          name="code"
          placeholder="Access code"
          autoFocus
          maxLength={64}
          autoComplete="off"
          autoCapitalize="characters"
          className="h-10 text-sm"
        />
        <Button type="submit" size="sm" disabled={pending} aria-busy={pending} className="h-10 shrink-0">
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Apply"}
        </Button>
      </div>
      {state.error && (
        <p className="text-xs text-danger" role="alert">
          {state.error}
        </p>
      )}
    </form>
  )
}
