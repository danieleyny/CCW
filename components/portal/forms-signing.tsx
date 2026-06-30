"use client"

import { useState, useTransition } from "react"
import { Download, FileText, Check, PenLine } from "lucide-react"
import { toast } from "sonner"
import { Card, CardContent } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { SignaturePad } from "@/components/sign/signature-pad"
import { saveApplicantSignature, fileSignedForm } from "@/app/portal/forms/actions"

export type FormDoc = {
  key: string
  title: string
  desc: string
  notarize: boolean
  fileable: boolean
  filed: boolean
}

export function FormsSigning({ docs, hasSignature }: { docs: FormDoc[]; hasSignature: boolean }) {
  const [hasSig, setHasSig] = useState(hasSignature)
  const [showPad, setShowPad] = useState(!hasSignature)
  const [saving, startSave] = useTransition()
  const [filing, setFiling] = useState<string | null>(null)
  const [filed, setFiled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(docs.filter((d) => d.filed).map((d) => [d.key, true]))
  )

  function save(b64: string) {
    startSave(async () => {
      const r = await saveApplicantSignature(b64)
      if (r.error) return void toast.error(r.error)
      setHasSig(true)
      setShowPad(false)
      toast.success("Signature saved — your forms now download pre-signed.")
    })
  }

  function file(key: string) {
    setFiling(key)
    fileSignedForm(key).then((r) => {
      setFiling(null)
      if (r.error) return void toast.error(r.error)
      setFiled((f) => ({ ...f, [key]: true }))
      toast.success("Signed and filed — this requirement is complete.")
    })
  }

  return (
    <>
      <Card>
        <CardContent className="p-5">
          <div className="flex items-start justify-between gap-3">
            <div>
              <h3 className="flex items-center gap-1.5 text-sm font-semibold">
                <PenLine className="size-4 text-signal" /> Your signature
              </h3>
              <p className="mt-1 text-xs text-muted-foreground">
                {hasSig
                  ? "On file — your documents download already signed, and you can file them in one tap."
                  : "Sign once and every form below comes out pre-signed."}
              </p>
            </div>
            {hasSig && (
              <span className="inline-flex shrink-0 items-center gap-1 text-xs text-ok">
                <Check className="size-3.5" /> On file
              </span>
            )}
          </div>
          {showPad ? (
            <div className="mt-3 max-w-md">
              <SignaturePad onSave={save} saving={saving} />
            </div>
          ) : (
            <Button variant="outline" size="sm" className="mt-3" onClick={() => setShowPad(true)}>
              Re-sign
            </Button>
          )}
        </CardContent>
      </Card>

      <div className="grid gap-3 sm:grid-cols-2">
        {docs.map((d) => {
          const isFiled = filed[d.key]
          return (
            <Card key={d.key}>
              <CardContent className="flex h-full flex-col p-5">
                <FileText className="size-5 text-signal" />
                <h3 className="mt-2 text-sm font-semibold">{d.title}</h3>
                <p className="mt-1 flex-1 text-xs text-muted-foreground">{d.desc}</p>
                <div className="mt-3 flex flex-wrap items-center gap-2">
                  <Button asChild size="sm" variant="outline">
                    <a href={`/portal/forms/${d.key}`} target="_blank" rel="noreferrer">
                      <Download className="size-4" /> Download
                    </a>
                  </Button>
                  {d.fileable &&
                    (isFiled ? (
                      <span className="inline-flex items-center gap-1 text-xs text-ok">
                        <Check className="size-3.5" /> Filed
                      </span>
                    ) : (
                      <Button size="sm" disabled={!hasSig || filing === d.key} onClick={() => file(d.key)}>
                        {filing === d.key ? "Filing…" : "Sign & file"}
                      </Button>
                    ))}
                  {d.notarize && <span className="text-[10px] uppercase tracking-wide text-brass">notarize</span>}
                </div>
                {d.fileable && !hasSig && !isFiled && (
                  <p className="mt-2 text-[11px] text-muted-foreground">Add your signature above to file this in one tap.</p>
                )}
              </CardContent>
            </Card>
          )
        })}
      </div>
    </>
  )
}
