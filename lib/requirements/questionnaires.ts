/**
 * Schema-driven questionnaires behind every "generate" requirement.
 *
 * One schema per requirement; the renderer (components/portal/questionnaire.tsx)
 * is generic, so adding a document is a data change, not a UI change. Fields
 * PRE-FILL from intake wherever we already know the answer — the customer should
 * never retype their own name, address, arrests, or household.
 *
 * NO LEGAL ADVICE: every field collects FACTS. Nothing here evaluates what a
 * record means; anything in that territory carries `attorneySeam` copy pointing
 * the applicant to a licensed attorney.
 *
 * CANDOR: disclosure questionnaires say plainly that sealed, dismissed, and
 * nullified matters ARE disclosed (CPL Article 160), and that non-disclosure is
 * more damaging than the underlying event. Nothing here may suggest omitting.
 */
import type { WizardAnswers } from "@/lib/intake/answers"

/**
 * Everything we already know about the applicant. Name/borough/ZIP live on the
 * client record, not in intake answers — both feed prefill so nothing is retyped.
 */
export interface PrefillContext {
  intake: WizardAnswers
  clientName: string
  borough: string | null
  zip: string | null
}

export type FieldType =
  | "text"
  | "textarea"
  | "date"
  | "select"
  | "yesno"
  | "checkbox"

export interface Field {
  name: string
  label: string
  type: FieldType
  help?: string
  required?: boolean
  options?: { value: string; label: string }[]
  placeholder?: string
  /** For `yesno`: when answered yes, these follow-up fields become required. */
  revealOnYes?: Field[]
  maxLength?: number
}

export interface RepeatableGroup {
  name: string
  label: string
  /** Copy shown above the group. */
  help?: string
  addLabel: string
  fields: Field[]
  /** Prefill rows from intake. */
  prefill?: (ctx: PrefillContext) => Record<string, unknown>[]
}

export interface Questionnaire {
  id: string
  title: string
  /** Retail-voice intro shown at the top of the drawer. */
  intro: string
  /** Shown as a standing reminder — used for candor language on disclosures. */
  notice?: string
  /** Routes "what does my record mean" to a licensed attorney. */
  attorneySeam?: boolean
  fields?: Field[]
  groups?: RepeatableGroup[]
  /** Prefill single fields from intake. */
  prefill?: (ctx: PrefillContext) => Record<string, unknown>
  /** Copy on the submit button. */
  submitLabel: string
}

const CANDOR_NOTICE =
  "Disclose everything, including anything sealed, dismissed, or nullified — New York's sealing statute (CPL Article 160) does not excuse you from disclosing to the License Division. Leaving something out is treated far more harshly than the underlying event."

export const QUESTIONNAIRES: Record<string, Questionnaire> = {
  affirmation: {
    id: "affirmation",
    title: "Affirmation of understanding",
    intro:
      "A short statement that you understand where a NYC carry license does and doesn't let you carry. We fill in what we already know — read it, correct anything, and sign.",
    submitLabel: "Generate my affirmation",
    prefill: (ctx) => ({ fullName: ctx.clientName }),
    fields: [
      { name: "fullName", label: "Your full legal name", type: "text", required: true },
      { name: "address", label: "Your NYC address", type: "text", required: true },
      {
        name: "acknowledgesSensitive",
        label:
          "I understand a carry license does not permit carrying in sensitive locations (schools, government buildings, transit, and others listed in P.L. §265.01-e).",
        type: "checkbox",
        required: true,
      },
      {
        name: "acknowledgesPremises",
        label:
          "I understand entering private property that hasn't given permission is prohibited under P.L. §265.01-d.",
        type: "checkbox",
        required: true,
      },
    ],
  },

  "safe-storage": {
    id: "safe-storage",
    title: "Safe storage",
    intro:
      "How you'll store the handgun at home. NYC requires secure storage (P.L. §265.45; NYC Admin. Code §10-312). You'll also add photos of your safe — open and closed.",
    submitLabel: "Generate my statement",
    prefill: (ctx) => ({ safeguardName: ctx.intake.safeguardName ?? "" }),
    fields: [
      { name: "address", label: "Address where the firearm will be stored", type: "text", required: true },
      {
        name: "storageType",
        label: "How will it be stored?",
        type: "select",
        required: true,
        options: [
          { value: "safe", label: "Locked gun safe" },
          { value: "lockbox", label: "Locked box or cabinet" },
          { value: "trigger_lock", label: "Trigger/cable lock in a locked container" },
        ],
      },
      { name: "safeguardName", label: "Make/model of the safe or lock (if you know it)", type: "text" },
      {
        name: "othersInHome",
        label: "Does anyone else live at this address?",
        type: "yesno",
        help: "If yes, each adult 18+ also completes a cohabitant affidavit.",
      },
    ],
  },

  "social-media": {
    id: "social-media",
    title: "Social media (optional)",
    intro:
      "The CCIA's social-media disclosure has been enjoined by the courts (Antonyuk v. James), so this is optional and your application is complete without it. Some applicants provide it anyway. Skip it freely.",
    submitLabel: "Generate my list",
    prefill: (ctx) => ({
      handles: (ctx.intake.socialAccounts ?? []).map((s) => s.handle).filter(Boolean).join("\n"),
    }),
    fields: [
      {
        name: "handles",
        label: "Accounts from the past three years (one per line)",
        type: "textarea",
        placeholder: "instagram.com/yourhandle\nx.com/yourhandle",
        maxLength: 2000,
      },
    ],
  },

  "cohabitant-affidavit": {
    id: "cohabitant-affidavit",
    title: "Household members",
    intro:
      "Every adult 18 or older who lives with you signs a short affidavit acknowledging a licensed firearm in the home. We prepare each one and send them a private link. If you live alone, say so and we'll prepare a sole-occupancy statement instead.",
    notice: "Each affidavit must be notarized. Upload the signed copy when it's done — that's what completes this requirement.",
    submitLabel: "Prepare the affidavits",
    fields: [
      {
        name: "livesAlone",
        label: "Do you live alone?",
        type: "yesno",
        help: "If yes, we prepare a sole-occupancy statement instead of affidavits.",
      },
    ],
    groups: [
      {
        name: "cohabitants",
        label: "Adults living with you (18+)",
        help: "Everyone 18 or older at your address, including family.",
        addLabel: "Add a household member",
        prefill: (ctx) =>
          (ctx.intake.cohabitants ?? []).map((c) => ({
            name: c.name ?? "",
            relationship: c.relationship ?? "",
          })),
        fields: [
          { name: "name", label: "Full name", type: "text", required: true },
          { name: "relationship", label: "Relationship to you", type: "text", required: true },
          { name: "email", label: "Email (for their private link)", type: "text" },
        ],
      },
    ],
  },

  references: {
    id: "references",
    title: "Character references",
    intro:
      "Each reference gets a private link to write and notarize their letter — nothing for you to chase down by hand. At least two must not be related to you.",
    notice: "Reference letters must be notarized. This requirement completes when the notarized letters are uploaded.",
    submitLabel: "Send the invitations",
    groups: [
      {
        name: "references",
        label: "Your references",
        addLabel: "Add a reference",
        prefill: (ctx) =>
          (ctx.intake.references ?? []).map((r) => ({ name: r.name ?? "", email: r.email ?? "" })),
        fields: [
          { name: "name", label: "Full name", type: "text", required: true },
          { name: "email", label: "Email", type: "text", required: true },
          { name: "relationship", label: "How do they know you?", type: "text", required: true },
          {
            name: "isFamily",
            label: "Related to you?",
            type: "select",
            options: [
              { value: "no", label: "Not related" },
              { value: "yes", label: "Family member" },
            ],
          },
        ],
      },
    ],
  },

  "disclosure-addendum": {
    id: "disclosure-addendum",
    title: "Disclosure questions",
    intro:
      "The NYPD application asks a series of history questions (10–28). Every 'yes' needs its own written explanation, which goes on the Handgun License Application Addendum (PD 643-041A). Answer honestly — this is the part of the application people get wrong.",
    notice: CANDOR_NOTICE,
    attorneySeam: true,
    submitLabel: "Generate my addendum",
    fields: [
      {
        name: "everArrested",
        label: "Have you ever been arrested, indicted, or summonsed — anywhere, at any time?",
        type: "yesno",
        help: "Yes even if it was dismissed, sealed, nullified, or you were never convicted.",
        revealOnYes: [
          {
            name: "arrestExplanation",
            label: "In your own words, what happened?",
            type: "textarea",
            required: true,
            help: "Facts only: date, place, what was alleged, and how it ended. You'll add the court's Certificate of Disposition separately.",
            maxLength: 4000,
          },
        ],
      },
      {
        name: "orderOfProtection",
        label: "Has an order of protection ever been issued against you or on your behalf?",
        type: "yesno",
        help: "Yes even if it has expired or was later vacated.",
        revealOnYes: [
          { name: "oopExplanation", label: "Explain the circumstances", type: "textarea", required: true, maxLength: 4000 },
        ],
      },
      {
        name: "domesticIncident",
        label: "Has a domestic incident report ever been filed involving you?",
        type: "yesno",
        help: "Yes even if no arrest or charges followed.",
        revealOnYes: [
          { name: "dirExplanation", label: "Explain the circumstances", type: "textarea", required: true, maxLength: 4000 },
        ],
      },
      {
        name: "mentalHealth",
        label:
          "Have you ever been involuntarily committed, or adjudicated as lacking mental capacity?",
        type: "yesno",
        revealOnYes: [
          { name: "mhExplanation", label: "Explain the circumstances", type: "textarea", required: true, maxLength: 4000 },
        ],
      },
      {
        name: "licenseDenied",
        label: "Has a firearms license ever been denied, suspended, or revoked — in any state?",
        type: "yesno",
        revealOnYes: [
          { name: "denialExplanation", label: "Explain the circumstances", type: "textarea", required: true, maxLength: 4000 },
        ],
      },
    ],
  },

  "arrest-statements": {
    id: "arrest-statements",
    title: "Arrest statements",
    intro:
      "For every arrest or summons the License Division wants two things: the court's Certificate of Disposition, and your own written statement of what happened. We'll write the statement here and prepare a letter you can send the court to request the certificate.",
    notice: CANDOR_NOTICE,
    attorneySeam: true,
    submitLabel: "Generate my statements",
    groups: [
      {
        name: "arrests",
        label: "Each arrest or summons",
        help: "Add every one — including sealed, dismissed, and nullified matters.",
        addLabel: "Add an incident",
        prefill: (ctx) =>
          (ctx.intake.arrests ?? []).map((x) => ({
            occurredOn: x.occurredOn ?? "",
            jurisdiction: x.jurisdiction ?? "",
            disposition: x.disposition ?? "",
            narrative: x.narrative ?? "",
          })),
        fields: [
          { name: "occurredOn", label: "Date", type: "date", required: true },
          { name: "jurisdiction", label: "Court / county", type: "text", required: true, placeholder: "Kings County Criminal Court" },
          { name: "disposition", label: "How did it end?", type: "text", required: true, placeholder: "Dismissed and sealed" },
          {
            name: "narrative",
            label: "What happened, in your words",
            type: "textarea",
            required: true,
            maxLength: 4000,
            help: "Facts only — what occurred, and what the outcome was.",
          },
        ],
      },
    ],
  },

  "court-request-letters": {
    id: "court-request-letters",
    title: "Certificate of Disposition request",
    intro:
      "A letter you can hand or mail to the court clerk asking for the Certificate of Disposition. One per court.",
    submitLabel: "Generate my request letters",
  },

  "protection-order-statement": {
    id: "protection-order-statement",
    title: "Order of protection",
    intro:
      "A copy of the order plus your written explanation. Include every order — active or expired.",
    notice: CANDOR_NOTICE,
    attorneySeam: true,
    submitLabel: "Generate my statement",
    fields: [
      { name: "issuedOn", label: "Date issued", type: "date", required: true },
      { name: "court", label: "Issuing court", type: "text", required: true },
      { name: "status", label: "Current status", type: "text", required: true, placeholder: "Expired 2021" },
      { name: "explanation", label: "Explain the circumstances", type: "textarea", required: true, maxLength: 4000 },
    ],
  },

  "domestic-incident-statement": {
    id: "domestic-incident-statement",
    title: "Domestic incident report",
    intro: "Your written disclosure of any domestic incident report, in your own words.",
    notice: CANDOR_NOTICE,
    attorneySeam: true,
    submitLabel: "Generate my statement",
    fields: [
      { name: "occurredOn", label: "Date", type: "date", required: true },
      { name: "agency", label: "Which police agency?", type: "text", required: true },
      { name: "outcome", label: "What was the outcome?", type: "text", required: true, placeholder: "No charges filed" },
      { name: "explanation", label: "Explain the circumstances", type: "textarea", required: true, maxLength: 4000 },
    ],
  },
}

export function questionnaireFor(id: string): Questionnaire | null {
  return QUESTIONNAIRES[id] ?? null
}

/** Build the initial values for a questionnaire from intake answers. */
export function prefillFor(q: Questionnaire, ctx: PrefillContext): Record<string, unknown> {
  const values: Record<string, unknown> = { ...(q.prefill?.(ctx) ?? {}) }
  for (const g of q.groups ?? []) {
    const rows = g.prefill?.(ctx) ?? []
    values[g.name] = rows.length ? rows : [{}]
  }
  return values
}
