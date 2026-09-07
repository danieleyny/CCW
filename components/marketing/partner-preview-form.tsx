"use client"

import { useActionState } from "react"
import { Button } from "@/components/ui/button"
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
          className="min-w-0 flex-1 rounded-md border border-hairline bg-card px-3 py-2 text-sm text-text-hi outline-none placeholder:text-text-low focus:border-hairline-strong"
        />
        <Button type="submit" disabled={pending} className="shrink-0">
          Enter
        </Button>
      </div>
      <p aria-live="polite" className="mt-2 min-h-5 text-left text-sm text-danger">
        {state.error ?? ""}
      </p>
    </form>
  )
}
