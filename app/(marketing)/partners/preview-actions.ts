"use server"

import { redirect } from "next/navigation"
import { revalidatePath } from "next/cache"
import { codeMatches, setPreviewCookie } from "@/lib/partners/preview"

export interface PreviewFormState {
  error?: string
  /** Echoed back so a wrong attempt keeps what was typed (no layout shift, no reset). */
  value?: string
}

/**
 * The coming-soon preview form. SOFT gate, not authentication. On a matching code it
 * sets the opaque preview cookie and lands the visitor on the clean partner URL; on a
 * miss it returns an inline error and preserves what they typed. Fails closed when
 * PARTNER_PREVIEW_CODE is unset.
 */
export async function submitPreviewCode(
  _prev: PreviewFormState,
  formData: FormData
): Promise<PreviewFormState> {
  const code = String(formData.get("code") ?? "")
  const to = String(formData.get("to") ?? "/partners")
  const safeTo = to.startsWith("/") && !to.startsWith("//") ? to : "/partners"

  if (codeMatches(code)) {
    await setPreviewCookie()
    revalidatePath(safeTo)
    redirect(safeTo)
  }
  return { error: "That code doesn't match.", value: code }
}
