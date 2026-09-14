import "server-only"

import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { resolveFacts } from "@/lib/facts/resolve"
import { hasCaseSsn } from "@/lib/facts/ssn"
import { buildFactGroups, detailsMeter } from "@/lib/facts/details-view"
import type { FactGroup } from "@/lib/facts/registry"
import type { WizardAnswers } from "@/lib/intake/answers"
import { portalStep12StatementsFor } from "@/lib/requirements/lon"
import { detectSelfDesignation, selfDesignationKeyMessages } from "@/lib/safeguard/self-designation"

type DB = SupabaseClient<Database>

/**
 * The DATA the portal needs — first-class asks for the concierge checklist. The
 * collection already exists (/portal/details, ApplicationHistory, LON-01, CON-01) but
 * the concierge page never linked to it, so a concierge applicant finished the flow
 * without ever being asked for their employer or histories. Each ask is a card with
 * "N of M captured" and a deep-link to the exact section.
 */
export interface DataAsk {
  key: string
  label: string
  captured: number
  total: number
  href: string
}

export async function buildDataAsks(admin: DB, caseId: string): Promise<DataAsk[]> {
  const facts = await resolveFacts(admin, caseId)
  const hasSsn = await hasCaseSsn(admin, caseId)

  const [{ data: intakeRow }, { data: reqRows }, { data: caseRow }, { data: sponsorshipRow }] = await Promise.all([
    admin.from("intake_sessions").select("answers").eq("case_id", caseId).maybeSingle(),
    admin.from("requirement_answers").select("req_code, answers").eq("case_id", caseId).in("req_code", ["LON-01", "CON-01"]),
    admin.from("cases").select("license_track, is_renewal").eq("id", caseId).maybeSingle(),
    admin.from("case_sponsorships").select("id").eq("case_id", caseId).is("revoked_at", null).limit(1).maybeSingle(),
  ])
  const intake = (intakeRow?.answers ?? {}) as WizardAnswers
  const licenseTrack = caseRow?.license_track ?? null
  const byCode = new Map((reqRows ?? []).map((r) => [r.req_code, (r.answers ?? {}) as Record<string, unknown>]))
  const lon = byCode.get("LON-01") ?? {}
  const con = byCode.get("CON-01") ?? {}

  // "Your details" measures EXACTLY the /portal/details editor — the same group order,
  // sponsorship gate and renewal-awareness the page uses — so the card and the page it
  // links to never show two different denominators (P2-4). Employer, safeguard,
  // safekeeping and counsel live inside "Your details"; the residence/employment cards
  // below track only the multi-entry HISTORIES, which the details editor doesn't count.
  const detailsGroups: FactGroup[] = sponsorshipRow
    ? ["you", "address", "contact", "physical", "employer", "safeguard", "safekeeping", "counsel", "sponsor"]
    : ["you", "address", "contact", "physical", "employer", "safeguard", "safekeeping", "counsel"]
  const { groups } = buildFactGroups(facts, hasSsn, detailsGroups, false, !!caseRow?.is_renewal)
  // The safeguard person cannot be the applicant. A conflicting safeguard field is filled
  // but not valid, so it must not count toward "captured" — readiness never reads complete
  // on a self-designation. Identity comes from the fact layer, so this works identically on
  // a sponsored case where the client record is provisioned rather than self-entered.
  const selfConflictKeys = new Set(
    Object.keys(
      selfDesignationKeyMessages(
        detectSelfDesignation({
          applicant: {
            firstName: facts["applicant.legalFirstName"],
            lastName: facts["applicant.legalLastName"],
            email: facts["applicant.email"],
            phone: facts["applicant.phone.cell"],
          },
          safeguard: {
            firstName: facts["safeguard.firstName"],
            lastName: facts["safeguard.lastName"],
            email: facts["safeguard.email"],
            phone: facts["safeguard.phone"],
          },
        })
      )
    )
  )
  const details = detailsMeter(groups, selfConflictKeys)

  const resCount = (intake.residenceHistory ?? []).length
  const empCount = (intake.employmentHistory ?? []).length

  // Letter of Necessity — how MANY statements this case needs is TRACK-DEPENDENT: a
  // concealed-carry case answers three, a Carry Guard case answers five. Derive both the
  // key list and the total from the single source of truth (portalStep12StatementsFor,
  // added in task 2) so the concierge progress never reads "complete" while statements
  // are still missing.
  const lonKeys = portalStep12StatementsFor(licenseTrack).map((n) => `lop${n}`)
  const lonHave = lonKeys.filter((k) => typeof lon[k] === "string" && (lon[k] as string).trim()).length

  const asks: DataAsk[] = [
    { key: "details", label: "Your details", captured: details.captured, total: details.total, href: "/portal/details#you" },
    { key: "residence", label: "Where you've lived (5 years)", captured: Math.min(resCount, 1), total: 1, href: "/portal/details#history" },
    { key: "employment", label: "Where you've worked (5 years)", captured: empCount > 0 ? 1 : 0, total: 1, href: "/portal/details#history" },
  ]
  // Concierge home is /portal/concierge — the LON/CON cards live in its vault, each
  // RequirementCard carrying id=reqCode (and opening its questionnaire on the hash).
  asks.push({ key: "lon", label: "Your written statements", captured: lonHave, total: lonKeys.length, href: "/portal/concierge#LON-01" })
  asks.push({
    key: "confidentiality",
    label: "Confidentiality (optional)",
    captured: con.requesting === "yes" || con.requesting === "no" ? 1 : 0,
    total: 1,
    href: "/portal/concierge#CON-01",
  })
  return asks
}
