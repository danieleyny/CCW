"use client"

import { useActionState, useState } from "react"
import { ChevronDown, Check, ShieldCheck, Loader2 } from "lucide-react"
import { signAgreements, type ConciergeResult } from "@/app/portal/concierge/actions"
import { AGREEMENTS } from "@/config/agreements"
import { SignaturePad } from "@/components/sign/signature-pad"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

/**
 * CONCIERGE Phase 2 — the agreements gate. Nothing else on the concierge
 * dashboard unlocks until these are signed. The applicant reads all five
 * (honest, limited-scope, non-representation), types their legal name, and
 * adopts a signature once — the same signature Phase 6 later applies per
 * document, so they never redraw.
 */
export function AgreementsGate({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<ConciergeResult, FormData>(signAgreements, {})
  const [name, setName] = useState(defaultName)
  const [png, setPng] = useState("")
  const canSubmit = name.trim().length >= 2 && png.length > 0

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Before we begin</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your engagement, in plain English</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          Five short agreements set out exactly what we do and the line we never cross. Read each one,
          then sign once to begin. This is the only thing standing between you and your concierge.
        </p>
      </div>

      <ul className="space-y-2">
        {AGREEMENTS.map((a, i) => (
          <li key={a.kind}>
            <details className="group rounded-lg border border-hairline bg-card" open={i === 0}>
              <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
                <span className="mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border border-brass/40 font-mono text-xs text-brass">
                  {i + 1}
                </span>
                <span className="flex-1">
                  <span className="block font-medium">{a.title}</span>
                  <span className="mt-0.5 block text-sm text-text-mid">{a.summary}</span>
                </span>
                <ChevronDown className="mt-1 size-4 shrink-0 text-text-low transition-transform group-open:rotate-180" />
              </summary>
              <p className="border-t border-hairline p-4 text-sm leading-relaxed text-text-mid">{a.body}</p>
            </details>
          </li>
        ))}
      </ul>

      <form action={action} className="space-y-4 rounded-lg border border-brass/30 bg-brass/[0.04] p-4 sm:p-5">
        <input type="hidden" name="base64Png" value={png} />

        <div>
          <label htmlFor="signerName" className="engraved mb-1.5 block text-text-low">
            Your full legal name
          </label>
          <Input
            id="signerName"
            name="signerName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First Middle Last"
            autoComplete="name"
          />
        </div>

        <div>
          <span className="engraved mb-1.5 block text-text-low">Your signature</span>
          <SignaturePad onSave={setPng} label={png ? "Update signature" : "Use this signature"} />
          {png && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ok">
              <Check className="size-3.5" /> Signature captured.
            </p>
          )}
        </div>

        <Button type="submit" disabled={!canSubmit || pending} className="w-full sm:w-auto">
          {pending ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin" /> Signing…
            </>
          ) : (
            <>
              <ShieldCheck className="mr-1.5 size-4" /> Sign &amp; unlock my concierge
            </>
          )}
        </Button>

        {!canSubmit && !pending && (
          <p className="text-xs text-text-low">Enter your legal name and capture your signature to continue.</p>
        )}
        {state.error && (
          <p className="text-xs text-danger" role="alert">
            {state.error}
          </p>
        )}
      </form>
    </div>
  )
}
