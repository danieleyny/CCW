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
import { type WizardAnswers, QUESTIONNAIRE } from "@/lib/intake/answers"
import { PORTAL_DISCLOSURES } from "@/lib/disclosures/portal-questions"

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
  /** Shown only to law-enforcement applicants (portal Q16). Hidden — and never
   *  recorded — for everyone else. */
  leoOnly?: boolean
  /** Letter-of-Necessity scope by licence type (portal Part 5): the statement is
   *  asked only of the matching tracks. "all" is asked of everyone; "carry" of any
   *  carry track; "guard" of Carry Guard/Security; "business" of the business tracks.
   *  A Concealed Carry applicant therefore answers only the "all" + "carry" statements. */
  lonScope?: "all" | "carry" | "guard" | "business"
  /**
   * On a SPONSORED case, who owns this field. The Letter of Necessity is co-authored:
   * the employer supplies the business-knowledge statements (1, 3, 5) and the
   * applicant the acknowledgements (2, 4, 6) — one shared document, two authors.
   * The save layer enforces it (an actor writes only their own party's fields, so
   * neither can clobber the other's sworn statements); the dialog locks the rest.
   * Absent ⇒ the applicant owns it, and on a non-sponsored case party is ignored
   * (the applicant supplies everything).
   */
  party?: "applicant" | "sponsor"
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

/**
 * THE complete PD 643-041 Section B — every question 10 through 28, verbatim. This
 * is the single source the disclosure questionnaire, the PD 643-041A addendum
 * generator, and our internal disclosure summary all read, so they can never drift
 * out of sync or quietly collapse a question.
 *
 * Q10–22 reuse the intake questionnaire's verbatim text (already collected at
 * intake as `answers.questionnaire`). Q23–28 have dedicated intake flows whose
 * answers prefill them: 23←arrests, 24←ordersOfProtection, 27←domesticIncidents,
 * 28←aliasName. **24, 25 and 26 are THREE separate questions** (against you / by you
 * against household or family / by you against another) — never collapsed. **21 and
 * 22 are separate** (mental illness/treatment vs any disability affecting safe
 * possession). **20 and 20a are separate** — 20 asks about the corporation/partnership
 * (the ENTITY), 20a about any officer, director or partner (the PEOPLE).
 */
/**
 * The disclosure questionnaire fields, built from the verbatim NYPD ONLINE PORTAL
 * question set (lib/disclosures/portal-questions). Seventeen questions; a "Yes"
 * reveals a free-text explanation. Q6 nests under Q5 (only asked if Q5 is yes); Q7
 * carries the verbatim arrest note and a felony/serious-offense sub-question that
 * drives the Certificate of Relief; Q16 is law-enforcement only (leoOnly, hidden
 * unless the case is a LEO applicant); Q17 is a confidentiality REQUEST (no
 * explanation) whose "Yes" spawns the Public Records Exemption form.
 */
function disclosureFields(): Field[] {
  const fields: Field[] = []
  for (const q of PORTAL_DISCLOSURES) {
    if (q.conditionalOnYesOf) continue // nested under its parent (Q6 under Q5)
    if (q.isConfidentialityRequest) {
      fields.push({
        name: `q${q.no}`,
        label: `${q.no}. ${q.text}`,
        type: "yesno",
        help: "A request, not a disclosure. Answering yes means we prepare the New York State Request for Public Records Exemption for you to complete and upload.",
      })
      continue
    }
    const reveal: Field[] = [
      { name: `q${q.no}_explain`, label: "In your own words, what happened?", type: "textarea", required: true, help: q.explainHelp, maxLength: 4000 },
    ]
    // Q5 → nest Q6 (dishonorable discharge), only asked when Q5 is yes.
    const child = PORTAL_DISCLOSURES.find((c) => c.conditionalOnYesOf === q.no)
    if (child) reveal.push({ name: `q${child.no}`, label: child.text, type: "yesno" })
    // Q7 → felony / serious-offense conviction sub-question (drives Certificate of Relief).
    if (q.no === 7) {
      reveal.push({
        name: "q7_felony",
        label: "Were you ever convicted of, or did you plead guilty to, a felony or a serious offense as defined in Penal Law § 265.00(17)?",
        type: "yesno",
        help: "If yes, an ORIGINAL Certificate of Relief from Disabilities must be submitted. A dismissed or sealed arrest with no conviction does not require one.",
      })
    }
    fields.push({
      name: `q${q.no}`,
      label: `${q.no}. ${q.text}`,
      type: "yesno",
      help: q.note, // Q7's verbatim arrest note; undefined elsewhere
      leoOnly: q.leoOnly,
      revealOnYes: reveal,
    })
  }
  return fields
}

export const QUESTIONNAIRES: Record<string, Questionnaire> = {
  // ── Affidavit of Familiarity with Rules and Law (38 RCNY 5-33) — NOTARISED ──
  "affidavit-familiarity": {
    id: "affidavit-familiarity",
    title: "Affidavit of familiarity (38 RCNY 5-33)",
    intro:
      "A short sworn affidavit that you're responsible for knowing the laws and rules that apply to your licence. We fill in your county; you sign it before a notary — leave the date for the notary.",
    notice: "This form must be notarised. Sign it before a notary — don't sign it beforehand — and upload the notarised copy.",
    submitLabel: "Generate my affidavit",
    fields: [
      {
        name: "county",
        label: "County you'll swear this in",
        type: "text",
        required: true,
        help: "Usually your home county — Manhattan is New York County, Brooklyn is Kings County, Staten Island is Richmond County.",
      },
    ],
  },

  // ── Acknowledgement of Person Agreeing to Safeguard Firearm(s) — WITNESSED ──
  "safeguard-acknowledgement": {
    id: "safeguard-acknowledgement",
    title: "Person agreeing to safeguard your firearm(s)",
    intro:
      "The person you designated will safeguard and surrender your firearm(s) if you die or become incapacitated. They must be a New York State resident. We've carried over what you told us — confirm and complete their details. They sign this before a witness (not a notary).",
    notice: "The designated person must be a New York State resident, and signs before a witness. Upload the completed, witnessed form.",
    submitLabel: "Generate the acknowledgement",
    prefill: (ctx) => {
      const parts = (ctx.intake.safeguardName ?? "").trim().split(/\s+/).filter(Boolean)
      const first = parts[0] ?? ""
      const last = parts.length > 1 ? parts[parts.length - 1] : ""
      return {
        applicantName: ctx.clientName,
        safeguardFirstName: first,
        safeguardLastName: last,
        safeguardStreet: ctx.intake.safeguardAddress ?? "",
        safeguardHomePhone: ctx.intake.safeguardPhone ?? "",
      }
    },
    fields: [
      { name: "applicantName", label: "Your full legal name", type: "text", required: true, fact: "applicant.fullName" },
      { name: "safeguardLastName", label: "Their last name", type: "text", required: true },
      { name: "safeguardFirstName", label: "Their first name", type: "text", required: true },
      { name: "safeguardMI", label: "Middle initial", type: "text" },
      { name: "safeguardStreet", label: "Their street address", type: "text", required: true },
      { name: "safeguardApt", label: "Apt", type: "text" },
      { name: "safeguardCity", label: "City", type: "text", required: true },
      { name: "safeguardZip", label: "ZIP (New York State only)", type: "text", required: true, help: "The person you designate must be a New York State resident." },
      { name: "safeguardHomePhone", label: "Home phone", type: "text" },
      { name: "safeguardCellPhone", label: "Cell phone", type: "text" },
      { name: "safeguardBusinessPhone", label: "Business phone", type: "text" },
    ],
  },


  // Penal Law 35/265/400 — NOT an upload and NOT notarised (there is no such NYPD
  // form). We author a plain-language explanation of what the three articles cover;
  // the applicant reads it and signs, so we have a record they were informed before
  // affirming it to NYPD (in the Letter of Necessity + step-16 affirmation). Held
  // internally. WE EXPLAIN THE ARTICLES; we never say how the law applies to them.
  "penal-law-affirmation": {
    id: "penal-law-affirmation",
    title: "Penal Law Articles 35, 265 & 400",
    intro:
      "The application asks you to affirm you have read and are familiar with New York Penal Law Articles 35, 265 and 400. Below is a plain-language summary of what each covers. Read it, then confirm and sign — this is our record that you were informed. It is not legal advice about your situation.",
    submitLabel: "Confirm & sign",
    fields: [
      { name: "fullName", label: "Your full legal name", type: "text", required: true, fact: "applicant.fullName" },
      {
        name: "ackArt35",
        label: "I have read the summary of Article 35 — justification, and the use of physical and deadly force.",
        type: "checkbox",
        required: true,
      },
      {
        name: "ackArt265",
        label: "I have read the summary of Article 265 — criminal possession and use of a firearm.",
        type: "checkbox",
        required: true,
      },
      {
        name: "ackArt400",
        label: "I have read the summary of Article 400 — licensing and the responsibilities of a handgun licensee.",
        type: "checkbox",
        required: true,
      },
    ],
  },

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

  // Letter of Necessity (LON-01) — the six statements page 4 of the application (and
  // the standalone official form) require of a carry applicant. 1 and 3 are yours to
  // write; 2, 4, 5 and 6 are the form's own acknowledgements, pre-filled for you to
  // review and adjust. The same six values fill page 4 of your prepared PD 643-041.
  "letter-of-necessity": {
    id: "letter-of-necessity",
    title: "Letter of Necessity",
    intro:
      "A carry licence for business or professional use requires a Letter of Necessity — the official form the NYPD provides (it must be used in all cases). Answer the two questions about your own situation; the four acknowledgements are pre-filled from the form's language for you to confirm or refine. You sign it as part of your application.",
    submitLabel: "Prepare my Letter of Necessity",
    prefill: () => ({
      lop2:
        "I acknowledge that the handgun may be carried only during the course of, and strictly in connection with, my job, business, or occupational requirements as described herein.",
      lop4:
        "I have been trained, or will receive training, in the use and safety of a handgun before carrying it.",
      lop5:
        "I (or my employer, if applicable) am aware of the responsibility to properly dispose of the handgun and return the licence to the License Division upon the termination of my employment or the cessation of the business.",
      lop6:
        "I have read and am familiar with the provisions of Penal Law Articles 35 (use of deadly force), 265 (criminal possession and use of a firearm), and 400 (responsibilities of a handgun licensee).",
    }),
    fields: [
      {
        name: "lop1",
        label: "1. The employment, and why it requires carrying a concealed handgun",
        type: "textarea",
        help: "A detailed description of the employment and the specific reason the work requires carrying a concealed handgun. On a sponsored case your employer provides this.",
        required: true,
        maxLength: 1200,
        party: "sponsor",
        lonScope: "business",
      },
      {
        name: "lop2",
        label: "2. Acknowledgement — carried only for the job described",
        type: "textarea",
        maxLength: 800,
        party: "applicant",
        lonScope: "guard",
      },
      {
        name: "lop3",
        label: "3. How the handgun will be safeguarded when not in use",
        type: "textarea",
        help: "How the handgun is safeguarded when it is not being carried. On a sponsored case your employer provides this.",
        required: true,
        maxLength: 1200,
        party: "sponsor",
        lonScope: "all",
      },
      { name: "lop4", label: "4. Acknowledgement — trained in use and safety", type: "textarea", maxLength: 800, party: "applicant", lonScope: "carry" },
      {
        name: "lop5",
        label: "5. Acknowledgement — disposal and licence return",
        type: "textarea",
        help: "On a sponsored case your employer acknowledges its responsibility to dispose of the handgun and return the licence when the employment ends.",
        maxLength: 800,
        party: "sponsor",
        lonScope: "guard",
      },
      { name: "lop6", label: "6. Acknowledgement — familiar with Penal Law Art. 35, 265, 400", type: "textarea", maxLength: 800, party: "applicant", lonScope: "all" },
    ],
  },

  // Confidentiality (portal step 11) — the Public Records Exemption, filled INLINE as
  // data (not uploaded). By default a licensee's name, address and licence type are a
  // public record and are released on request; this asks the License Division to
  // withhold them. Optional.
  "confidentiality": {
    id: "confidentiality",
    title: "Confidentiality (Public Records Exemption)",
    intro:
      "By default, a handgun licensee's name, ZIP code and licence type are a public record and are released to newspapers on request. You may ask the License Division to keep them confidential. This is optional — answer No to skip it.",
    submitLabel: "Save my confidentiality request",
    fields: [
      {
        name: "requesting",
        label: "Do you want to request that your information be kept confidential?",
        type: "yesno",
        revealOnYes: [
          { name: "g1a", label: "My safety may be endangered — I am/was an active or retired police, peace, probation, parole, or corrections officer", type: "checkbox" },
          { name: "g1b", label: "I am/was a protected person under a currently valid order of protection", type: "checkbox" },
          { name: "g1c", label: "I am/was a witness in a criminal proceeding involving a criminal charge", type: "checkbox" },
          { name: "g1d", label: "I am/was a juror or grand juror in a criminal proceeding", type: "checkbox" },
          { name: "g2", label: "My safety, or my spouse/partner/household member's, may be endangered for some other reason (explain below)", type: "checkbox" },
          { name: "g3", label: "I am the spouse, domestic partner, or household member of a person described above", type: "checkbox" },
          { name: "g4", label: "I have reason to believe I may be subject to unwarranted harassment on disclosure", type: "checkbox" },
          { name: "item5", label: "Additional supportive information", type: "textarea", maxLength: 2000 },
          {
            name: "election",
            label: "Scope of this request",
            type: "select",
            options: [
              { value: "all", label: "Apply this request to all my NYC handgun licence applications and licences" },
              { value: "withdraw", label: "I am not submitting a request, and withdraw any previous requests" },
            ],
          },
        ],
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
    title: "The application's disclosure questions",
    intro:
      "The NYPD online portal asks these seventeen questions about your history, in these exact words. Answer each honestly; for every 'yes', add a written explanation. These are the answers we record and enter for you — the part people get wrong. Disclose everything, including anything sealed, dismissed, or nullified.",
    notice: CANDOR_NOTICE,
    attorneySeam: true,
    submitLabel: "Save my answers",
    // No prefill from the old paper-form intake: the portal question set is materially
    // different (drugs split into three, Q14 is the PROTECTED person, corporate/subpoena
    // questions gone), so a carried-over answer could be wrong on a sworn form. Fresh
    // answers, every one — see PORTAL_ALIGNMENT_REBUILD "migrate nothing blindly".
    fields: disclosureFields(),
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
