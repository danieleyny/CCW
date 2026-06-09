"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { recordDocument } from "@/app/portal/actions"
import { StatusBadge } from "@/components/shared/status-badge"
import { Button } from "@/components/ui/button"
import type { DocumentType } from "@/config/checklist-templates"

const MAX_BYTES = 15 * 1024 * 1024 // 15 MB

export interface CurrentDoc {
  status: string
  review_notes: string | null
  version: number
  signedUrl: string | null
}

export function DocumentUploader({
  caseId,
  clientId,
  type,
  label,
  description,
  current,
}: {
  caseId: string
  clientId: string
  type: DocumentType
  label: string
  description?: string
  current: CurrentDoc | null
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = "" // allow re-selecting the same file
    if (!file) return
    if (file.size > MAX_BYTES) {
      toast.error("That file is over 15 MB. Please choose a smaller one.")
      return
    }

    setBusy(true)
    try {
      const supabase = createClient()
      const documentId = crypto.randomUUID()
      const safeName = file.name.replace(/[^a-zA-Z0-9._-]/g, "_")
      const path = `clients/${clientId}/${documentId}/${safeName}`

      const { error: upErr } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: true })
      if (upErr) throw upErr

      await recordDocument({ documentId, caseId, type, path, fileName: file.name })
      toast.success(`Uploaded — ${label} is now pending review.`)
      router.refresh()
    } catch (err) {
      console.error(err)
      toast.error("Upload failed. Please try again.")
    } finally {
      setBusy(false)
    }
  }

  const needsFix = current?.status === "rejected"

  return (
    <div className="rounded-lg border bg-card p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <div className="text-sm font-medium">{label}</div>
          {description && <p className="mt-0.5 text-xs text-muted-foreground">{description}</p>}
        </div>
        {current ? (
          <StatusBadge status={current.status} />
        ) : (
          <span className="text-xs text-muted-foreground">Not uploaded</span>
        )}
      </div>

      {needsFix && current?.review_notes && (
        <p className="mt-2 rounded-md bg-destructive/10 p-2 text-xs text-destructive">
          Needs a fix: {current.review_notes}
        </p>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          ref={inputRef}
          type="file"
          accept="image/*,application/pdf"
          capture="environment"
          className="hidden"
          onChange={onFile}
        />
        <Button
          size="sm"
          variant={current ? "outline" : "default"}
          disabled={busy}
          onClick={() => inputRef.current?.click()}
        >
          {busy ? (
            <Loader2 className="size-4 animate-spin" />
          ) : (
            <Upload className="size-4" />
          )}
          {current ? (needsFix ? "Re-upload" : "Replace") : "Upload"}
        </Button>
        {current?.signedUrl && (
          <Button asChild size="sm" variant="ghost">
            <a href={current.signedUrl} target="_blank" rel="noreferrer">
              <ExternalLink className="size-4" /> View
            </a>
          </Button>
        )}
        {current && <span className="text-xs text-muted-foreground">v{current.version}</span>}
      </div>
    </div>
  )
}
