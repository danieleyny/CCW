"use client"

import { useTransition } from "react"
import { ExternalLink, Loader2, Lock } from "lucide-react"
import { toast } from "sonner"
import { openSponsorDocument } from "@/app/sponsor/actions"
import { Button } from "@/components/ui/button"

/**
 * Opens a full-scope applicant document. The server RPC checks access AND records
 * the read to document_access_log before any URL is minted, so the applicant sees
 * every open. Sensitive rows carry the lock-and-eye marker so the rep knows the
 * read is logged BEFORE they click — that's what makes the access defensible.
 */
export function OpenDocumentButton({
  documentId,
  sensitive,
}: {
  documentId: string
  sensitive: boolean
}) {
  const [pending, start] = useTransition()

  function open() {
    start(async () => {
      const r = await openSponsorDocument(documentId)
      if (r.error || !r.url) {
        toast.error(r.error ?? "Couldn't open that document.")
        return
      }
      window.open(r.url, "_blank", "noopener,noreferrer")
    })
  }

  return (
    <div className="flex items-center gap-2">
      {sensitive && (
        <span className="inline-flex items-center gap-1 rounded-full border border-warn/40 bg-warn/10 px-2 py-0.5 text-[11px] text-warn">
          <Lock className="size-3" /> Sensitive · your access is logged
        </span>
      )}
      <Button size="sm" variant="outline" onClick={open} disabled={pending} className="min-h-[36px]">
        {pending ? <Loader2 className="size-3.5 animate-spin" /> : <ExternalLink className="size-3.5" />}
        <span className="ml-1">Open</span>
      </Button>
    </div>
  )
}
