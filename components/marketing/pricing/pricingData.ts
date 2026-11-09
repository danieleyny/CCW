import { TRAINING_PRICE_RANGE } from "@/content/training/config"

export type Tone = "ours" | "warn" | "dim"

export type Fee = {
  title: string
  mobileTitle?: string
  value: string
  tag: string
  mobileTag?: string
  tone: Tone
  ours?: boolean
  varies?: boolean
  lanes: number
}

export type Stop = {
  num: string
  phase: string
  when: string
  title: string
  value: string
  tag: string
  tone: Tone
  note: string
  run: string
  runMin: number
  runMax: number
  lanes: number
  ours?: boolean
  varies?: boolean
  isDecision?: boolean
}

export const ALL_IN = "$1,950–2,200"
export const METER_MAX = 2200
export const OUR_FEE = 1000

export const FEES: Fee[] = [
  { title: "Full concierge", value: "$1,000", tag: "Keeps your filing complete", tone: "ours", ours: true, lanes: 3 },
  { title: "NYPD application", value: "$340", tag: "At cost · non-refundable", mobileTag: "Non-refundable", tone: "warn", lanes: 2 },
  { title: "Fingerprint fee", value: "$88.25", tag: "At cost · non-refundable", mobileTag: "Non-refundable", tone: "warn", lanes: 1 },
  { title: "Required training", value: TRAINING_PRICE_RANGE, tag: "At cost · varies", tone: "dim", varies: true, lanes: 2 },
  { title: "Expected notarization", mobileTitle: "Notarization", value: "$25–100", tag: "At cost · varies", tone: "dim", varies: true, lanes: 1 },
]

export const AT_COST_FEES = FEES.filter((fee) => !fee.ours)

export const STOPS: Stop[] = [
  { num: "01", phase: "Start", when: "Day 1", title: "Full concierge", value: "$1,000", tag: "Our only service fee", tone: "ours", note: "Your case opens and your checklist is built.", run: "$1,000", runMin: 1000, runMax: 1000, lanes: 3, ours: true },
  { num: "02", phase: "Train", when: "Month 1", title: "Required training", value: TRAINING_PRICE_RANGE, tag: "At cost · varies", tone: "dim", note: "18 hours. Book early so the certificate is current when you file.", run: "$1,500–1,650", runMin: 1500, runMax: 1650, lanes: 2, varies: true },
  { num: "03", phase: "Assemble", when: "Months 1–2", title: "Notarization", value: "$25–100", tag: "At cost · varies", tone: "dim", note: "Statements and forms signed before a notary.", run: "$1,525–1,750", runMin: 1525, runMax: 1750, lanes: 1, varies: true },
  { num: "04", phase: "File", when: "At filing", title: "NYPD application", value: "$340", tag: "Non-refundable", tone: "warn", note: "Paid online when you submit your application.", run: "$1,865–2,090", runMin: 1865, runMax: 2090, lanes: 2 },
  { num: "05", phase: "Fingerprint", when: "After filing", title: "Fingerprint fee", value: "$88.25", tag: "Non-refundable", tone: "warn", note: "Paid at your fingerprinting appointment.", run: "~$1,955–2,180", runMin: 1953, runMax: 2178, lanes: 1 },
  { num: "06", phase: "Decision", when: "~6 months", title: "NYPD decision", value: "—", tag: "Investigation & interview", tone: "dim", note: "Typical planning horizon from start to decision.", run: "~$1,955–2,180", runMin: 1953, runMax: 2178, lanes: 0, isDecision: true },
]

export const CHECKS = [
  "Every document prepared and organized",
  "A completeness review before you submit",
  "Returned as incomplete? We reassemble it at no extra service charge",
]
