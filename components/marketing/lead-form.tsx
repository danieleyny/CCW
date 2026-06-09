"use client"

import { useActionState } from "react"
import { CheckCircle2 } from "lucide-react"
import { captureLead, type LeadState } from "@/app/(marketing)/actions"
import { BOROUGHS } from "@/config/stages"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"

export function LeadForm({
  source,
  showMessage = true,
  showBorough = true,
  datetime = false,
  submitLabel = "Submit",
  successTitle = "Thank you.",
  successBody = "Your CARRY concierge will reach out within one business day.",
  hidden,
}: {
  source: string
  showMessage?: boolean
  showBorough?: boolean
  datetime?: boolean
  submitLabel?: string
  successTitle?: string
  successBody?: string
  hidden?: Record<string, string>
}) {
  const [state, action, pending] = useActionState<LeadState, FormData>(captureLead, {})

  if (state.ok) {
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
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="lead-name">Full name</Label>
          <Input id="lead-name" name="name" required />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="lead-email">Email</Label>
          <Input id="lead-email" name="email" type="email" required />
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
