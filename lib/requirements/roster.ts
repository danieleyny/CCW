/**
 * Turning a roster questionnaire into real people with real invitations.
 *
 * COH-01 and REF-01/02 aren't documents the applicant signs — they're documents
 * OTHER people write and notarize. The questionnaire collects who they are; this
 * syncs them into `cohabitants` / `character_references` and mints each person's
 * private link. Previously nothing consumed those answers at all, so the
 * checklist button dead-ended in "No generator for COH-01".
 *
 * RULES THAT MATTER:
 * - Never destroy evidence. A person whose letter or affidavit is already
 *   received/notarized is never removed by a later edit of the list, even if
 *   they've been dropped from it — that document is filed evidence, and losing
 *   it silently would be worse than a stale row. Those are reported back so the
 *   UI can say what was kept.
 * - Match on name, case-insensitively, so re-submitting the same list updates
 *   people rather than duplicating them.
 * - Submitting the list NEVER satisfies the requirement. Only notarized copies
 *   coming back do (see recompute* in lib/references / lib/cohabitants).
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { inviteReference, inviteCohabitant } from "@/lib/outreach"

type DB = SupabaseClient<Database>

export interface RosterPerson {
  name: string
  email?: string
  relationship?: string
  isFamily?: boolean
}

export interface RosterSyncResult {
  added: number
  updated: number
  invited: number
  /** Listed with no email on file — the applicant shares the link by hand. */
  needEmail: string[]
  /**
   * Had an email on file, but delivery didn't go through (no provider
   * configured, or the provider rejected it). The link still exists to copy —
   * distinct from needEmail so the UI doesn't say "has no email" when it does.
   */
  sendFailed: string[]
  /**
   * Dropped from the list but kept because we already hold their document
   * (received or notarized) — deleting them would orphan filed evidence.
   */
  keptWithEvidence: string[]
}

const clean = (v: unknown) => (typeof v === "string" ? v.trim() : "")
const key = (name: string) => name.trim().toLowerCase()

/** Read the people out of whatever the questionnaire saved. */
export function peopleFromAnswers(answers: Record<string, unknown>, field: string): RosterPerson[] {
  const rows = Array.isArray(answers[field]) ? (answers[field] as Record<string, unknown>[]) : []
  return rows
    .map((r) => ({
      name: clean(r.name),
      email: clean(r.email) || undefined,
      relationship: clean(r.relationship) || undefined,
      isFamily: r.isFamily === "yes" || r.isFamily === true,
    }))
    .filter((p) => p.name.length > 1)
}

/** Did the applicant say they live alone? */
export function livesAlone(answers: Record<string, unknown>): boolean {
  return answers.livesAlone === true || answers.livesAlone === "yes"
}

export async function syncReferences(
  admin: DB,
  caseId: string,
  people: RosterPerson[]
): Promise<RosterSyncResult> {
  const { data: existing } = await admin
    .from("character_references")
    .select("id, name, contact_email, received, notarized")
    .eq("case_id", caseId)

  const byName = new Map((existing ?? []).map((r) => [key(r.name), r]))
  const listed = new Set(people.map((p) => key(p.name)))
  const result: RosterSyncResult = { added: 0, updated: 0, invited: 0, needEmail: [], sendFailed: [], keptWithEvidence: [] }

  for (const person of people) {
    const match = byName.get(key(person.name))
    let id: string

    if (match) {
      await admin
        .from("character_references")
        .update({
          contact_email: person.email ?? match.contact_email,
          relationship: person.relationship ?? null,
          is_family: !!person.isFamily,
        })
        .eq("id", match.id)
      id = match.id
      result.updated++
    } else {
      const { data: created, error } = await admin
        .from("character_references")
        .insert({
          case_id: caseId,
          name: person.name,
          contact_email: person.email ?? null,
          relationship: person.relationship ?? null,
          is_family: !!person.isFamily,
          received: false,
        })
        .select("id")
        .single()
      if (error || !created) throw new Error(error?.message ?? "Could not add a reference")
      id = created.id
      result.added++
    }

    // Re-inviting someone who already sent a notarized letter would ask them to
    // do it twice — mint links only where the work is still outstanding.
    if (match?.notarized) continue
    const invite = await inviteReference(admin, id)
    if (invite?.emailed) result.invited++
    else if (invite?.hadEmail) result.sendFailed.push(person.name)
    else result.needEmail.push(person.name)
  }

  for (const row of existing ?? []) {
    if (listed.has(key(row.name))) continue
    if (row.received || row.notarized) {
      result.keptWithEvidence.push(row.name)
      continue
    }
    // Nothing bound to them yet — safe to drop from the roster.
    await admin.from("character_references").delete().eq("id", row.id)
  }

  return result
}

export async function syncCohabitants(
  admin: DB,
  caseId: string,
  people: RosterPerson[]
): Promise<RosterSyncResult> {
  const { data: existing } = await admin
    .from("cohabitants")
    .select("id, name, contact_email, affidavit_status")
    .eq("case_id", caseId)

  const byName = new Map((existing ?? []).map((r) => [key(r.name), r]))
  const listed = new Set(people.map((p) => key(p.name)))
  const result: RosterSyncResult = { added: 0, updated: 0, invited: 0, needEmail: [], sendFailed: [], keptWithEvidence: [] }
  const done = (s: string | null | undefined) => s === "notarized" || s === "received"

  for (const person of people) {
    const match = byName.get(key(person.name))
    let id: string

    if (match) {
      await admin
        .from("cohabitants")
        .update({
          contact_email: person.email ?? match.contact_email,
          relationship: person.relationship ?? null,
        })
        .eq("id", match.id)
      id = match.id
      result.updated++
    } else {
      const { data: created, error } = await admin
        .from("cohabitants")
        .insert({
          case_id: caseId,
          name: person.name,
          contact_email: person.email ?? null,
          relationship: person.relationship ?? null,
        })
        .select("id")
        .single()
      if (error || !created) throw new Error(error?.message ?? "Could not add a household member")
      id = created.id
      result.added++
    }

    if (done(match?.affidavit_status)) continue
    const invite = await inviteCohabitant(admin, id)
    if (invite?.emailed) result.invited++
    else if (invite?.hadEmail) result.sendFailed.push(person.name)
    else result.needEmail.push(person.name)
  }

  for (const row of existing ?? []) {
    if (listed.has(key(row.name))) continue
    if (done(row.affidavit_status)) {
      result.keptWithEvidence.push(row.name)
      continue
    }
    await admin.from("cohabitants").delete().eq("id", row.id)
  }

  return result
}
