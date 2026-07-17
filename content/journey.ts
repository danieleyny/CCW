import type { CaseStageKey } from "@/config/stages"

/**
 * The PUBLIC story of the 13 stages — written for a first-time applicant.
 *
 * WHY THIS FILE EXISTS: /how-it-works used to render `config/stages.ts` straight
 * to customers, so the page opened by calling the reader a "Lead / Inquiry" and
 * describing them in the third person ("Prospect reached out…"). That file is
 * the OPERATIONAL vocabulary — admin, portal, instructor, reports and the stage
 * badges all import it, and staff genuinely need "Lead / Inquiry".
 *
 * So the two vocabularies are separated rather than compromised: `config/stages.ts`
 * stays the internal source of truth for pipeline state, and this file is what a
 * nervous human reads. Keys are typed to `CaseStageKey`, so if a stage is ever added
 * or renamed the compiler forces this map to keep up — the public story can't
 * silently drift from the real process.
 *
 * Voice: second person, plain, and it says what WE do at each step — because the
 * reason to read this page is to find out how much of it you have to carry.
 */
export interface JourneyStep {
  /** Plain-English name for the step. */
  label: string
  /** What actually happens, and what we do about it. */
  description: string
}

export const JOURNEY: Record<CaseStageKey, JourneyStep> = {
  lead: {
    label: "We hear from you",
    description:
      "You reach out or take the two-minute eligibility check. No payment, no commitment — just a straight read on where you stand.",
  },
  eligibility_screened: {
    label: "We check where you stand",
    description:
      "We look at your age, where you live or work, and anything in your history that needs care. If something needs a closer look, we tell you now rather than later.",
  },
  signed_up_paid: {
    label: "You're on board",
    description:
      "You pick how much you want us to handle, and we open your case. From here, one team is tracking every requirement.",
  },
  training_scheduled: {
    label: "We get your course booked",
    description:
      "Your 18-hour safety course is the longest-lead item, so it goes first. We help you find a state-certified instructor and get dates on the calendar.",
  },
  training_complete: {
    label: "Your training is done",
    description:
      "Classroom hours, live fire, and the written test behind you. Your certificate has a clock on it, so we track the date to make sure it's still good when you file.",
  },
  document_collection: {
    label: "We gather everything",
    description:
      "References, statements from everyone at home, your photos, your disclosures. We send the links, chase the people, and keep the whole list moving so you're not the one following up.",
  },
  notarization: {
    label: "We handle the notary runaround",
    description:
      "Your references and household statements have to be notarized. We line it up — most of it can be done online in about ten minutes each.",
  },
  application_assembled: {
    label: "We check it, you review it",
    description:
      "Every requirement gets checked for complete and correct, and the packet is assembled in the order the License Division reads it. Then you look it over.",
  },
  filed: {
    label: "You file it",
    description:
      "You submit your own application — that's the law, and it's not a technicality. Our job is making sure that when you do, nothing is missing.",
  },
  fingerprinting_booked: {
    label: "Fingerprints and your interview",
    description:
      "You get fingerprinted and sit down with the License Division. We make sure what you filed and what you say line up.",
  },
  under_investigation: {
    label: "The NYPD reviews your case",
    description:
      "The background check and character review happen on the NYPD's schedule, not ours. Nobody can speed this up — but a complete file is the thing that keeps it moving.",
  },
  decision: {
    label: "Your decision arrives",
    description:
      "The License Division decides. If anything comes back needing work, you're not on your own with it.",
  },
  licensed: {
    label: "You're licensed",
    description:
      "Your license is issued for a three-year term. We track your renewal from day one, so it never quietly lapses on you.",
  },
}
