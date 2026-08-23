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
import { type WizardAnswers } from "@/lib/intake/answers"

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
  /**
   * A canonical fact key (lib/facts/registry). Fact-backed fields prefill from
   * case_facts (entered once, reused everywhere) and write back on save. A field
   * with no `fact` is form-specific (a case number, an explanation).
   */
  fact?: string
  options?: { value: string; label: string }[]
  placeholder?: string
  /** For `yesno`: when answered yes, these follow-up fields become required. */
  revealOnYes?: Field[]
  /**
   * Collected only to fill a form and NEVER persisted (the SSN). The dialog keeps
   * it out of the saved answers and passes it transiently to generation.
   */
  ephemeral?: boolean
  /**
   * For `yesno`: a "yes" here is a federal per-se firearms prohibitor, so we do
   * NOT let the applicant self-prepare a document around it — generation is
   * blocked and this message routes them to a NY firearms attorney. States a
   * rule + refers out; it never renders a verdict on their specific record
   * (that's the practice of law). Use only for genuine §922(g) prohibitors.
   */
  blockOnYes?: string
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
    fields: [
      { name: "fullName", label: "Your full legal name", type: "text", required: true, fact: "applicant.fullName" },
      { name: "address", label: "Your NYC address", type: "text", required: true, fact: "applicant.fullAddress" },
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
    // The storage ADDRESS defaults to the applicant's home address (a fact). The
    // make/model field has no fact source and starts empty.
    fields: [
      { name: "address", label: "Address where the firearm will be stored", type: "text", required: true, fact: "applicant.fullAddress" },
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
      { name: "safeStorageMakeModel", label: "Make/model of the safe or lock (if you know it)", type: "text" },
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
            help: "At least two of your references must not be family — so up to two can be relatives, the rest cannot.",
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
      "We've carried over what you told us in intake — confirm each answer and add any explanation the addendum needs. Every 'yes' needs its own written explanation on the Handgun License Application Addendum (PD 643-041A). Answer honestly — this is the part of the application people get wrong.",
    notice: CANDOR_NOTICE,
    attorneySeam: true,
    submitLabel: "Generate my addendum",
    // QA Phase 9 — prefill from intake so this is CONFIRMATION, not a second
    // interrogation. Only the items intake collects DIRECTLY (arrests, orders of
    // protection, domestic incidents) are carried over — including a 'no' the
    // applicant themselves gave. Mental-health and prior-denial are deliberately
    // NOT pre-answered: intake's prohibitor flag is narrower than the addendum's
    // question, and pre-filling 'no' there could suppress a disclosure (candor).
    prefill: (ctx) => {
      const joinNarr = (rows: { occurredOn?: string; jurisdiction?: string; narrative?: string }[]) =>
        rows
          .map((r) => [r.occurredOn, r.jurisdiction, r.narrative].filter(Boolean).join(" — "))
          .filter(Boolean)
          .join("\n\n")
      const arrests = ctx.intake.arrests ?? []
      const oops = ctx.intake.ordersOfProtection ?? []
      const dirs = ctx.intake.domesticIncidents ?? []
      return {
        everArrested: arrests.length > 0 ? "yes" : "no",
        arrestExplanation: joinNarr(arrests),
        orderOfProtection: oops.length > 0 ? "yes" : "no",
        oopExplanation: joinNarr(oops),
        domesticIncident: dirs.length > 0 ? "yes" : "no",
        dirExplanation: joinNarr(dirs),
      }
    },
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
        blockOnYes:
          "An involuntary commitment or an adjudication of mental incapacity is a federal firearms prohibitor (18 U.S.C. §922(g)(4)). This isn't something we can prepare an explanation around — you should speak with a New York firearms attorney about your eligibility and any restoration of rights before you file. Message your concierge and we'll refer you.",
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

  // ── Template-backed (Phase 3) — we FILL the official PDF from these answers ──
  "child-support-cert": {
    id: "child-support-cert",
    title: "Child support certification",
    intro:
      "We fill the official NYPD/HRA certification (Form M-522) for you. Almost everything is already known — just pick the declaration that applies. Your Social Security number is stored encrypted and used only to fill your forms; your sponsor can never see it.",
    submitLabel: "Fill my form",
    fields: [
      { name: "firstName", label: "First name", type: "text", required: true, fact: "applicant.legalFirstName" },
      { name: "lastName", label: "Last name", type: "text", required: true, fact: "applicant.legalLastName" },
      { name: "dob", label: "Date of birth", type: "date", required: true, fact: "applicant.dob" },
      {
        name: "ssn",
        label: "Social Security number or ITIN (optional)",
        type: "text",
        ephemeral: true,
        fact: "applicant.ssn",
        help: "Stored encrypted and reused on your other forms — never visible to your sponsor. Leave blank if it's already on file.",
      },
      { name: "street", label: "Street address", type: "text", required: true, fact: "applicant.address.street" },
      { name: "apt", label: "Apt #", type: "text", fact: "applicant.address.apt" },
      { name: "city", label: "City", type: "text", required: true, fact: "applicant.address.city" },
      { name: "state", label: "State", type: "text", required: true, fact: "applicant.address.state" },
      { name: "zip", label: "ZIP", type: "text", required: true, fact: "applicant.address.zip" },
      { name: "empName", label: "Employer name", type: "text", fact: "employer.name" },
      { name: "empStreet", label: "Employer street", type: "text", fact: "employer.address.street" },
      { name: "empCity", label: "Employer city", type: "text", fact: "employer.address.city" },
      { name: "empState", label: "Employer state", type: "text", fact: "employer.address.state" },
      { name: "empZip", label: "Employer ZIP", type: "text", fact: "employer.address.zip" },
      {
        name: "obligated",
        label: "Are you under a court or administrative order to pay child support?",
        type: "yesno",
        revealOnYes: [
          { name: "acctNumbers", label: "Your child support account number(s)", type: "text" },
          {
            name: "obligBranch",
            label: "Which is true?",
            type: "select",
            required: true,
            options: [
              { value: "a", label: "I have no arrears of four or more months" },
              { value: "b", label: "I have 4+ months arrears, but a payment plan / pending case / public assistance applies" },
              { value: "c", label: "I have 4+ months arrears and none of those apply" },
            ],
          },
          {
            name: "bCondition",
            label: "If the middle option: which applies?",
            type: "select",
            options: [
              { value: "income_exec", label: "Paying by income execution or court-approved plan" },
              { value: "pending", label: "My obligation is the subject of a pending court proceeding" },
              { value: "public_assist", label: "I receive Public Assistance or SSI" },
            ],
          },
          { name: "caseNumber", label: "My case number is", type: "text" },
        ],
      },
    ],
  },

  "sole-occupancy-form": {
    id: "sole-occupancy-form",
    title: "Sole-occupancy attestation",
    intro:
      "You live alone, so the official cohabitant affidavit's solo-resident section applies. We fill it from your details — review and sign. Under penalty of perjury; no notary needed.",
    submitLabel: "Fill my form",
    fields: [
      { name: "fullName", label: "Your full name", type: "text", required: true, fact: "applicant.fullName" },
      { name: "address", label: "Your full address", type: "text", required: true, fact: "applicant.fullAddress" },
    ],
  },

  "prelicense-exemption": {
    id: "prelicense-exemption",
    title: "Pre-licence exemption (§5-09)",
    intro:
      "We fill the official NYPD Request for License Pre-Exemption with your details. Your authorised instructor completes and signs their section, then you upload the signed form.",
    submitLabel: "Fill my form",
    fields: [
      { name: "fullName", label: "Your full name", type: "text", required: true, fact: "applicant.fullName" },
      { name: "address", label: "Your full address", type: "text", required: true, fact: "applicant.fullAddress" },
      { name: "dob", label: "Date of birth", type: "date", required: true, fact: "applicant.dob" },
      { name: "age", label: "Age", type: "text", fact: "applicant.age" },
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
