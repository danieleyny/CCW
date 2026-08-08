"use client"

import { useRef, useState, useTransition } from "react"
import { Upload, FileCheck2, AlertCircle } from "lucide-react"
import { compressImageFile } from "@/lib/files/compress"
import { validateFile } from "@/lib/files/validator"
import { brand } from "@/config/brand"
import { Button } from "@/components/ui/button"

/**
 * Upload control for the invited reference / cohabitant token flows.
 *
 * The old inline version paired a bare native <input> with a separate submit
 * button that was NOT wired to it, so tapping the prominent button ran the
 * validation ("choose a file") instead of opening the OS picker. This restores
 * the pattern used everywhere else: a visually-hidden input plus a real
 * "Choose file" button that calls input.click() SYNCHRONOUSLY (no await before
 * the click — Safari/iOS drop the user-activation otherwise and the picker
 * never opens). Selection is shown, then a separate Upload button submits.
 */

// PDF + any image; .heic/.heif spelled out because some browsers don't fold
// them into image/*. No `capture` — a notarized doc is often a gallery photo or
// a file, so we must not force the camera.
const ACCEPT = "application/pdf,image/*,.heic,.heif"

export function NotarizedTokenUpload({
  upload,
  noun,
  onDone,
}: {
  /** Server action already bound to the token; resolves { error } on failure. */
  upload: (formData: FormData) => Promise<{ error?: string }>
  /** e.g. "reference" or "affidavit" — used in the button label. */
  noun: string
  onDone: () => void
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [chosen, setChosen] = useState<File | null>(null)
  const [error, setError] = useState("")
  const [fails, setFails] = useState(0)
  const [pending, start] = useTransition()

  function openPicker() {
    setError("")
    // Synchronous with the tap — do not await anything before this call.
    inputRef.current?.click()
  }

  function onChange(e: React.ChangeEvent<HTMLInputElement>) {
    setError("")
    const f = e.target.files?.[0]
    e.target.value = "" // clear so re-picking the same file still fires change
    if (!f) return // picker was cancelled — keep any earlier choice
    const check = validateFile({ name: f.name, size: f.size })
    if (!check.ok) {
      // Wrong type is always fatal. Oversize is only fatal for PDFs — images get
      // downscaled by the compressor before the real check at upload time.
      const wrongType = check.errors.some((m) => m.startsWith("Unsupported"))
      if (wrongType) {
        setChosen(null)
        return setError("That's not a file we can read. Upload a PDF, or a photo (JPG, PNG, or HEIC).")
      }
      if (check.extension === "pdf") {
        setChosen(null)
        return setError("That PDF is over 5 MB. Save or print it at a smaller size, or upload a photo instead.")
      }
    }
    setChosen(f)
  }

  function submit() {
    if (!chosen) return setError('Choose the notarized file first — tap "Choose the notarized file" above.')
    setError("")
    start(async () => {
      try {
        const compressed = await compressImageFile(chosen) // HEIC→JPEG + downscale
        const recheck = validateFile({ name: compressed.name, size: compressed.size })
        if (!recheck.ok) {
          setFails((n) => n + 1)
          return setError(
            recheck.extension === "pdf" || compressed.type === "application/pdf"
              ? "That file is over 5 MB. Try a smaller scan, or a photo instead."
              : "That photo is still over 5 MB after compression. Try a smaller or lower-resolution image."
          )
        }
        const fd = new FormData()
        fd.set("file", compressed)
        const res = await upload(fd)
        if (res.error) {
          setFails((n) => n + 1)
          return setError(res.error)
        }
        onDone()
      } catch {
        setFails((n) => n + 1)
        setError("Something went wrong sending that file. Check your connection and try again.")
      }
    })
  }

  return (
    <div>
      <input ref={inputRef} type="file" accept={ACCEPT} className="sr-only" onChange={onChange} />
      <div className="mt-3 flex flex-wrap items-center gap-2">
        <Button type="button" variant="outline" size="sm" onClick={openPicker} disabled={pending}>
          <Upload className="size-4" /> {chosen ? "Choose a different file" : "Choose the notarized file"}
        </Button>
        {chosen && (
          <span className="inline-flex min-w-0 items-center gap-1 text-xs text-ok">
            <FileCheck2 className="size-3.5 shrink-0" /> <span className="truncate">{chosen.name}</span>
          </span>
        )}
      </div>

      {chosen && (
        <Button onClick={submit} disabled={pending} size="sm" className="mt-3">
          <Upload className="size-4" /> {pending ? "Uploading…" : `Upload notarized ${noun}`}
        </Button>
      )}

      {error && (
        <p className="mt-2 flex items-start gap-1.5 text-sm text-danger">
          <AlertCircle className="mt-0.5 size-4 shrink-0" />
          <span>{error}</span>
        </p>
      )}

      {fails >= 2 && (
        <p className="mt-2 text-xs text-text-low">
          Still stuck? Reply to your invitation email, or contact us at{" "}
          <a href={`mailto:${brand.contact.email}`} className="underline">
            {brand.contact.email}
          </a>{" "}
          or{" "}
          <a href={`tel:${brand.contact.phone.replace(/[^\d+]/g, "")}`} className="underline">
            {brand.contact.phone}
          </a>{" "}
          and we&apos;ll help you get it in.
        </p>
      )}
    </div>
  )
}
