"use client"

import { useState, useTransition } from "react"
import { ShieldAlert, Check, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { recordSponsorConsent } from "@/app/portal/sponsor/actions"
import { SPONSOR_SENSITIVE_CATEGORIES, sponsorConsentBody } from "@/config/sponsor-consent"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/**
 * INFORMED consent, gating all sponsor visibility. It names the human + company
 * and spells out the exact sensitive categories the rep can open — generic
 * wording would not be consent for this scope. Nothing turns on until "I consent".
 */
export function ConsentScreen({
  sponsorshipId,
  company,
  rep,
}: {
  sponsorshipId: string
  company: string
  rep: string
}) {
  const [name, setName] = useState("")
  const [pending, start] = useTransition()

  function consent() {
    start(async () => {
      const r = await recordSponsorConsent(sponsorshipId, name)
      if (r.error) {
        toast.error(r.error)
        return
      }
      toast.success(`${rep} can now help with your file.`)
    })
  }

  return (
    <section className="space-y-4 rounded-lg border border-brass/30 bg-brass/[0.04] p-5">
      <div className="flex items-start gap-2">
        <ShieldAlert className="mt-0.5 size-5 shrink-0 text-brass" />
        <div>
          <h2 className="text-lg font-semibold tracking-tight">
            {rep} of {company} wants to help with your file
          </h2>
          <p className="mt-1 text-sm text-text-mid">
            To sponsor your armed-guard licence, {rep} needs to see the documents on your application —
            including sensitive records. Read exactly what that means, then decide.
          </p>
        </div>
      </div>

      <div className="rounded-md border border-hairline bg-card p-4">
        <div className="engraved text-text-low">They will be able to open</div>
        <ul className="mt-2 space-y-1.5 text-sm text-text-mid">
          {SPONSOR_SENSITIVE_CATEGORIES.map((c) => (
            <li key={c} className="flex gap-2">
              <span aria-hidden className="mt-2 size-1.5 shrink-0 rounded-full bg-brass" />
              {c}
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-hairline pt-3 text-xs text-text-low">
          Every time {rep} opens a sensitive document, it is recorded and shown to you here. You can
          withdraw this access at any time — it stops immediately.
        </p>
      </div>

      <p className="max-w-prose text-sm leading-relaxed text-text-mid">{sponsorConsentBody(company, rep)}</p>

      <div className="space-y-3 border-t border-hairline pt-4">
        <div>
          <Label htmlFor="consent-name" className="engraved mb-1.5 block text-text-low">
            Type your full name to consent
          </Label>
          <Input
            id="consent-name"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First Middle Last"
            autoComplete="name"
          />
        </div>
        <Button onClick={consent} disabled={name.trim().length < 2 || pending} className="min-h-[44px] w-full sm:w-auto">
          {pending ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin" /> Recording…
            </>
          ) : (
            <>
              <Check className="mr-1.5 size-4" /> I consent — {rep} may see my file
            </>
          )}
        </Button>
        <p className="text-xs text-text-low">
          Don&apos;t want to? Do nothing. {rep} sees nothing until you consent, and you can ask us any question first.
        </p>
      </div>
    </section>
  )
}
