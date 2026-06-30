"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { recordReferenceUpload } from "@/app/portal/people/actions"
import { validateFile } from "@/lib/files/validator"
import { Button } from "@/components/ui/button"

/** Applicant fallback: upload a notarized reference they collected directly. */
export function ReferenceUpload({ referenceId, clientId }: { referenceId: string; clientId: string }) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    const check = validateFile({ name: file.name, size: file.size })
    if (!check.ok) return toast.error(check.errors[0] ?? "That file can't be uploaded.")

    setBusy(true)
    try {
      const supabase = createClient()
      const documentId = crypto.randomUUID()
      const path = `clients/${clientId}/${documentId}/${check.sanitizedName}`
      const { error } = await supabase.storage
        .from("documents")
        .upload(path, file, { contentType: file.type || "application/octet-stream", upsert: true })
      if (error) throw error
      await recordReferenceUpload({ referenceId, path, fileName: check.sanitizedName, documentId })
      toast.success("Notarized reference saved.")
      router.refresh()
    } catch {
      toast.error("Upload failed. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
      <Button size="sm" variant="ghost" disabled={busy} onClick={() => inputRef.current?.click()}>
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} Upload notarized
      </Button>
    </>
  )
}
