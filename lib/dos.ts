/**
 * The NYS DOS armed-status upgrade — a POST-ISSUANCE sub-lifecycle, parallel to
 * the NYPD licence and deliberately outside the case stages + the CP-5 gate. It
 * opens only once the NYPD licence is issued for an armed-guard case.
 *
 * Recurrence: armed status carries an 8-hour annual in-service AND an 8-hour
 * annual firearms course; registrations run two years. The due dates drive the
 * recurring reminders (lib/reminders/engine.ts).
 */
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"

type DB = SupabaseClient<Database>

/** The armed-guard licence tracks the DOS upgrade applies to. */
export function isArmedTrack(track: string | null | undefined): boolean {
  return track === "carry_guard" || track === "special_carry_guard"
}

/** Add whole months to a yyyy-mm-dd date, returning yyyy-mm-dd. */
function addMonths(dateISO: string, months: number): string {
  const d = new Date(`${dateISO}T00:00:00Z`)
  d.setUTCMonth(d.getUTCMonth() + months)
  return d.toISOString().slice(0, 10)
}

/**
 * Open the DOS upgrade row for a case (idempotent). Called when the NYPD licence
 * is issued for an armed-guard case — the DOS items start `outstanding`.
 */
export async function openDosUpgrade(admin: DB, caseId: string): Promise<void> {
  await admin.from("dos_armed_upgrade").upsert({ case_id: caseId }, { onConflict: "case_id", ignoreDuplicates: true })
}

/**
 * Record that DOS granted armed status: mark the 1619-f approved and set the
 * recurring in-service + firearms due dates (12 months) and the 2-year
 * registration expiry from the grant date. The reminders read these.
 */
export async function grantDosArmedStatus(admin: DB, caseId: string, grantedOn: string, updatedBy?: string | null): Promise<void> {
  await admin
    .from("dos_armed_upgrade")
    .upsert(
      {
        case_id: caseId,
        dos_1619f_status: "approved",
        inservice_due_on: addMonths(grantedOn, 12),
        firearms_annual_due_on: addMonths(grantedOn, 12),
        registration_expires_on: addMonths(grantedOn, 24),
        updated_by: updatedBy ?? null,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "case_id" }
    )
}
