"use client"

import { useActionState, useId, useState, type ReactNode } from "react"
import { CheckCircle2 } from "lucide-react"
import { requestConsultation } from "@/app/(marketing)/consultation-actions"
import {
  CONSULTATION_TOPICS,
  CONSULTATION_STAGES,
  DISCUSS_MIN,
  ACK_VALUE,
  type ConsultState,
  type ConsultationFieldKey,
} from "@/lib/partners/consultation"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Textarea } from "@/components/ui/textarea"
import { Button } from "@/components/ui/button"
import { HoneypotField } from "@/components/shared/honeypot-field"

/** The serialisable slice of a Partner this client form needs. */
export type ConsultationPartner = {
  slug: string
  name: string
  fullName: string
  rate: { amount: number; unit: string }
}

/** 16px on mobile (no iOS zoom on focus), 14px from md up — matches Input/Textarea. */
const SELECT_CLASS =
  "h-11 w-full rounded-md border border-hairline-strong bg-surface-3 px-3 text-base text-foreground outline-none transition-colors focus-visible:border-signal/50 focus-visible:ring-2 focus-visible:ring-signal/40 aria-invalid:border-destructive aria-invalid:ring-2 aria-invalid:ring-destructive/30 md:text-sm"

export function ConsultationForm({ partner }: { partner: ConsultationPartner }) {
  const [state, action, pending] = useActionState<ConsultState, FormData>(requestConsultation, {})
  const rate = `$${partner.rate.amount} per ${partner.rate.unit}`

  // Controlled so a validation round-trip never clears anything the person typed.
  const [name, setName] = useState("")
  const [email, setEmail] = useState("")
  const [phone, setPhone] = useState("")
  const [bestTimes, setBestTimes] = useState("")
  const [topic, setTopic] = useState("")
  const [stage, setStage] = useState("")
  const [targetDate, setTargetDate] = useState("")
  const [discuss, setDiscuss] = useState("")
  const [represented, setRepresented] = useState("")
  const [acknowledge, setAcknowledge] = useState(false)

  const err = (k: ConsultationFieldKey) => state.fieldErrors?.[k]

  if (state.ok) {
    return (
      <div className="rounded-xl border border-ok/30 bg-ok/8 p-8 text-center">
        <CheckCircle2 className="mx-auto size-8 text-ok" />
        <h2 className="mt-3 font-display text-xl font-semibold text-text-hi">Your request is on its way.</h2>
        <p className="mx-auto mt-2 max-w-md text-text-mid">
          We&apos;ve forwarded it to {partner.fullName}. He reviews each request personally and will
          reach out at his earliest availability to arrange a call. Consultations are billed at his
          rate of {rate}.
        </p>
        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-text-low">
          Nothing you sent is privileged, and no attorney–client relationship has been created. Please
          don&apos;t send documents or anything confidential until he confirms he can act for you.
        </p>
      </div>
    )
  }

  return (
    <form action={action} noValidate className="space-y-8">
      <input type="hidden" name="partnerSlug" value={partner.slug} />
      {/* Honeypot — off-screen; a bot that fills it gets a silent fake success. */}
      <HoneypotField />

      {/* 1 · WHO YOU ARE */}
      <fieldset className="space-y-4">
        <Legend n="1">Who you are</Legend>
        <div className="grid gap-4 sm:grid-cols-2">
          <Field id="c-name" label="Full name" error={err("name")}>
            {(p) => (
              <Input name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} {...p} />
            )}
          </Field>
          <Field id="c-email" label="Email" error={err("email")}>
            {(p) => (
              <Input name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} {...p} />
            )}
          </Field>
          <Field id="c-phone" label="Phone" error={err("phone")}>
            {(p) => (
              <Input name="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} {...p} />
            )}
          </Field>
          <Field id="c-times" label="Best times to reach you" optional error={err("bestTimes")}>
            {(p) => (
              <Input
                name="bestTimes"
                placeholder="e.g. weekday mornings"
                value={bestTimes}
                onChange={(e) => setBestTimes(e.target.value)}
                {...p}
              />
            )}
          </Field>
        </div>
      </fieldset>

      {/* 2 · WHAT IT'S ABOUT */}
      <fieldset className="space-y-4 border-t border-hairline pt-8">
        <Legend n="2">What it&apos;s about</Legend>
        <Field id="c-topic" label="What is your question about?" error={err("topic")}>
          {(p) => (
            <select name="topic" value={topic} onChange={(e) => setTopic(e.target.value)} className={SELECT_CLASS} {...p}>
              <option value="" disabled>
                Select…
              </option>
              {CONSULTATION_TOPICS.map((t) => (
                <option key={t} value={t}>
                  {t}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field id="c-stage" label="Where are you in the process?" error={err("stage")}>
          {(p) => (
            <select name="stage" value={stage} onChange={(e) => setStage(e.target.value)} className={SELECT_CLASS} {...p}>
              <option value="" disabled>
                Select…
              </option>
              {CONSULTATION_STAGES.map((s) => (
                <option key={s} value={s}>
                  {s}
                </option>
              ))}
            </select>
          )}
        </Field>
        <Field
          id="c-date"
          label="Is there a date you're working toward?"
          optional
          hint="A hearing, a deadline, an interview — anything time-sensitive."
          error={err("targetDate")}
        >
          {(p) => (
            <Input name="targetDate" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} {...p} />
          )}
        </Field>
        <Field
          id="c-discuss"
          label="What would you like to discuss?"
          hint={`Enough for him to prepare — what happened, when, and what you need to know. Don't include documents or anything you'd consider confidential; you can bring those to the call. (At least ${DISCUSS_MIN} characters.)`}
          error={err("discuss")}
        >
          {(p) => (
            <Textarea name="discuss" rows={6} value={discuss} onChange={(e) => setDiscuss(e.target.value)} {...p} />
          )}
        </Field>
      </fieldset>

      {/* 3 · BEFORE YOU SEND */}
      <fieldset className="space-y-5 border-t border-hairline pt-8">
        <Legend n="3">Before you send</Legend>

        <div className="space-y-2">
          <span id="c-rep-label" className="block text-sm font-medium text-text-hi">
            Are you currently represented by another attorney on this matter?
          </span>
          <p className="text-xs text-text-low">
            This is a conflicts check. An attorney needs it before taking a call.
          </p>
          <div role="radiogroup" aria-labelledby="c-rep-label" aria-invalid={!!err("represented")} className="flex gap-3">
            {(["no", "yes"] as const).map((val) => (
              <label
                key={val}
                className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-md border border-hairline-strong bg-surface-3 px-4 py-3 text-sm text-text-hi has-[:checked]:border-signal/60 has-[:checked]:bg-signal/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-signal/40"
              >
                <input
                  type="radio"
                  name="represented"
                  value={val}
                  checked={represented === val}
                  onChange={(e) => setRepresented(e.target.value)}
                  className="size-4 accent-signal"
                />
                {val === "no" ? "No" : "Yes"}
              </label>
            ))}
          </div>
          {err("represented") && <FieldError id="c-rep-err">{err("represented")}</FieldError>}
        </div>

        {/* Disclosure — muted but legible, NOT fine print. Directly above the ack. */}
        <div className="space-y-2 rounded-lg border border-hairline bg-surface-2/50 p-4 text-sm leading-relaxed text-text-mid">
          <p>
            This form is received by Gun License NYC and forwarded to {partner.fullName}. It is{" "}
            <strong className="text-text-hi">not an attorney–client communication and it is not privileged.</strong>
          </p>
          <p>
            Submitting it does not create an attorney–client relationship. That begins only if he
            agrees to represent you and you sign his engagement letter.
          </p>
          <p>
            Please don&apos;t attach documents or send anything you would consider confidential until
            he has confirmed he can act for you.
          </p>
          <p>Gun License NYC is not a law firm and receives no share of his fees.</p>
        </div>

        <div className="space-y-2">
          <label className="flex cursor-pointer items-start gap-3 text-sm text-text-mid">
            <input
              type="checkbox"
              name="acknowledge"
              value={ACK_VALUE}
              checked={acknowledge}
              onChange={(e) => setAcknowledge(e.target.checked)}
              aria-invalid={!!err("acknowledge")}
              className="mt-0.5 size-4 shrink-0 accent-signal"
            />
            <span>
              I understand that sending this form does not make {partner.fullName} my attorney, and
              that this message is not confidential or privileged.
            </span>
          </label>
          {err("acknowledge") && <FieldError id="c-ack-err">{err("acknowledge")}</FieldError>}
        </div>
      </fieldset>

      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}

      <div className="space-y-3">
        <Button type="submit" size="lg" disabled={pending} className="w-full sm:w-auto">
          {pending ? "Sending…" : "Send my request"}
        </Button>
        <p className="text-sm text-text-low">
          {partner.fullName} reviews each request personally and will reach out at his earliest
          availability to arrange a call. Consultations are billed at his rate of {rate}.
        </p>
      </div>
    </form>
  )
}

function Legend({ n, children }: { n: string; children: ReactNode }) {
  return (
    <legend className="flex items-center gap-3">
      <span className="flex size-6 items-center justify-center rounded-full border border-brass/40 bg-brass/10 font-mono text-xs text-brass">
        {n}
      </span>
      <span className="font-display text-lg font-semibold tracking-tight text-text-hi">{children}</span>
    </legend>
  )
}

/**
 * A labelled field with an inline error. Passes the a11y props (id, aria-invalid,
 * aria-describedby) into the control via render-prop so the error is announced.
 */
function Field({
  id,
  label,
  optional,
  hint,
  error,
  children,
}: {
  id: string
  label: string
  optional?: boolean
  hint?: string
  error?: string
  children: (props: {
    id: string
    "aria-invalid": boolean
    "aria-describedby"?: string
  }) => ReactNode
}) {
  const hintId = useId()
  const errId = useId()
  const describedBy = [hint ? hintId : null, error ? errId : null].filter(Boolean).join(" ") || undefined
  return (
    <div className="space-y-1.5">
      <Label htmlFor={id}>
        {label}
        {optional && <span className="ml-1 font-normal text-text-low">(optional)</span>}
      </Label>
      {hint && (
        <p id={hintId} className="text-xs leading-relaxed text-text-low">
          {hint}
        </p>
      )}
      {children({ id, "aria-invalid": !!error, "aria-describedby": describedBy })}
      {error && <FieldError id={errId}>{error}</FieldError>}
    </div>
  )
}

function FieldError({ id, children }: { id: string; children: ReactNode }) {
  return (
    <p id={id} className="text-sm text-destructive" role="alert">
      {children}
    </p>
  )
}
