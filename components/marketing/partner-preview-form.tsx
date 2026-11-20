"use client"

import { useActionState } from "react"
import { submitPreviewCode, type PreviewFormState } from "@/app/(marketing)/partners/preview-actions"

const INITIAL: PreviewFormState = {}

/**
 * The coming-soon preview-code form. A single input + button on one row; a wrong code
 * shows an inline message that keeps what was typed and reserves its own line so nothing
 * shifts. Without JavaScript the native POST still runs the server action (a right code
 * still lets you in); the inline error text is the progressive-enhancement extra.
 */
export function PartnerPreviewForm({ path }: { path: string }) {
  const [state, action, pending] = useActionState(submitPreviewCode, INITIAL)

  return (
    <form action={action} className="mx-auto mt-8 max-w-sm">
      <input type="hidden" name="to" value={path} />
      <div className="flex gap-2">
        <input
          name="code"
          type="text"
          autoComplete="off"
          aria-label="Preview code"
          aria-invalid={state.error ? true : undefined}
          defaultValue={state.value ?? ""}
          placeholder="Preview code"
          className="min-w-0 flex-1 rounded-md border border-[var(--rule)] bg-[var(--paper)] px-3 py-2 text-base text-[var(--ink)] outline-none transition-colors placeholder:text-[var(--ink-muted)] focus-visible:border-[var(--electric)] focus-visible:ring-2 focus-visible:ring-[var(--electric)]/30 md:text-sm"
        />
        <button type="submit" disabled={pending} className="button shrink-0 disabled:opacity-50">
          Enter
        </button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-left text-sm text-[var(--error)]">
        {state.error ?? ""}
      </p>
    </form>
  )
}
