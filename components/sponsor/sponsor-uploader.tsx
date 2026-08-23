"use client"

import { useRef, useState, useTransition } from "react"
import { Check, Loader2, Upload } from "lucide-react"
import { toast } from "sonner"
import { uploadSponsorDocument } from "@/app/sponsor/actions"
import { Button } from "@/components/ui/button"

/**
 * Upload one company-packet document. Posts the file to a server action (the rep
 * has no direct storage grant, so the write is server-mediated via the admin
 * client after the binding is verified). Company packet only — the sponsor never
 * uploads the applicant's sworn material, and there is no signature control here.
 */
export function SponsorUploader({
  caseId,
  reqCode,
  satisfied,
  fileName,
}: {
  caseId: string
  reqCode: string
  satisfied: boolean
  fileName: string | null
}) {
  const inputRef = useRef<HTMLInputElement>(null)
  const [pending, start] = useTransition()
  const [done, setDone] = useState(satisfied)

  function onPick(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0]
    if (!file) return
    const fd = new FormData()
    fd.set("caseId", caseId)
    fd.set("reqCode", reqCode)
    fd.set("file", file)
    start(async () => {
      const r = await uploadSponsorDocument(fd)
      if (r.error) {
        toast.error(r.error)
        return
      }
      setDone(true)
      toast.success("Uploaded — your Gun License NYC team will review it.")
    })
    if (inputRef.current) inputRef.current.value = ""
  }

  return (
    <div className="flex items-center gap-2">
      <input ref={inputRef} type="file" className="hidden" onChange={onPick} />
      <Button
        size="sm"
        variant={done ? "outline" : "default"}
        onClick={() => inputRef.current?.click()}
        disabled={pending}
        className="min-h-[36px]"
      >
        {pending ? (
          <Loader2 className="size-3.5 animate-spin" />
        ) : done ? (
          <Check className="size-3.5" />
        ) : (
          <Upload className="size-3.5" />
        )}
        <span className="ml-1">{done ? (fileName ? "Replace" : "Uploaded") : "Upload"}</span>
      </Button>
    </div>
  )
}
