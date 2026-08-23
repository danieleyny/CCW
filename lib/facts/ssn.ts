import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { createCipheriv, createDecipheriv, randomBytes } from "node:crypto"
import { logActivity } from "@/lib/activity"

/**
 * The SSN is stored ENCRYPTED (owner decision), AES-256-GCM with a key that lives
 * only in the environment (SSN_ENCRYPTION_KEY, 32 bytes base64) — never in the DB.
 * case_ssn has no RLS policies, so only the service role reaches it; a sponsor
 * cannot read it at any scope. Every decryption for a form fill is logged.
 */
type DB = SupabaseClient<Database>

function key(): Buffer {
  const k = process.env.SSN_ENCRYPTION_KEY
  if (!k) throw new Error("SSN_ENCRYPTION_KEY is not configured")
  const b = Buffer.from(k, "base64")
  if (b.length !== 32) throw new Error("SSN_ENCRYPTION_KEY must be 32 bytes (base64)")
  return b
}

export function ssnConfigured(): boolean {
  try {
    key()
    return true
  } catch {
    return false
  }
}

function encrypt(plain: string): { ciphertext: string; iv: string; authTag: string } {
  const iv = randomBytes(12)
  const c = createCipheriv("aes-256-gcm", key(), iv)
  const enc = Buffer.concat([c.update(plain, "utf8"), c.final()])
  return { ciphertext: enc.toString("base64"), iv: iv.toString("base64"), authTag: c.getAuthTag().toString("base64") }
}

function decrypt(row: { ciphertext: string; iv: string; auth_tag: string }): string {
  const d = createDecipheriv("aes-256-gcm", key(), Buffer.from(row.iv, "base64"))
  d.setAuthTag(Buffer.from(row.auth_tag, "base64"))
  return Buffer.concat([d.update(Buffer.from(row.ciphertext, "base64")), d.final()]).toString("utf8")
}

/** Store (or replace) the case's SSN, encrypted. Service-role client only. */
export async function setCaseSsn(admin: DB, caseId: string, ssn: string, updatedBy: string | null): Promise<void> {
  const trimmed = ssn.trim()
  if (!trimmed) {
    await admin.from("case_ssn").delete().eq("case_id", caseId)
    return
  }
  const e = encrypt(trimmed)
  await admin.from("case_ssn").upsert({
    case_id: caseId,
    ciphertext: e.ciphertext,
    iv: e.iv,
    auth_tag: e.authTag,
    updated_by: updatedBy,
  })
}

/** Decrypt the case's SSN for an APPLICANT-triggered fill. Logs the access. Never
 *  call this in a sponsor-triggered flow — the sponsor must never read the SSN. */
export async function getCaseSsn(admin: DB, caseId: string, reason: string): Promise<string | null> {
  const { data } = await admin.from("case_ssn").select("ciphertext, iv, auth_tag").eq("case_id", caseId).maybeSingle()
  if (!data) return null
  const value = decrypt(data)
  await logActivity({ action: "ssn.decrypted", caseId, entity: "case", entityId: caseId, detail: { reason } })
  return value
}

export async function hasCaseSsn(admin: DB, caseId: string): Promise<boolean> {
  const { count } = await admin.from("case_ssn").select("case_id", { count: "exact", head: true }).eq("case_id", caseId)
  return (count ?? 0) > 0
}
