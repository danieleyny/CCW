"use client"

import { useState } from "react"
import { CheckCircle2, Download, PenLine } from "lucide-react"
import { uploadSignedSafeguard } from "@/app/g/actions"
import { NotarizedTokenUpload } from "@/components/public/notarized-token-upload"
import { Button } from "@/components/ui/button"

type Phase = "steps" | "done"

/**
 * The safeguard person's guided flow: download the pre-filled NYPD acknowledgement,
 * sign it in front of a WITNESS (this form is never notarized), and upload it. No
 * account, no notary — mirrors the reference/cohabitant self-service pattern.
 */
export function SafeguardFlow({
  token,
  applicant,
  initialStatus,
}: {
  token: string
  applicant: string
  initialStatus: string
}) {
  const [phase, setPhase] = useState<Phase>(initialStatus === "signed" ? "done" : "steps")

  if (phase === "done") {
    return (
      <div className="mt-6 rounded-lg border border-ok/30 bg-ok/10 p-4 text-ok">
        <div className="flex items-center gap-2 font-medium">
          <CheckCircle2 className="size-5" /> All set — thank you.
        </div>
        <p className="mt-2 text-sm">
          Your signed acknowledgement for {applicant} has been received. Nothing more is needed — they&apos;ve
          been notified.
        </p>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-5">
      <div className="rounded-lg border border-brass/40 bg-brass/10 p-3 text-sm text-brass-bright">
        Sign in front of a witness — not a notary. Leave the signature line blank until your witness is with
        you.
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="flex size-5 items-center justify-center rounded-full bg-brass text-[10px] font-bold text-brand-foreground">1</span>
          Download your acknowledgement
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          The official NYPD form, pre-filled with your details. Print it to sign.
        </p>
        <Button asChild size="sm" className="mt-3">
          <a href={`/g/${token}/document`} target="_blank" rel="noreferrer">
            <Download className="size-4" /> Download the form
          </a>
        </Button>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="flex size-5 items-center justify-center rounded-full bg-brass text-[10px] font-bold text-brand-foreground">2</span>
          <PenLine className="size-4 text-brass" /> Sign it in front of a witness
        </div>
        <p className="mt-1 text-xs text-muted-foreground">
          Any adult can witness. Sign where indicated while they watch; your witness prints their name and
          signs too. No notary is required for this form.
        </p>
      </div>

      <div className="rounded-lg border bg-card p-4">
        <div className="flex items-center gap-2 text-sm font-medium">
          <span className="flex size-5 items-center justify-center rounded-full bg-brass text-[10px] font-bold text-brand-foreground">3</span>
          Upload the signed copy
        </div>
        <p className="mt-1 text-xs text-muted-foreground">A clear photo or scan of the signed, witnessed form.</p>
        <NotarizedTokenUpload
          upload={(fd) => uploadSignedSafeguard(token, fd)}
          noun="acknowledgement"
          onDone={() => setPhase("done")}
        />
      </div>
    </div>
  )
}
