export type Phase = { num: string; title: string; desc: string; color: string }

// Keep these in sync with the desktop column layout and its open-width formula.
export const COL_GAP = 12
export const COL_GROW = 3.4

export const PHASES: Phase[] = [
  { num: "01", title: "Qualify", desc: "Understand the license track, basic fit, and what may require an attorney.", color: "#2FA8EE" },
  { num: "02", title: "Train", desc: "Plan the required course and protect the six-month certificate window.", color: "#5B6CFF" },
  { num: "03", title: "Assemble", desc: "Collect references, household statements, records, IDs, and disclosures.", color: "#8A5BEA" },
  { num: "04", title: "Review", desc: "Run a structured completeness check before anything is ready to submit.", color: "#C24FC9" },
  { num: "05", title: "You submit", desc: "Review your packet, submit it yourself, then prepare for the next NYPD step.", color: "#EE5E8C" },
]

export const LOOP_MS = 6500
export const HOLD_AFTER_PICK_MS = 10000
