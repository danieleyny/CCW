"use client"

import { useState, useTransition } from "react"
import { Send, CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { sendSafeguardInvite } from "@/app/portal/requirements/actions"
import { CopyLinkButton } from "@/components/portal/copy-link-button"
import { Button } from "@/components/ui/button"

/**
 * SFG-01 — send the designated safeguard person a private link to complete, sign
 * (before a witness) and upload NYPD's acknowledgement themselves. Their email comes
 * from the safeguard facts on "Your details". Mirrors the reference/cohabitant invite.
 */
export function SafeguardInvite({ caseId }: { caseId?: string }) {
  const [pending, start] = useTransition()
  const [token, setToken] = useState<string | null>(null)
  const [sentTo, setSentTo] = useState<string | null>(null)

  function send() {
    start(async () => {
      const r = await sendSafeguardInvite(caseId)
      if (r.error) {
        toast.error(r.error)
        return
      }
      setToken(r.token ?? null)
      setSentTo(r.email ?? null)
      toast.success(
        r.emailed ? "Link sent to the safeguard person." : "Link ready — copy it and send it to them.",
        { description: r.email ?? undefined }
      )
    })
  }

  return (
    <div className="mt-3 rounded-md border border-hairline bg-surface-2/40 p-3">
      <p className="text-xs text-text-mid">
        We can send the person you designated a private link to complete and sign this themselves — they sign
        it in front of a witness (no notary) and upload it. No account needed.
      </p>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <Button size="sm" variant="outline" onClick={send} disabled={pending}>
          {pending ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
          {sentTo ? "Resend the link" : "Send them the link"}
        </Button>
        {token && <CopyLinkButton token={token} basePath="/g/" />}
      </div>
      {sentTo && (
        <p className="mt-2 flex items-center gap-1.5 text-[11px] text-ok">
          <CheckCircle2 className="size-3.5" /> Sent to {sentTo}. This completes when their signed
          acknowledgement is uploaded.
        </p>
      )}
    </div>
  )
}
