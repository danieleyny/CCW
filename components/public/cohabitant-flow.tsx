"use client"

import { useState, useTransition, useRef } from "react"
import { CheckCircle2, Download, MapPin, Upload, ExternalLink, Stamp, Video } from "lucide-react"
import { submitCohabitantAnswers, uploadNotarizedCohabitant, saveCohabitantSignature } from "@/app/c/actions"
import { notaryOptions, ronOptions } from "@/lib/references/notary"
import { compressImageFile } from "@/lib/files/compress"
import { SignaturePad } from "@/components/sign/signature-pad"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

type Phase = "confirm" | "sign" | "notarize" | "done"

export function CohabitantFlow({
  token,
  cohabitantName,
  relationship,
  applicant,
  initialStatus,
}: {
  token: string
  cohabitantName: string
  relationship: string | null
  applicant: string
  initialStatus: string
}) {
  const [phase, setPhase] = useState<Phase>(
    initialStatus === "notarized" ? "done" : initialStatus === "received" ? "notarize" : "confirm"
  )
  const [area, setArea] = useState("")
  const [attest, setAttest] = useState(false)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()
  const fileRef = useRef<HTMLInputElement>(null)

  function confirm() {
    setError("")
    if (!attest) return setError("Please confirm the attestation to continue.")
    start(async () => {
      const res = await submitCohabitantAnswers(token, {}, area)
      if (res.error) setError(res.error)
      else setPhase("sign")
    })
  }
  function sign(b64: string) {
    setError("")
    start(async () => {
      const res = await saveCohabitantSignature(token, b64)
      if (res.error) setError(res.error)
      else setPhase("notarize")
    })
  }
  function uploadFile() {
    setError("")
    const f = fileRef.current?.files?.[0]
    if (!f) return setError("Choose the notarized file to upload.")
    start(async () => {
      const compressed = await compressImageFile(f) // HEIC→JPEG + downscale
      const fd = new FormData()
      fd.set("file", compressed)
      const res = await uploadNotarizedCohabitant(token, fd)
      if (res.error) setError(res.error)
      else setPhase("done")
    })
  }

  if (phase === "done") {
    return (
      <div className="mt-6 rounded-lg border border-ok/30 bg-ok/10 p-6 text-center">
        <CheckCircle2 className="mx-auto size-8 text-ok" />
        <p className="mt-2 text-sm">
          Thank you. Your notarized affidavit for {applicant} has been received — nothing more is needed.
        </p>
      </div>
    )
  }

  if (phase === "sign") {
    return (
      <div className="mt-6 space-y-4">
        <div className="rounded-lg border bg-card p-4 text-sm">
          Add your signature and we&apos;ll place it on the affidavit for you. (You can also skip and sign by hand.)
        </div>
        <div className="max-w-md">
          <SignaturePad onSave={sign} saving={pending} label="Sign &amp; continue" />
        </div>
        <Button variant="ghost" size="sm" onClick={() => setPhase("notarize")} disabled={pending}>
          Skip — I&apos;ll sign by hand
        </Button>
        {error && <p className="text-sm text-danger">{error}</p>}
      </div>
    )
  }

  if (phase === "notarize") {
    const opts = notaryOptions(area)
    const ron = ronOptions()
    return (
      <div className="mt-6 space-y-5">
        <div className="rounded-lg border border-ok/30 bg-ok/10 p-3 text-sm text-ok">
          <CheckCircle2 className="mr-1 inline size-4" /> Confirmed. Download your affidavit, get it notarized, and upload it.
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-5 items-center justify-center rounded-full bg-brass text-[10px] font-bold text-brand-foreground">1</span>
            Download your affidavit
          </div>
          <Button asChild size="sm" className="mt-3">
            <a href={`/c/${token}/document`} target="_blank" rel="noreferrer">
              <Download className="size-4" /> Download PDF
            </a>
          </Button>
        </div>
        <div className="rounded-lg border bg-card p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <span className="flex size-5 items-center justify-center rounded-full bg-brass text-[10px] font-bold text-brand-foreground">2</span>
            <Stamp className="size-4 text-brass" /> Get it notarized
          </div>
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
        <div className="rounded-lg border border-signal/30 bg-signal/5 p-4">
          <div className="flex items-center gap-2 text-sm font-medium">
            <Video className="size-4 text-signal" /> Prefer not to travel? Notarize online
          </div>
          <p className="mt-1 text-xs text-text-low">
            New York allows Remote Online Notarization — notarize by live video in minutes. Upload the same PDF to any of these:
          </p>
          <ul className="mt-2 space-y-1.5">
            {ron.map((o) => (
              <li key={o.label} className="text-sm">
                <a href={o.url} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1 text-signal underline">
                  {o.label} <ExternalLink className="size-3" />
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
            <Upload className="size-4" /> {pending ? "Uploading…" : "Upload notarized affidavit"}
          </Button>
          {error && <p className="mt-2 text-sm text-danger">{error}</p>}
        </div>
      </div>
    )
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-lg border bg-card p-4 text-sm">
        You&apos;re confirming you&apos;re <b>{cohabitantName || "the named household member"}</b>
        {relationship ? ` (${relationship})` : ""} and that you live with <b>{applicant}</b>, who has applied for
        a NYC concealed-carry license. We&apos;ll build a ready-to-notarize affidavit for you.
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="area" className="text-xs">Your ZIP or neighborhood (so we can suggest a notary near you)</Label>
        <div className="flex gap-2">
          <Input id="area" value={area} placeholder="e.g. 11215 or Park Slope" onChange={(e) => setArea(e.target.value)} />
          <Button
            type="button" variant="outline" size="sm"
            onClick={() =>
              navigator.geolocation?.getCurrentPosition(
                (p) => setArea(`${p.coords.latitude.toFixed(4)},${p.coords.longitude.toFixed(4)}`),
                () => setError("Couldn't get your location — just type your ZIP.")
              )
            }
          >
            <MapPin className="size-4" /> Use my location
          </Button>
        </div>
      </div>
      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-0.5 size-4" />
        <span>
          I affirm that I live in the same household as {applicant}, that I understand any firearm will be kept
          securely stored, and that I have no objection to their licensure.
        </span>
      </label>
      <Button onClick={confirm} disabled={pending || !attest}>
        {pending ? "Saving…" : "Next — build my affidavit"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
