/**
 * SCHEMA DRIFT GUARD.
 *
 * A customer clicking "Generate" got this in a toast:
 *
 *     Could not find the 'signed_at' column of 'documents' in the schema cache
 *
 * That is PostgREST saying "the database I'm connected to is behind the code you
 * deployed" — a deployment mistake, not something the applicant did. Leaking it
 * raw tells them nothing and makes the product look broken.
 *
 * `describeSchemaError` recognizes that class of failure and turns it into an
 * honest message: something on our side is out of date, it's not your fault,
 * and (for us) exactly which column is missing so the fix is obvious from the
 * log. `scripts/verify-schema.ts` checks the same columns ahead of a deploy.
 */

/** Columns the app will 500 on if the database is behind. Keep this current. */
export const REQUIRED_COLUMNS: { table: string; column: string; since: string }[] = [
  { table: "documents", column: "signed_at", since: "20260718000900_document_signing" },
  { table: "documents", column: "req_code", since: "20260718000500_document_engine" },
  { table: "documents", column: "generated", since: "20260718000500_document_engine" },
  { table: "requirement_answers", column: "answers", since: "20260718000500_document_engine" },
  { table: "signature_events", column: "document_sha256", since: "20260718000600_signing_audit_and_evidence" },
  { table: "signatures", column: "consent_text", since: "20260718000600_signing_audit_and_evidence" },
  { table: "fees", column: "amount_cents", since: "fee schedule (V4-A4f)" },
]

/** PGRST204 / PGRST202: the column or relation isn't in PostgREST's schema cache. */
const SCHEMA_CACHE_MISS = /could not find the '(.+?)' column of '(.+?)'|schema cache/i

export interface SchemaErrorInfo {
  isSchemaDrift: boolean
  /** Safe to show a customer. */
  userMessage: string
  /** For logs — names the column and the migration that adds it. */
  operatorMessage: string
}

export function describeSchemaError(err: unknown): SchemaErrorInfo {
  const raw = err instanceof Error ? err.message : String(err ?? "")
  const m = raw.match(SCHEMA_CACHE_MISS)
  if (!m) {
    return { isSchemaDrift: false, userMessage: raw, operatorMessage: raw }
  }

  const column = m[1]
  const table = m[2]
  const known = REQUIRED_COLUMNS.find((c) => c.column === column && (!table || c.table === table))

  return {
    isSchemaDrift: true,
    // No jargon, no blame, and no false hope that retrying will help.
    userMessage:
      "Something on our end is out of date and we couldn't prepare that document. This is our problem, not yours — we've been notified. Please try again shortly.",
    operatorMessage:
      `DATABASE IS BEHIND THE DEPLOYED CODE: PostgREST has no '${column}'` +
      (table ? ` on '${table}'` : "") +
      (known ? ` (added by ${known.since})` : "") +
      ". Run `supabase db push --include-all` against this project, then reload the PostgREST schema cache.",
  }
}

/**
 * Wrap a thrown error for a customer-facing action: logs the operator detail,
 * returns the message that's safe to show.
 */
export function toUserFacingError(err: unknown, fallback: string): string {
  const info = describeSchemaError(err)
  if (info.isSchemaDrift) {
    console.error("[schema-health]", info.operatorMessage)
    return info.userMessage
  }
  return err instanceof Error ? err.message : fallback
}
