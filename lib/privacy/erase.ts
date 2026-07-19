/**
 * PART A / Phase 3 — erasure of a case's sensitive content.
 *
 * No `server-only`: the verify harness drives this with a service-role client,
 * the same way it drives the reminder engine and the QA gate.
 *
 * ⚠️ The thing that makes this hard is documented at the top of
 * docs/DATA_INVENTORY.md and repeated here because getting it wrong is silent:
 * a disclosure narrative exists in FIVE places, one of which is a file. Scrub
 * only `disclosures.narrative` and the applicant's account of their arrest
 * survives in the intake blob, the questionnaire answers, any §5-24 report, and
 * rendered into the bytes of a generated PDF.
 *
 * Two things are deliberately NOT deleted, and both are disclosed to the
 * applicant rather than quietly skipped:
 *   - `signature_events` is ESIGN/UETA evidence (append-only by construction).
 *     It is MINIMIZED — ip/user_agent nulled — not erased.
 *   - The erasure record itself lives in `data_erasure_log`, which uses plain
 *     uuids rather than FKs so it survives the deletion it documents.
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

/** Per-surface counts, so the record says what actually happened. */
export interface ErasureReceipt {
  caseId: string
  surfaces: Record<string, number>
}

export interface EraseOptions {
  /** The data_requests row this erasure answers, when there is one. */
  requestId?: string | null
  /** Staff profile id performing it. */
  actor?: string | null
  note?: string | null
}

/**
 * Write the erasure record. Called BEFORE the destructive work and updated
 * after, so an interrupted run still leaves a trace.
 *
 * Unlike logActivity() — which swallows errors by design so logging can never
 * break a mutation — this THROWS. If we cannot record that we are about to
 * destroy someone's records, we do not destroy them.
 */
export async function recordErasure(
  db: DB,
  input: {
    caseId: string
    clientId: string | null
    requestId?: string | null
    actor?: string | null
    surfaces?: Record<string, number>
    note?: string | null
  }
): Promise<string> {
  const { data, error } = await db
    .from("data_erasure_log")
    .insert({
      case_id: input.caseId,
      client_id: input.clientId,
      data_request_id: input.requestId ?? null,
      actor: input.actor ?? null,
      surfaces: input.surfaces ?? {},
      note: input.note ?? null,
    })
    .select("id")
    .single()
  if (error || !data) {
    throw new Error(`Refusing to erase: could not write the erasure record (${error?.message})`)
  }
  return data.id
}

/**
 * Erase a case's sensitive content. Service-role only — RLS would otherwise
 * stop most of this, and it must be all-or-nothing across surfaces.
 */
export async function eraseCase(db: DB, caseId: string, opts: EraseOptions = {}): Promise<ErasureReceipt> {
  const surfaces: Record<string, number> = {}
  const count = async (key: string, n: number) => {
    surfaces[key] = (surfaces[key] ?? 0) + n
  }

  const { data: kase } = await db.from("cases").select("id, client_id").eq("id", caseId).single()
  if (!kase) throw new Error(`No such case: ${caseId}`)

  // Record the intent first. Throws if it can't be written.
  const logId = await recordErasure(db, {
    caseId,
    clientId: kase.client_id,
    requestId: opts.requestId,
    actor: opts.actor,
    note: opts.note ?? "erasure started",
  })

  // ── Surface 5 first: the FILE BYTES ────────────────────────────────────────
  // Before the `documents` rows go, because the rows are how we find the paths.
  // A generated affirmation or arrest statement has the narrative rendered into
  // it — deleting the row without the object leaves the story on disk.
  const { data: docs } = await db.from("documents").select("id, file_path").eq("case_id", caseId)
  const paths = (docs ?? []).map((d) => d.file_path).filter((p): p is string => !!p)
  if (paths.length) {
    const { error } = await db.storage.from("documents").remove(paths)
    if (error) throw new Error(`Storage erasure failed, aborting before row deletion: ${error.message}`)
    await count("storage_objects", paths.length)
  }
  if (docs?.length) {
    await db.from("documents").delete().eq("case_id", caseId)
    await count("documents", docs.length)
  }

  // ── Surfaces 1–4: every copy of the narrative ──────────────────────────────
  for (const table of ["disclosures", "requirement_answers", "license_reports"] as const) {
    const { data: rows } = await db.from(table).select("id").eq("case_id", caseId)
    if (rows?.length) {
      await db.from(table).delete().eq("case_id", caseId)
      await count(table, rows.length)
    }
  }
  {
    const { data: rows } = await db.from("intake_sessions").select("id").eq("case_id", caseId)
    if (rows?.length) {
      await db.from("intake_sessions").delete().eq("case_id", caseId)
      await count("intake_sessions", rows.length)
    }
  }

  // ── Everything else scoped to the case ─────────────────────────────────────
  for (const table of [
    "case_notes",
    "messages",
    "cohabitants",
    "character_references",
    "purchase_authorizations",
  ] as const) {
    const { data: rows } = await db.from(table).select("id").eq("case_id", caseId)
    if (rows?.length) {
      await db.from(table).delete().eq("case_id", caseId)
      await count(table, rows.length)
    }
  }

  // ── Signatures: delete the image, keep nothing identifying ─────────────────
  // The handwritten image is biometric-adjacent PII; the hash binding in
  // signature_events is what actually evidences the signing.
  {
    const { data: sigs } = await db.from("signatures").select("id").eq("case_id", caseId)
    if (sigs?.length) {
      await db.from("signatures").delete().eq("case_id", caseId)
      await count("signatures", sigs.length)
    }
  }

  // ── signature_events: MINIMIZED, NOT DELETED ───────────────────────────────
  // Retained as ESIGN/UETA evidence (15 U.S.C. §7001(d)). We strip what
  // identifies a person and keep what evidences the act. This is disclosed to
  // the applicant — we never tell someone their data is gone when it is not.
  {
    const { data: evs } = await db.from("signature_events").select("id").eq("case_id", caseId)
    if (evs?.length) {
      await db
        .from("signature_events")
        .update({ ip: null, user_agent: null })
        .eq("case_id", caseId)
      await count("signature_events_minimized", evs.length)
    }
  }

  await db
    .from("data_erasure_log")
    .update({ surfaces, note: opts.note ?? "erasure completed" })
    .eq("id", logId)

  return { caseId, surfaces }
}
