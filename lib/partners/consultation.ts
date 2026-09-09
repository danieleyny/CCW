/**
 * The attorney-consultation request — shared shape for BOTH the server action
 * (authoritative validation + Formspree notification) and the client form (inline
 * per-field errors). A "use server" module may only export async functions, so the
 * schema, the option lists and the state type live here, in a plain module both sides
 * import.
 *
 * This is a screened referral request, NOT a sales lead: it never creates a client,
 * case, task or appointment row. It is forwarded to the attorney by email so he arrives
 * at the call already briefed, and the person is told up front it is not privileged.
 */
import { z } from "zod"

/** "What is your question about?" — verbatim from the spec, in order. */
export const CONSULTATION_TOPICS = [
  "A past arrest, summons or conviction",
  "An application that was denied",
  "A licence that was suspended or revoked",
  "An order of protection or a domestic incident",
  "Citizenship or immigration status",
  "A mental-health or medical disclosure question",
  "Where and how I can carry or transport a firearm",
  "Employment or professional-licence consequences",
  "Renewing or amending an existing licence",
  "Something else",
] as const

/** "Where are you in the process?" — verbatim, in order. */
export const CONSULTATION_STAGES = [
  "Haven't applied yet",
  "Preparing my application",
  "Filed and waiting",
  "Interview scheduled or completed",
  "Denied",
  "Already licensed",
] as const

/** The description must be long enough for him to prepare. */
export const DISCUSS_MIN = 40

/** The value a checked acknowledgement submits (an unchecked box submits nothing). */
export const ACK_VALUE = "agreed"

export const consultationSchema = z.object({
  name: z.string().trim().min(2, "Please enter your full name"),
  email: z.string().trim().email("Enter a valid email address"),
  phone: z.string().trim().min(7, "Enter a phone number he can reach you on"),
  bestTimes: z.string().trim().max(200).optional(),
  topic: z.enum(CONSULTATION_TOPICS, { message: "Choose what your question is about" }),
  stage: z.enum(CONSULTATION_STAGES, { message: "Tell him where you are in the process" }),
  targetDate: z.string().trim().max(40).optional(),
  discuss: z
    .string()
    .trim()
    .min(DISCUSS_MIN, `Please add a little more — at least ${DISCUSS_MIN} characters, so he can prepare`),
  represented: z.enum(["yes", "no"], { message: "This conflicts check is required" }),
  acknowledge: z.literal(ACK_VALUE, { message: "Please confirm you understand before sending" }),
  /** Which partner the request is for — validated server-side against config. */
  partnerSlug: z.string().trim().min(1),
})

export type ConsultationFields = z.infer<typeof consultationSchema>

/** The field keys that can carry an inline error (everything except partnerSlug). */
export type ConsultationFieldKey = Exclude<keyof ConsultationFields, "partnerSlug">

export type ConsultState = {
  ok?: boolean
  /** A form-level error (rate limit, unknown partner) — shown once, near the button. */
  error?: string
  /** Per-field messages, rendered inline under each field. */
  fieldErrors?: Partial<Record<ConsultationFieldKey, string>>
}

/** Flatten a zod error into our per-field map (first message per field wins). */
export function toFieldErrors(error: z.ZodError): ConsultState["fieldErrors"] {
  const out: Partial<Record<ConsultationFieldKey, string>> = {}
  for (const issue of error.issues) {
    const key = issue.path[0]
    if (typeof key === "string" && key !== "partnerSlug" && !(key in out)) {
      out[key as ConsultationFieldKey] = issue.message
    }
  }
  return out
}
