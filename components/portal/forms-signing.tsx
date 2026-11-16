"use client"

import { useState, useTransition } from "react"
import { Check, Download, FileText, PenLine, Signature } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import { SignaturePad } from "@/components/sign/signature-pad"
import { saveApplicantSignature, fileSignedForm } from "@/app/portal/forms/actions"
import type { PortalFormDoc } from "@/lib/forms/portal-forms"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"

export type FormDoc = PortalFormDoc

export function FormsSigning({
  docs,
  signaturePng,
  applicantName,
}: {
  docs: FormDoc[]
  signaturePng: string | null
  applicantName: string
}) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  const [sigPng, setSigPng] = useState(signaturePng)
  const [hasSig, setHasSig] = useState(!!signaturePng)
  const [showPad, setShowPad] = useState(false)
  const [saving, startSave] = useTransition()
  const [filing, setFiling] = useState<string | null>(null)
  const [filed, setFiled] = useState<Record<string, boolean>>(() =>
    Object.fromEntries(docs.filter((doc) => doc.filed).map((doc) => [doc.key, true]))
  )

  function save(base64: string) {
    startSave(async () => {
      const result = await saveApplicantSignature(base64)
      if (result.error) return void toast.error(result.error)
      setSigPng(base64)
      setHasSig(true)
      setShowPad(false)
      toast.success(t.formsSignatureSaved)
    })
  }

  function file(key: string) {
    setFiling(key)
    fileSignedForm(key).then((result) => {
      setFiling(null)
      if (result.error) return void toast.error(result.error)
      setFiled((current) => ({ ...current, [key]: true }))
      toast.success(t.formsFiledToast)
    })
  }

  const filedCount = docs.filter((doc) => filed[doc.key]).length

  return (
    <>
      <section className="forms-signature-card">
        <span className="forms-signature-icon" aria-hidden><Signature /></span>
        <div className="forms-signature-copy">
          <h2>{t.yourSignature}</h2>
          <p>{hasSig ? t.signatureOnFileDetail : t.signatureEmptyDetail}</p>
        </div>
        <div className={`forms-signature-preview ${hasSig ? "has-signature" : "is-empty"}`} aria-label={hasSig ? t.signaturePreview : t.noSignatureOnFile}>
          {sigPng ? (
            <span style={{ backgroundImage: `url(data:image/png;base64,${sigPng})` }} />
          ) : hasSig ? (
            <span className="forms-signature-name">{applicantName}</span>
          ) : (
            <span>{t.noSignatureYet}</span>
          )}
        </div>
        {hasSig && <span className="forms-signature-status"><Check aria-hidden /> {t.onFile}</span>}
        <Button type="button" variant={hasSig ? "outline" : "default"} onClick={() => setShowPad((current) => !current)}>
          <PenLine aria-hidden /> {showPad ? t.cancel : hasSig ? t.resign : t.addSignature}
        </Button>
        {showPad && (
          <div className="forms-signature-pad">
            <SignaturePad onSave={save} saving={saving} />
          </div>
        )}
      </section>

      <section className="forms-list-section">
        <header className="forms-list-heading">
          <h2>{t.yourForms}</h2>
          <span>{interpolate(t.preparedFiled, { prepared: docs.length, filed: filedCount })}</span>
        </header>
        <div className="forms-table">
          <div className="forms-table-head" aria-hidden>
            <span>{t.form}</span><span>{t.signingMethod}</span><span>{t.status}</span><span>{t.actions}</span>
          </div>
          {docs.map((doc) => {
            const isFiled = filed[doc.key]
            return (
              <article className="forms-row" id={`form-${doc.key}`} key={doc.key}>
                <div className="forms-row-document">
                  <span className="forms-doc-icon" aria-hidden><FileText /></span>
                  <div><h3>{doc.title}</h3><p>{doc.desc}</p></div>
                </div>
                <div className="forms-row-how"><SigningChip doc={doc} /></div>
                <div className="forms-row-status">
                  <span className={isFiled ? "is-filed" : ""}>{isFiled ? t.filed : t.notFiled}</span>
                </div>
                <div className="forms-row-actions">
                  {doc.fileable && !isFiled && (
                    <Button size="sm" disabled={!hasSig || filing === doc.key} onClick={() => file(doc.key)}>
                      <Signature aria-hidden /> {filing === doc.key ? t.filing : t.signFile}
                    </Button>
                  )}
                  <Button asChild size="sm" variant="outline">
                    <a href={`/portal/forms/${doc.key}`} target="_blank" rel="noreferrer"><Download aria-hidden /> {t.download}</a>
                  </Button>
                </div>
                {doc.fileable && !hasSig && !isFiled && <p className="forms-row-hint">{t.addSignatureHint}</p>}
              </article>
            )
          })}
        </div>
      </section>
    </>
  )
}

function SigningChip({ doc }: { doc: FormDoc }) {
  const { messages } = usePortalI18n()
  const t = messages.ui
  if (doc.fileable) return <span className="forms-signing-chip is-one-tap">{t.oneTap}</span>
  if (doc.notarize === "notarize") return <span className="forms-signing-chip is-notary">{t.needsNotary}</span>
  if (doc.notarize === "witness") return <span className="forms-signing-chip is-witness">{t.needsWitness}</span>
  return <span className="forms-signing-chip is-download">{t.downloadSignUpload}</span>
}
