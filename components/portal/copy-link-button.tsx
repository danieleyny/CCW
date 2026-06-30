"use client"

import { useState } from "react"
import { Link2, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"

/** Copy the reference's tokenized link so the applicant can share it directly. */
export function CopyLinkButton({ token }: { token: string }) {
  const [copied, setCopied] = useState(false)
  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={async () => {
        const url = `${window.location.origin}/r/${token}`
        try {
          await navigator.clipboard.writeText(url)
        } catch {
          /* clipboard may be blocked; the toast still shows the link */
        }
        setCopied(true)
        toast.success("Reference link copied", { description: `${window.location.origin}/r/${token}` })
        setTimeout(() => setCopied(false), 1500)
      }}
    >
      {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />} Copy link
    </Button>
  )
}
