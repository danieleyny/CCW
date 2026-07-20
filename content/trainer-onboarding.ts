/**
 * PART C / Phase 13 — trainer onboarding content.
 *
 * The rules a trainer must acknowledge before reaching applicants. These are the
 * platform's non-negotiables, phrased plainly. The acknowledgements are the
 * checklist; the quiz confirms they actually read the two that most often go
 * wrong (the privacy firewall and no-legal-advice).
 */

export interface Acknowledgement {
  key: string
  label: string
}

export const ONBOARDING_ACKNOWLEDGEMENTS: Acknowledgement[] = [
  {
    key: "firewall",
    label:
      "I understand I will NEVER see an applicant's disclosures — arrests, orders of protection, domestic incidents, or health questions. Those are handled by Gun License NYC, and I won't ask an applicant to share them with me.",
  },
  {
    key: "no_legal_advice",
    label:
      "I will not give legal advice. I help with the completeness and format of paperwork — not with what a record means or how to improve someone's odds. Anything like that, I route back to Gun License NYC and the attorney seam.",
  },
  {
    key: "applicant_files",
    label:
      "I understand the applicant files their own application. I never file, submit, or represent anyone before the NYPD License Division, and I won't imply that I can.",
  },
  {
    key: "candor",
    label:
      "I will never suggest omitting or minimizing anything on an application. Candor is the requirement, always.",
  },
  {
    key: "no_overclaim",
    label:
      "I won't promise or imply outcomes — no guarantees, no expediting, no 'insider' access, no approval rates. NYPD's decision is NYPD's.",
  },
  {
    key: "training_in_person",
    label:
      "I understand the required 18-hour course (16h classroom + 2h live-fire) is in person, and I won't advertise a virtual required course.",
  },
]

export interface QuizQuestion {
  key: string
  q: string
  options: string[]
  /** Index of the correct option. */
  answer: number
  /** Shown if they pick wrong — teaches, doesn't just fail. */
  explain: string
}

export const ONBOARDING_QUIZ: QuizQuestion[] = [
  {
    key: "sees_disclosures",
    q: "An applicant you're helping mentions they have an old arrest and asks if it will be a problem. What do you do?",
    options: [
      "Give them your read on how it'll affect their application.",
      "Tell them that's outside what you handle, and route them back to Gun License NYC / the attorney seam.",
      "Ask them to upload the arrest record so you can review it.",
    ],
    answer: 1,
    explain:
      "You never see disclosures and you don't advise on records. Route it back — that's both the firewall and the no-legal-advice rule.",
  },
  {
    key: "who_files",
    q: "Who submits the application to the NYPD License Division?",
    options: [
      "You, on the applicant's behalf, once their documents are ready.",
      "Gun License NYC files it for them.",
      "The applicant files their own application; you help prepare it.",
    ],
    answer: 2,
    explain: "The applicant always files their own application. We prepare and review — we never file or represent.",
  },
  {
    key: "outcome",
    q: "An applicant asks you to guarantee they'll be approved if they take your course. You:",
    options: [
      "Say your students have a high approval rate.",
      "Explain that no one can promise an outcome — the decision is the NYPD's.",
      "Tell them it's very likely if their paperwork is clean.",
    ],
    answer: 1,
    explain: "No guarantees, no approval-rate claims. The decision belongs to the NYPD, and saying otherwise is an overclaim we don't make.",
  },
]

export const ONBOARDING_INTRO =
  "A few minutes before you go live. These are the rules that keep applicants safe and keep this platform trustworthy — the privacy firewall, candor, and the fact that applicants file their own applications. Read each, acknowledge it, and answer three short questions."
