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
import { HoneypotField } from "@/components/shared/honeypot-field"

/** The serialisable slice of a Partner this client form needs. */
export type ConsultationPartner = {
  slug: string
  name: string
  fullName: string
  rate: { amount: number; unit: string }
}

/**
 * v2 field surface. 16px on mobile (no iOS zoom on focus), 14px from md up — the
 * text-base → md:text-sm step is what keeps iOS from zooming, so keep it.
 */
const FIELD_CLASS =
  "w-full rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 text-base text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-muted)] focus-visible:border-[var(--electric)] focus-visible:ring-2 focus-visible:ring-[var(--electric)]/30 aria-invalid:border-[var(--error)] aria-invalid:ring-2 aria-invalid:ring-[var(--error)]/25 md:text-sm"
const INPUT_CLASS = `h-11 ${FIELD_CLASS}`
const SELECT_CLASS = INPUT_CLASS
const TEXTAREA_CLASS = `min-h-[9rem] py-2.5 leading-relaxed ${FIELD_CLASS}`

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
      <div className="rounded-xl border border-[var(--success)]/30 bg-[var(--success)]/8 p-8 text-center">
        <CheckCircle2 className="mx-auto size-8 text-[var(--success)]" />
        <h2
          style={{ fontFamily: "var(--display)" }}
          className="mt-3 text-xl font-semibold text-[var(--ink)]"
        >
          Your request is on its way.
        </h2>
        <p className="mx-auto mt-2 max-w-md text-[var(--ink-soft)]">
          We&apos;ve forwarded it to {partner.fullName}. He reviews each request personally and will
          reach out at his earliest availability to arrange a call. Consultations are billed at his
          rate of {rate}.
        </p>
        <p className="mx-auto mt-4 max-w-md text-xs leading-relaxed text-[var(--ink-muted)]">
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
              <input name="name" autoComplete="name" value={name} onChange={(e) => setName(e.target.value)} className={INPUT_CLASS} {...p} />
            )}
          </Field>
          <Field id="c-email" label="Email" error={err("email")}>
            {(p) => (
              <input name="email" type="email" autoComplete="email" value={email} onChange={(e) => setEmail(e.target.value)} className={INPUT_CLASS} {...p} />
            )}
          </Field>
          <Field id="c-phone" label="Phone" error={err("phone")}>
            {(p) => (
              <input name="phone" type="tel" autoComplete="tel" value={phone} onChange={(e) => setPhone(e.target.value)} className={INPUT_CLASS} {...p} />
            )}
          </Field>
          <Field id="c-times" label="Best times to reach you" optional error={err("bestTimes")}>
            {(p) => (
              <input
                name="bestTimes"
                placeholder="e.g. weekday mornings"
                value={bestTimes}
                onChange={(e) => setBestTimes(e.target.value)}
                className={INPUT_CLASS}
                {...p}
              />
            )}
          </Field>
        </div>
      </fieldset>

      {/* 2 · WHAT IT'S ABOUT */}
      <fieldset className="space-y-4 border-t border-[var(--rule)] pt-8">
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
            <input name="targetDate" type="date" value={targetDate} onChange={(e) => setTargetDate(e.target.value)} className={INPUT_CLASS} {...p} />
          )}
        </Field>
        <Field
          id="c-discuss"
          label="What would you like to discuss?"
          hint={`Enough for him to prepare — what happened, when, and what you need to know. Don't include documents or anything you'd consider confidential; you can bring those to the call. (At least ${DISCUSS_MIN} characters.)`}
          error={err("discuss")}
        >
          {(p) => (
            <textarea name="discuss" rows={6} value={discuss} onChange={(e) => setDiscuss(e.target.value)} className={TEXTAREA_CLASS} {...p} />
          )}
        </Field>
      </fieldset>

      {/* 3 · BEFORE YOU SEND */}
      <fieldset className="space-y-5 border-t border-[var(--rule)] pt-8">
        <Legend n="3">Before you send</Legend>

        <div className="space-y-2">
          <span id="c-rep-label" className="block text-sm font-medium text-[var(--ink)]">
            Are you currently represented by another attorney on this matter?
          </span>
          <p className="text-xs text-[var(--ink-muted)]">
            This is a conflicts check. An attorney needs it before taking a call.
          </p>
          <div role="radiogroup" aria-labelledby="c-rep-label" aria-invalid={!!err("represented")} className="flex gap-3">
            {(["no", "yes"] as const).map((val) => (
              <label
                key={val}
                className="flex flex-1 cursor-pointer items-center gap-2.5 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-4 py-3 text-sm text-[var(--ink)] has-[:checked]:border-[var(--electric)] has-[:checked]:bg-[var(--electric)]/10 has-[:focus-visible]:ring-2 has-[:focus-visible]:ring-[var(--electric)]/30"
              >
                <input
                  type="radio"
                  name="represented"
                  value={val}
                  checked={represented === val}
                  onChange={(e) => setRepresented(e.target.value)}
                  className="size-4 accent-[var(--electric)]"
                />
                {val === "no" ? "No" : "Yes"}
              </label>
            ))}
          </div>
          {err("represented") && <FieldError id="c-rep-err">{err("represented")}</FieldError>}
        </div>

        {/* Disclosure — muted but legible, NOT fine print. Directly above the ack. */}
        <div className="space-y-2 rounded-lg border border-[var(--rule)] bg-[var(--ivory)] p-4 text-sm leading-relaxed text-[var(--ink-soft)]">
          <p>
            This form is received by Gun License NYC and forwarded to {partner.fullName}. It is{" "}
            <strong className="text-[var(--ink)]">not an attorney–client communication and it is not privileged.</strong>
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
          <label className="flex cursor-pointer items-start gap-3 text-sm text-[var(--ink-soft)]">
            <input
              type="checkbox"
              name="acknowledge"
              value={ACK_VALUE}
              checked={acknowledge}
              onChange={(e) => setAcknowledge(e.target.checked)}
              aria-invalid={!!err("acknowledge")}
              className="mt-0.5 size-4 shrink-0 accent-[var(--electric)]"
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
        <p className="text-sm text-[var(--error)]" role="alert">
          {state.error}
        </p>
      )}

      <div className="space-y-3">
        <button type="submit" disabled={pending} className="button w-full disabled:opacity-50 sm:w-auto">
          {pending ? "Sending…" : "Send my request"}
        </button>
        <p className="text-sm text-[var(--ink-muted)]">
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
      <span
        style={{ fontFamily: "var(--mono)" }}
        className="flex size-6 items-center justify-center rounded-full border border-[var(--electric)]/40 bg-[var(--electric)]/10 text-xs text-[var(--electric-deep)]"
      >
        {n}
      </span>
      <span
        style={{ fontFamily: "var(--display)" }}
        className="text-lg font-semibold tracking-tight text-[var(--ink)]"
      >
        {children}
      </span>
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
      <label htmlFor={id} className="block text-sm font-medium text-[var(--ink)]">
        {label}
        {optional && <span className="ml-1 font-normal text-[var(--ink-muted)]">(optional)</span>}
      </label>
      {hint && (
        <p id={hintId} className="text-xs leading-relaxed text-[var(--ink-muted)]">
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
    <p id={id} className="text-sm text-[var(--error)]" role="alert">
      {children}
    </p>
  )
}
