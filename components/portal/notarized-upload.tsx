"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { validateFile } from "@/lib/files/validator"
import { compressImageFile } from "@/lib/files/compress"
import { Button } from "@/components/ui/button"

/**
 * Applicant fallback uploader for a notarized doc they collected directly.
 * Uploads to Storage (client RLS), then calls the supplied server action to bind
 * it. Reused for references and cohabitant affidavits.
 */
export function NotarizedUpload({
  targetId,
  clientId,
  record,
  label = "Upload notarized",
}: {
  targetId: string
  clientId: string
  record: (input: { targetId: string; path: string; fileName: string; documentId: string }) => Promise<void>
  label?: string
}) {
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    let file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    file = await compressImageFile(file) // HEIC→JPEG + downscale before the size check
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
      await record({ targetId, path, fileName: check.sanitizedName, documentId })
      toast.success("Notarized document saved.")
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
        {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />} {label}
      </Button>
    </>
  )
}
