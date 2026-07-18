"use client"

import { useState, useTransition } from "react"
import { PenLine, ShieldCheck } from "lucide-react"
import { toast } from "sonner"
import { signRequirementDocument } from "@/app/portal/requirements/actions"
import { SIGNING_CONSENT } from "@/lib/requirements/consent"
import { SignaturePad } from "@/components/sign/signature-pad"
import { Button } from "@/components/ui/button"

/**
 * The SIGN step. A generated document is a DRAFT until this runs: the applicant
 * either applies the signature already on file or draws a new one, and the
 * server re-renders the document with the signature and the signing date, then
 * records the signing act. Nothing here marks anything complete on its own.
 */
export function SignDocument({
  reqCode,
  signatureOnFile,
  onSigned,
}: {
  reqCode: string
  /** Base64 PNG of the signature already captured for this case, if any. */
  signatureOnFile: string | null
  onSigned?: () => void
}) {
  const [resign, setResign] = useState(!signatureOnFile)
  const [pending, startTransition] = useTransition()

  const sign = (base64?: string) =>
    startTransition(async () => {
      const r = await signRequirementDocument(reqCode, base64)
      if (r.error) {
        toast.error(r.error)
        return
      }
      toast.success("Signed. Your document is ready to download.")
      onSigned?.()
    })

  return (
    <div className="space-y-3 rounded-md border border-hairline bg-surface-2/40 p-3">
      <div className="flex items-center gap-2 text-sm font-medium">
        <PenLine className="size-4 text-brass" />
        Sign this document
      </div>
      <p className="text-xs text-text-mid">{SIGNING_CONSENT}</p>

      {signatureOnFile && !resign ? (
        <div className="space-y-2">
          <div className="rounded-md border border-hairline bg-white p-2">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={`data:image/png;base64,${signatureOnFile}`}
              alt="Your signature on file"
              className="h-14 w-auto"
            />
          </div>
          <div className="flex flex-wrap gap-2">
            <Button size="sm" disabled={pending} onClick={() => sign()}>
              {pending ? "Signing…" : "Use this signature & sign"}
            </Button>
            <Button size="sm" variant="outline" disabled={pending} onClick={() => setResign(true)}>
              Sign again
            </Button>
          </div>
        </div>
      ) : (
        <SignaturePad onSave={(b64) => sign(b64)} saving={pending} label="Apply signature & sign" />
      )}

      <p className="flex items-start gap-1.5 text-xs text-text-low">
        <ShieldCheck className="mt-0.5 size-3.5 shrink-0" />
        We record the date, your signature, and a fingerprint of the exact document you signed.
      </p>
    </div>
  )
}
