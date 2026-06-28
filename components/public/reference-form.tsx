"use client"

import { useState, useTransition } from "react"
import { CheckCircle2 } from "lucide-react"
import { submitReference } from "@/app/r/actions"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"

export function ReferenceForm({
  token,
  referenceName,
  relationship,
  applicant,
  alreadyDone,
}: {
  token: string
  referenceName: string
  relationship: string | null
  applicant: string
  alreadyDone: boolean
}) {
  const [done, setDone] = useState(alreadyDone)
  const [attest, setAttest] = useState(false)
  const [statement, setStatement] = useState("")
  const [notarized, setNotarized] = useState(false)
  const [error, setError] = useState("")
  const [pending, start] = useTransition()

  if (done) {
    return (
      <div className="mt-6 rounded-lg border border-ok/30 bg-ok/10 p-6 text-center">
        <CheckCircle2 className="mx-auto size-8 text-ok" />
        <p className="mt-2 text-sm">
          Thank you. Your character reference has been recorded — nothing more is needed.
        </p>
      </div>
    )
  }

  function submit() {
    setError("")
    start(async () => {
      const res = await submitReference(token, { attest, statement, notarized })
      if (res.error) setError(res.error)
      else setDone(true)
    })
  }

  return (
    <div className="mt-6 space-y-4">
      <div className="rounded-lg border bg-card p-4 text-sm">
        <p>
          You&apos;re confirming you&apos;re <b>{referenceName || "the named reference"}</b>
          {relationship ? ` (${relationship})` : ""} and that you know <b>{applicant}</b>.
        </p>
      </div>

      <div className="space-y-1.5">
        <Label htmlFor="statement" className="text-xs">
          Your statement (optional)
        </Label>
        <Textarea
          id="statement"
          rows={4}
          value={statement}
          onChange={(e) => setStatement(e.target.value)}
          placeholder="How long and in what capacity have you known the applicant? Anything you'd want the licensing officer to know."
        />
      </div>

      <label className="flex items-start gap-2 text-sm">
        <input type="checkbox" checked={attest} onChange={(e) => setAttest(e.target.checked)} className="mt-0.5 size-4" />
        <span>
          I attest that the statements above are true, and that to my knowledge the applicant
          is of good moral character.
        </span>
      </label>

      <label className="flex items-center gap-2 text-sm">
        <input type="checkbox" checked={notarized} onChange={(e) => setNotarized(e.target.checked)} className="size-4" />
        This statement has been notarized.
      </label>

      <Button onClick={submit} disabled={pending || !attest}>
        {pending ? "Submitting…" : "Submit reference"}
      </Button>
      {error && <p className="text-sm text-danger">{error}</p>}
    </div>
  )
}
