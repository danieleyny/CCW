/**
 * Reference-outreach helpers (no `server-only` so scripts can drive them).
 * Token generation + recomputing REF-01 from the count of received references.
 */
import { randomBytes } from "crypto"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

/** Opaque, URL-safe capability token for a reference link. */
export function newReferenceToken(): string {
  return randomBytes(24).toString("base64url")
}

export const REFERENCES_REQUIRED = 4

/**
 * Recompute REF-01 from how many references have been received. Satisfied once
 * the required count is met; otherwise pending (it "moves toward satisfied" as
 * each reference comes in). Never touches a manually rejected/na row.
 */
export async function recomputeReferenceRequirement(admin: DB, caseId: string) {
  const [{ count: receivedCount }, { count: notarizedCount }] = await Promise.all([
    admin.from("character_references").select("id", { count: "exact", head: true }).eq("case_id", caseId).eq("received", true),
    admin.from("character_references").select("id", { count: "exact", head: true }).eq("case_id", caseId).eq("notarized", true),
  ])
  const received = receivedCount ?? 0
  const notarized = notarizedCount ?? 0
  const status: Database["public"]["Enums"]["case_req_status"] =
    received >= REFERENCES_REQUIRED ? "satisfied" : "pending"

  // notes is the ONLY reference signal an engaged instructor can read (they can't
  // see character_references) — keep it an aggregate, never a name.
  await admin
    .from("case_requirements")
    .update({ status, notes: `${received}/${REFERENCES_REQUIRED} received · ${notarized} notarized` })
    .eq("case_id", caseId)
    .eq("req_code", "REF-01")
    .in("status", ["pending", "satisfied"])

  return { received, notarized, required: REFERENCES_REQUIRED, status }
}
