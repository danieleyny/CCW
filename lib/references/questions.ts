/** The short questionnaire a character reference answers on the public page. */
export interface ReferenceQuestion {
  key: string
  label: string
  type: "text" | "textarea"
  required?: boolean
}

export const REFERENCE_QUESTIONS: ReferenceQuestion[] = [
  { key: "knownDuration", label: "How long have you known the applicant?", type: "text", required: true },
  { key: "capacity", label: "In what capacity do you know them (friend, coworker, neighbor…)?", type: "text", required: true },
  { key: "character", label: "Describe the applicant's character, judgment, and temperament.", type: "textarea", required: true },
  { key: "safety", label: "Are you aware of anything that would make it unsafe for them to possess a firearm? If so, explain.", type: "textarea" },
]

export type ReferenceAnswers = Record<string, string>
