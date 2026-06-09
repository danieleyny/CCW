import "server-only"

import { createClient } from "@/lib/supabase/server"

export interface LogActivityInput {
  action: string
  caseId?: string | null
  clientId?: string | null
  entity?: string
  entityId?: string | null
  detail?: Record<string, unknown>
}

/**
 * Append an immutable entry to activity_log using the caller's session (so the
 * actor is recorded and RLS applies). Call on every meaningful state change.
 * Best-effort: logging failures are swallowed so they never break a mutation.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    const supabase = await createClient()
    const {
      data: { user },
    } = await supabase.auth.getUser()

    await supabase.from("activity_log").insert({
      actor: user?.id ?? null,
      action: input.action,
      case_id: input.caseId ?? null,
      client_id: input.clientId ?? null,
      entity: input.entity ?? null,
      entity_id: input.entityId ?? null,
      detail: (input.detail ?? {}) as never,
    })
  } catch (err) {
    console.error("[activity] failed to log:", err)
  }
}
