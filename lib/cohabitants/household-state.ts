import type { CohabitantEntry, WizardAnswers } from "@/lib/intake/answers"

export interface HouseholdRosterEntry {
  name: string
  relationship: string | null
  contact_email?: string | null
}

/**
 * Keep the resumable intake and the operational household roster aligned.
 *
 * The roster is canonical once a case exists: it is what outreach, reminders,
 * requirements, and staff review all read. Mirroring the applicant-owned
 * household fields into the wizard prevents a later intake edit from
 * accidentally deleting a spouse added from the People page.
 */
export function householdAnswersFromRoster(
  current: WizardAnswers,
  roster: HouseholdRosterEntry[]
): WizardAnswers {
  const cohabitants: CohabitantEntry[] = roster.map((person) => ({
    name: person.name.trim(),
    ...(person.relationship?.trim() ? { relationship: person.relationship.trim() } : {}),
    ...(person.contact_email?.trim() ? { email: person.contact_email.trim() } : {}),
  }))

  return {
    ...current,
    cohabitants,
  }
}

