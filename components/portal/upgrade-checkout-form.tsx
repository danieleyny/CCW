"use client"

import { useActionState } from "react"
import { startUpgrade, type UpgradeState } from "@/app/portal/upgrade/actions"
import { Button } from "@/components/ui/button"

const initialState: UpgradeState = {}

export function UpgradeCheckoutForm({ consentText }: { consentText: string }) {
  const [state, action, pending] = useActionState(startUpgrade, initialState)
  return (
    <form action={action} className="space-y-4">
      <label className="flex items-start gap-3 rounded-lg border border-hairline bg-surface-1 p-4 text-sm leading-relaxed">
        <input name="consent" value="yes" type="checkbox" required className="mt-1 size-4" />
        <span>{consentText}</span>
      </label>
      {state.error ? <p className="text-sm text-danger" role="alert">{state.error}</p> : null}
      <Button type="submit" disabled={pending} className="w-full sm:w-auto">
        {pending ? "Opening secure checkout…" : "Continue to payment"}
      </Button>
    </form>
  )
}
