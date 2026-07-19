/**
 * PART C / Phase 9 — interview-prep content, honest and reassuring.
 *
 * This prepares an applicant for the License Division interview. It is PREP,
 * not coaching to mislead: candor is the whole strategy, and every practice
 * question is answered the same way — truthfully and completely. Nothing here
 * suggests how to shade an answer, and anything touching the meaning of a
 * specific record routes to the attorney seam, never to a canned reply.
 *
 * Content-driven so it's easy for staff/counsel to review and keep current.
 */

export interface InterviewSection {
  title: string
  intro?: string
  points: string[]
}

export interface PracticeQuestion {
  q: string
  /** How to APPROACH it — candor-first — never a scripted "right answer". */
  approach: string
}

export const INTERVIEW_OVERVIEW =
  "If the License Division needs to speak with you, it's usually a straightforward, in-person interview at One Police Plaza (or the Queens annex for rifle/shotgun matters). An investigator confirms your identity and goes over your application and any disclosures. It is not a test to trick you — it's a chance to confirm what you already submitted. Come as your calm, prepared self."

export const INTERVIEW_SECTIONS: InterviewSection[] = [
  {
    title: "What to bring",
    intro: "Bring originals of what you filed, plus anything the investigator asked for by letter.",
    points: [
      "Government photo ID and your appointment notice or letter.",
      "Originals of your key documents — the ones you uploaded were copies.",
      "Any additional item the License Division specifically requested from you.",
      "Your own written statements, so you can speak to them consistently.",
    ],
  },
  {
    title: "What actually happens",
    points: [
      "You check in, show ID, and wait to be called — build in time; it can run long.",
      "An investigator reviews your application with you and may ask you to explain items in your own words.",
      "If you disclosed an arrest, order of protection, or a health question, expect to talk through it plainly.",
      "You may be asked about your reasons and your understanding of the rules for carrying or storing a firearm.",
    ],
  },
  {
    title: "How to prepare",
    intro: "Preparation here means knowing your own file — not rehearsing lines.",
    points: [
      "Re-read everything you submitted so nothing surprises you.",
      "Be ready to describe each disclosure in a sentence or two: what happened, and how it resolved.",
      "Answer only what's asked, truthfully and completely. Guessing or padding hurts more than a short honest answer.",
      "If a question is about the legal meaning of your record, it's fine to say you'd want your attorney to speak to that — that's not evasive, it's correct.",
    ],
  },
  {
    title: "On the day",
    points: [
      "Arrive early, dress like you would for any government office, and silence your phone.",
      "Be polite and direct. Investigators do this all day; calm and factual is exactly what helps.",
      "If you don't know an answer, say so rather than guessing.",
      "It's okay to be nervous — say it if it helps. Honesty includes how you're feeling.",
    ],
  },
]

/**
 * Honest practice questions. Every "approach" is candor-first. None of these is
 * a script — the point is to reduce surprise, not to manufacture an answer.
 */
export const PRACTICE_QUESTIONS: PracticeQuestion[] = [
  {
    q: "Why do you want this license?",
    approach:
      "Answer in your own honest words. Speak to your actual reasons; don't recite something you think they want to hear.",
  },
  {
    q: "Walk me through this arrest / summons on your record.",
    approach:
      "State what happened, the date, and how it resolved — plainly and completely. You already disclosed it; the interview just confirms it. If it's about what the disposition legally means, that's a question for your attorney.",
  },
  {
    q: "Where and how will you store the firearm?",
    approach:
      "Describe your actual storage plan — the safe, where it is, that it stays in New York. This should match the safe-storage evidence you submitted.",
  },
  {
    q: "Have you told us about everything in your background?",
    approach:
      "Yes — and mean it. Sealed and dismissed matters are disclosed too. If you remember something you left out, say so now; a late correction is far better than an omission found later.",
  },
  {
    q: "Do you understand the rules about where you can and can't carry?",
    approach:
      "Show that you've learned the sensitive-location and safe-handling rules from your training. If you're unsure on a specific point, it's fine to say you'd confirm it rather than guess.",
  },
]

export const INTERVIEW_DISCLAIMER =
  "This is general preparation, not legal advice. If a question touches the specifics of your record, that belongs with a licensed attorney — ask us and we'll connect you.";
