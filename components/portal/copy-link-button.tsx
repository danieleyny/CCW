"use client"

import { useState } from "react"
import { Link2, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"

/** Copy a tokenized self-serve link so the applicant can share it directly. */
export function CopyLinkButton({ token, basePath = "/r/" }: { token: string; basePath?: string }) {
  const [copied, setCopied] = useState(false)
  const { messages } = usePortalI18n()
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={async () => {
        const url = `${window.location.origin}${basePath}${token}`
        try {
          await navigator.clipboard.writeText(url)
        } catch {
          /* clipboard may be blocked; the toast still shows the link */
        }
        setCopied(true)
        toast.success(messages.ui.linkCopied, { description: `${window.location.origin}${basePath}${token}` })
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />} {messages.ui.copyLink}
    </Button>
  )
}
