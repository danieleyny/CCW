import type { WizardAnswers } from "@/lib/intake/answers"

export type FormSigningMode = false | "notarize" | "witness"

export type PortalFormDoc = {
  key: string
  reqCode: string
  title: string
  desc: string
  notarize: FormSigningMode
  fileable: boolean
  filed: boolean
  optional?: boolean
}

/**
 * The forms shown on /portal/forms. Keeping the visibility rules here means the
 * page and the filing-pack gate can never disagree about which rows exist.
 * This is presentation metadata only; requirement applicability and completion
 * still come from case_requirements.
 */
export function buildPortalForms(
  answers: WizardAnswers,
  statusByRequirement: ReadonlyMap<string, string>
): PortalFormDoc[] {
  const hasArrests = (answers.arrests?.length ?? 0) > 0
  const hasCohabitants = (answers.cohabitants?.length ?? 0) > 0
  const hasSafeguard = !!answers.safeguardName?.trim()
  const filed = (reqCode: string) => statusByRequirement.get(reqCode) === "satisfied"

  return [
    {
      key: "affirmation",
      reqCode: "AFF-01",
      title: "Affirmation of Understanding",
      desc: "Acknowledges NYC carry rules and prohibited locations.",
      notarize: false,
      fileable: true,
      filed: filed("AFF-01"),
    },
    {
      key: "safe-storage",
      reqCode: "SAF-01",
      title: "Safe-Storage Attestation",
      desc: "Confirms your approved safe and storage practice.",
      notarize: false,
      fileable: false,
      filed: filed("SAF-01"),
    },
    {
      key: "social-media",
      reqCode: "SOC-01",
      title: "3-Year Social-Media Disclosure",
      desc: "Your accounts from the last three years (from intake).",
      notarize: false,
      fileable: true,
      filed: filed("SOC-01"),
      optional: true,
    },
    ...(hasArrests
      ? [
          {
            key: "arrest-narratives",
            reqCode: "ARR-01",
            title: "Written Explanations",
            desc: "Formatted explanations for your disclosed matters.",
            notarize: false as const,
            fileable: false,
            filed: filed("ARR-01"),
          },
          {
            key: "court-letters",
            reqCode: "ARR-01",
            title: "Certificate-of-Disposition Requests",
            desc: "Ready-to-mail letters to the court clerk, one per matter.",
            notarize: false as const,
            fileable: false,
            filed: filed("ARR-01"),
            optional: true,
          },
        ]
      : []),
    ...(!hasCohabitants
      ? [
          {
            key: "sole-occupancy",
            reqCode: "COH-02",
            title: "Sole-Occupancy Statement",
            desc: "If you live alone. Comes pre-signed when your signature is on file; no notary needed.",
            notarize: false as const,
            fileable: false,
            filed: filed("COH-02"),
          },
        ]
      : []),
    ...(hasSafeguard
      ? [
          {
            key: "safeguard-designation",
            reqCode: "SFG-01",
            title: "Safeguard-Person Designation",
            desc: "Names who will take custody of your handgun if you die or become disabled. The person you named signs it before a witness — no notary needed.",
            notarize: "witness" as const,
            fileable: false,
            filed: filed("SFG-01"),
          },
        ]
      : []),
  ]
}
