/**
 * PART C / Phase 13 — trainer onboarding content.
 *
 * The rules a trainer must agree to before reaching applicants — the platform's
 * non-negotiables, phrased plainly. A trainer reads each and acknowledges it;
 * agreeing to all of them is the gate to go live (no graded quiz).
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
      "I understand that, as the instructor, I never file, submit, or represent anyone before the NYPD License Division, and I won't imply that I can. Filing is handled by the applicant (Self-Guided) or by Gun License NYC (Full Concierge) — never by me.",
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

export const ONBOARDING_INTRO =
  "A few minutes before you go live. These are the rules that keep applicants safe and keep this platform trustworthy — the privacy firewall, candor, and the fact that applicants file their own applications. Read each and agree to it."
