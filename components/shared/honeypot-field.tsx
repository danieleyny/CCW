import { HONEYPOT_FIELD } from "@/lib/honeypot"

/**
 * The standard off-screen anti-bot field for public forms. Bots fill it; humans never
 * see it. Named + attributed to avoid browser autofill and password managers (which
 * previously filled a "company" honeypot from the visitor's saved profile and silently
 * flagged real people as bots). See lib/honeypot.ts for the rationale.
 *
 * A plain presentational component (no "use client") — safe inside both server forms
 * and client forms.
 */
export function HoneypotField() {
  return (
    <div aria-hidden="true" className="absolute left-[-9999px] top-auto h-px w-px overflow-hidden">
      <label htmlFor={HONEYPOT_FIELD}>Leave this field blank</label>
      <input
        id={HONEYPOT_FIELD}
        type="text"
        name={HONEYPOT_FIELD}
        tabIndex={-1}
        autoComplete="off"
        data-1p-ignore="true"
        data-lpignore="true"
        data-form-type="other"
      />
    </div>
  )
}
