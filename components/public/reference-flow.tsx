"use client"

import { useState, useTransition, useRef } from "react"
import { CheckCircle2, Download, MapPin, Upload, ExternalLink, Stamp } from "lucide-react"
import { submitReferenceAnswers, uploadNotarizedReference } from "@/app/r/actions"
import { REFERENCE_QUESTIONS, type ReferenceAnswers } from "@/lib/references/questions"
import { notaryOptions } from "@/lib/references/notary"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

type Phase = "answers" | "notarize" | "done"

export function ReferenceFlow({
  token,
  referenceName,
  relationship,
  applicant,
  initialStatus,
}: {
  token: string
  referenceName: string
  relationship: string | null
  applicant: string
  initialStatus: string
}) {
  const [phase, setPhase] = useState<Phase>(
    initialStatus === "notarized" ? "done" : initialStatus === "submitted" ? "notarize" : "answers"
  )
  const [answers, setAnswers] = useState<ReferenceAnswers>({})
  const [area, setArea] = useState("")
  const [attest, setAttest] = useState(false)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function setA(k: string, v: string) {
    setAnswers((a) => ({ ...a, [k]: v }))
  }

  function submitAnswers() {
    setError("")
    if (!attest) return setError("Please confirm the attestation to continue.")
    start(async () => {
      const res = await submitReferenceAnswers(token, answers, area)
      if (res.error) setError(res.error)
      else setPhase("notarize")
    })
  }

  function uploadFile() {
    setError("")
    const f = fileRef.current?.files?.[0]
    if (!f) return setError("Choose the notarized file to upload.")
    const fd = new FormData()
    fd.set("file", f)
    start(async () => {
      const res = await uploadNotarizedReference(token, fd)
      if (res.error) setError(res.error)
      else setPhase("done")
    })
  }

  if (phase === "done") {
    return (
      <div className="mt-6 rounded-lg border border-ok/30 bg-ok/10 p-6 text-center">
        <CheckCircle2 className="mx-auto size-8 text-ok" />
        <p className="mt-2 text-sm">
          Thank you. Your notarized character reference for {applicant} has been received —
          nothing more is needed. They&apos;ve been notified.
        </p>
      </div>
    )
  }

  if (phase === "notarize") {
    const opts = notaryOptions(area)
    return (
      <div className="mt-6 space-y-5">
        <div className="rounded-lg border border-ok/30 bg-ok/10 p-3 text-sm text-ok">
          <CheckCircle2 className="mr-1 inline size-4" /> Your answers are saved. Two steps left:
          download your letter, get it notarized, and upload it here.
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-5 items-center justify-center rounded-full bg-brass text-[10px] font-bold text-brand-foreground">1</span>
            Download your reference letter
          </div>
          <p className="mt-1 text-xs text-muted-foreground">A ready-to-sign PDF built from your answers, with a notary block.</p>
          <Button asChild size="sm" className="mt-3">
            <a href={`/r/${token}/document`} target="_blank" rel="noreferrer">
              <Download className="size-4" /> Download PDF
            </a>
          </Button>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-5 items-center justify-center rounded-full bg-brass text-[10px] font-bold text-brand-foreground">2</span>
            <Stamp className="size-4 text-brass" /> Get it notarized
          </div>
          <p className="mt-1 text-xs text-muted-foreground">Notary options near you:</p>
          <ul className="mt-2 space-y-1.5">
            {opts.map((o) => (
              <li key={o.label} className="text-sm">
                <a href={o.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal underline">
                  <MapPin className="size-3.5" /> {o.label} <ExternalLink className="size-3" />
                </a>
                <span className="ml-1 text-xs text-text-low">— {o.note}</span>
              </li>
            ))}
          </ul>
        </div>

        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-5 items-center justify-center rounded-full bg-brass text-[10px] font-bold text-brand-foreground">3</span>
            Upload the notarized copy
          </div>
          <input ref={fileRef} type="file" accept="image/*,application/pdf" className="mt-3 block w-full text-sm" />
          <Button onClick={uploadFile} disabled={pending} size="sm" className="mt-3">
            <Upload className="size-4" /> {pending ? "Uploading…" : "Upload notarized reference"}
          </Button>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      </div>
    )
  }

  // phase === "answers"
  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-lg border bg-card p-4 text-sm">
        You&apos;re confirming you&apos;re <b>{referenceName || "the named reference"}</b>
        {relationship ? ` (${relationship})` : ""} and that you know <b>{applicant}</b>. Answer a few
        questions and we&apos;ll build a ready-to-notarize letter for you.
      </div>

      {REFERENCE_QUESTIONS.map((q) => (
        <div key={q.key} className="space-y-1.5">
          <Label htmlFor={q.key} className="text-xs">
            {q.label} {q.required && <span className="text-danger">*</span>}
          </Label>
          {q.type === "textarea" ? (
            <Textarea id={q.key} rows={3} value={answers[q.key] ?? ""} onChange={(e) => setA(q.key, e.target.value)} />
          ) : (
            <Input id={q.key} value={answers[q.key] ?? ""} onChange={(e) => setA(q.key, e.target.value)} />
          )}
        </div>
      ))}

      <div className="space-y-1.5">
        <Label htmlFor="area" className="text-xs">Your ZIP or neighborhood (so we can suggest a notary near you)</Label>
        <div className="flex gap-2">
          <Input id="area" value={area} placeholder="e.g. 11215 or Park Slope" onChange={(e) => setArea(e.target.value)} />
          <Button
            type="button"
            variant="outline"
            size="sm"
            onClick={() => {
              navigator.geolocation?.getCurrentPosition(
                (p) => setArea(`${p.coords.latitude.toFixed(4)},${p.coords.longitude.toFixed(4)}`),
                () => setError("Couldn't get your location — just type your ZIP.")
              )
            }}
          >
            <MapPin className="size-4" /> Use my location
          </Button>
        </div>
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-0.5 size-4" />
        <span>I attest that my answers are true and that, to my knowledge, {applicant} is of good moral character.</span>
      </label>

      <Button onClick={submitAnswers} disabled={pending || !attest}>
        {pending ? "Saving…" : "Next — build my letter"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
