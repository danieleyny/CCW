import { headers } from "next/headers"
import { z } from "zod"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createClient } from "@/lib/supabase/server"
import { hasPaidPackage } from "@/lib/packages"
import { isFirearmAppHost } from "@/lib/firearm-site"
import { clientIpFrom, rateLimit } from "@/lib/rate-limit"
import { logActivity } from "@/lib/activity"
import {
  answerFirearmQuestion,
  containsSensitiveData,
  FIREARM_ASSISTANT_ENABLED,
  FIREARM_ASSISTANT_MODEL,
  needsAttorneyBoundary,
  sourcesForQuestion,
} from "@/lib/ai/firearm-assistant"

export const runtime = "nodejs"
export const maxDuration = 30

const requestSchema = z.object({
  messages: z.array(z.object({
    role: z.enum(["user", "assistant"]),
    content: z.string().min(1).max(2000),
  })).min(1).max(12),
})

export async function POST(request: Request) {
  const auth = await requireRole(["client"])
  const requestHeaders = await headers()
  if (!isFirearmAppHost(requestHeaders.get("host"))) {
    return Response.json({ error: "Not found." }, { status: 404 })
  }
  if (!rateLimit(`firearm-assistant:${auth.userId}:${clientIpFrom(requestHeaders)}`, 10, 60_000)) {
    return Response.json({ error: "Please wait a minute before asking another question." }, { status: 429 })
  }

  const parsed = requestSchema.safeParse(await request.json().catch(() => null))
  if (!parsed.success || parsed.data.messages.at(-1)?.role !== "user") {
    return Response.json({ error: "Enter a question to continue." }, { status: 400 })
  }

  const myCase = await getMyCase()
  if (!myCase) return Response.json({ error: "No active case was found." }, { status: 403 })
  const supabase = await createClient()
  const [selfGuided, concierge] = await Promise.all([
    hasPaidPackage(supabase, myCase.id, "self_guided"),
    hasPaidPackage(supabase, myCase.id, "full_concierge"),
  ])
  if (!selfGuided && !concierge) {
    return Response.json({ error: "The full assistant unlocks after your service payment is recorded." }, { status: 402 })
  }
  if (!FIREARM_ASSISTANT_ENABLED) {
    return Response.json({ error: "The Claude assistant is being connected. Please try again shortly." }, { status: 503 })
  }

  const currentQuestion = parsed.data.messages.at(-1)!.content.trim()
  if (containsSensitiveData(currentQuestion)) {
    return Response.json({ error: "Please remove personal identifiers, contact details, passwords, or case numbers before asking." }, { status: 400 })
  }

  try {
    const result = await answerFirearmQuestion(parsed.data.messages)
    await logActivity({
      action: "firearm_assistant.answer_generated",
      caseId: myCase.id,
      clientId: myCase.client_id,
      entity: "assistant",
      detail: {
        model: FIREARM_ASSISTANT_MODEL,
        input_tokens: result.usage.input_tokens,
        output_tokens: result.usage.output_tokens,
        // Deliberately exclude question and answer text from the audit log.
      },
    })
    return Response.json({
      answer: result.answer,
      sources: sourcesForQuestion(currentQuestion),
      legalBoundary: needsAttorneyBoundary(currentQuestion),
    })
  } catch (error) {
    console.error("[firearm-assistant] generation failed", error)
    return Response.json({ error: "The assistant could not answer right now. Please try again." }, { status: 502 })
  }
}
