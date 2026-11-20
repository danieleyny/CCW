"use client"

import { useState } from "react"
import { Link2, Check } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"

/**
 * Copy a tokenized self-serve link so the applicant can share it directly. Tries the async
 * clipboard API, falls back to a hidden-textarea + execCommand when it's blocked, and
 * confirms with a brief INLINE state. Pass `silent` to suppress the toast (finding 5:
 * confirm inline, not with a toast) — used wherever a compact per-row copy-link lives.
 */
export function CopyLinkButton({
  token,
  basePath = "/r/",
  silent = false,
  label,
  personName,
}: {
  token: string
  basePath?: string
  silent?: boolean
  label?: string
  personName?: string
}) {
  const [copied, setCopied] = useState(false)
  const { messages } = usePortalI18n()
  const displayLabel = label ?? messages.ui.copyLink

  async function copy() {
    const url = `${window.location.origin}${basePath}${token}`
    let ok = false
    try {
      await navigator.clipboard.writeText(url)
      ok = true
    } catch {
      // Clipboard API blocked (older browser / insecure context) — fall back to selecting
      // hidden text and copying it the old way.
      try {
        const ta = document.createElement("textarea")
        ta.value = url
        ta.style.position = "fixed"
        ta.style.opacity = "0"
        document.body.appendChild(ta)
        ta.focus()
        ta.select()
        ok = document.execCommand("copy")
        document.body.removeChild(ta)
      } catch {
        ok = false
      }
    }
    setCopied(true)
    setTimeout(() => setCopied(false), 1600)
    if (!silent) {
      if (ok) toast.success(messages.ui.linkCopied, { description: url })
      else toast.error("Couldn't copy — long-press the link to copy it manually.")
    }
  }

  return (
    <Button
      size="sm"
      variant="ghost"
      onClick={copy}
      aria-label={personName ? `${displayLabel} — ${personName}` : `${displayLabel} for this person`}
      className="min-h-9"
    >
      {copied ? <Check className="size-3.5" /> : <Link2 className="size-3.5" />} {copied ? messages.ui.linkCopied : displayLabel}
    </Button>
  )
}
