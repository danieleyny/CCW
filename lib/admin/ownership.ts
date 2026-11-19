import { isNypdControlled, stageMeta, type CaseStageKey } from "@/config/stages"

export type CaseMoveOwner = "Staff" | "Applicant" | "Third party" | "NYPD" | "Licensed"

export interface CaseOwnershipRow {
  stage: CaseStageKey
  licenseIssuedOn?: string | null
  licenseExpiresOn?: string | null
}

export interface CaseOwnershipSignals {
  nextAppointment?: string | null
  staffNextStep?: string | null
  thirdPartyNextStep?: string | null
  applicantNextStep?: string | null
}

/** Shared owner/next-step precedence for Today, Pipeline, Cases and Inbox. */
export function deriveCaseOwnership(
  caseRow: CaseOwnershipRow,
  signals: CaseOwnershipSignals
): { whoseMove: CaseMoveOwner; nextStep: string } {
  if (isNypdControlled(caseRow.stage)) {
    return {
      whoseMove: "NYPD",
      nextStep: signals.nextAppointment || stageMeta(caseRow.stage).short,
    }
  }
  if (caseRow.stage === "licensed") {
    if (caseRow.licenseIssuedOn) {
      const issued = new Date(caseRow.licenseIssuedOn).toLocaleDateString("en-US", {
        month: "short",
        day: "numeric",
        year: "numeric",
        timeZone: "UTC",
      })
      const renewalYear = caseRow.licenseExpiresOn
        ? new Date(caseRow.licenseExpiresOn).getUTCFullYear()
        : null
      return {
        whoseMove: "Licensed",
        nextStep: renewalYear ? `Licensed ${issued} · renew ${renewalYear}` : `Licensed ${issued}`,
      }
    }
    return { whoseMove: "Licensed", nextStep: "Licensed" }
  }
  if (signals.staffNextStep) return { whoseMove: "Staff", nextStep: signals.staffNextStep }
  if (signals.thirdPartyNextStep) return { whoseMove: "Third party", nextStep: signals.thirdPartyNextStep }
  return { whoseMove: "Applicant", nextStep: signals.applicantNextStep || stageMeta(caseRow.stage).clientHint }
}
