"use client"

import { useState, useTransition } from "react"
import { Copy, Loader2, Mail, Check } from "lucide-react"
import { toast } from "sonner"
import { sendClientInvite } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

/**
 * CONCIERGE QA Phase 5 — send (or copy) a set-password invite for a provisioned
 * account, so a staff-created client is never locked out. When email is on it
 * sends the branded invite; either way it hands back a copyable link.
 */
export function InviteClientButton({ caseId }: { caseId: string }) {
  const [pending, start] = useTransition()
  const [link, setLink] = useState<string | null>(null)

  function go() {
    start(async () => {
      const r = await sendClientInvite(caseId)
      if (r.error) {
        toast.error(r.error)
        return
      }
      setLink(r.link ?? null)
      toast.success(r.sent ? "Invite emailed to the client." : "Invite link ready — copy it below.")
    })
  }

  return (
    <div className="flex flex-col items-start gap-1.5">
      <Button size="sm" variant="outline" onClick={go} disabled={pending} aria-busy={pending}>
        {pending ? <Loader2 className="mr-1.5 size-3.5 animate-spin" /> : <Mail className="mr-1.5 size-3.5" />}
        {link ? "Resend invite" : "Send invite"}
      </Button>
      {link && (
        <button
          type="button"
          onClick={() => {
            navigator.clipboard.writeText(link)
            toast.success("Invite link copied")
          }}
          className="inline-flex max-w-[240px] items-center gap-1.5 truncate rounded-md border border-hairline bg-surface-2 px-2 py-1 text-[11px] text-text-mid transition-colors hover:text-foreground"
          title="Copy the set-password link"
        >
          <Copy className="size-3 shrink-0" />
          <span className="truncate">Copy set-password link</span>
          <Check className="size-3 shrink-0 text-ok" />
        </button>
      )}
    </div>
  )
}
