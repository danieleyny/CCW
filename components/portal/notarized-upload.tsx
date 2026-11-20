"use client"

import { useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Upload, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { createClient } from "@/lib/supabase/client"
import { validateFile } from "@/lib/files/validator"
import { compressImageFile } from "@/lib/files/compress"
import { Button } from "@/components/ui/button"
import { usePortalI18n } from "@/components/shared/portal-i18n-provider"

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
  personName,
}: {
  targetId: string
  clientId: string
  record: (input: { targetId: string; path: string; fileName: string; documentId: string }) => Promise<void>
  label?: string
  personName?: string
}) {
  const { messages } = usePortalI18n()
  const router = useRouter()
  const inputRef = useRef<HTMLInputElement>(null)
  const [busy, setBusy] = useState(false)
  const [failed, setFailed] = useState(false)

  async function onFile(e: React.ChangeEvent<HTMLInputElement>) {
    let file = e.target.files?.[0]
    e.target.value = ""
    if (!file) return
    setFailed(false)
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
      setFailed(true)
      toast.error("Upload failed. Try again.")
    } finally {
      setBusy(false)
    }
  }

  return (
    <>
      <input ref={inputRef} type="file" accept="image/*,application/pdf" className="hidden" onChange={onFile} />
      <div className="flex flex-col items-start gap-1.5">
        <Button
          size="sm"
          variant="outline"
          disabled={busy}
          onClick={() => inputRef.current?.click()}
          aria-label={`${label === "Upload notarized" ? messages.ui.uploadNotarized : label}${personName ? ` — ${personName}` : ""}`}
          className="min-h-9 border-dashed bg-white"
        >
          {busy ? <Loader2 className="size-3.5 animate-spin" /> : <Upload className="size-3.5" />}
          {busy ? messages.ui.peopleUploading : label === "Upload notarized" ? messages.ui.uploadNotarized : label}
        </Button>
        {failed ? (
          <div className="rounded-lg border border-danger/20 bg-danger/[0.06] px-2.5 py-2 text-[12px] text-danger" role="alert">
            <span>{messages.ui.peopleUploadFailed}</span>{" "}
            <button type="button" onClick={() => inputRef.current?.click()} className="font-semibold underline">
              {messages.ui.peopleTryAgain}
            </button>
          </div>
        ) : null}
      </div>
    </>
  )
}
