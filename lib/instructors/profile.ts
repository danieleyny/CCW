/**
 * When is an instructor ready to be shown to applicants?
 *
 * Signup stays light on purpose — name, email, password, DCJS id — because a
 * long form loses instructors. The cost of that is a profile too thin to choose
 * from, so "live" is a separate bar:
 *
 *   VERIFIED   — an admin checked the DCJS credential. This is what the
 *                "DCJS-credentialed" badge means, and the ONLY thing it may
 *                mean. Typing a credential number into a box is not a credential.
 *   COMPLETE   — enough for a nervous first-timer to decide: where you teach,
 *                what it costs, what's included, who you are, what language
 *                you teach in, and whether the range is sorted.
 *
 * Both are required to appear in an applicant's feed or to send an offer.
 * Neither blocks saving a half-finished profile.
 *
 * NY LAW: the required 18-hour course (16h classroom + 2h live fire) is
 * IN-PERSON. Nothing in a profile may advertise a virtual required course; the
 * only remote thing an instructor may offer is a free, optional intro call.
 */
import type { Database } from "@/lib/supabase/types"

type InstructorRow = Database["public"]["Tables"]["instructors"]["Row"]
type LocationRow = Database["public"]["Tables"]["training_locations"]["Row"]

export interface ProfileCheck {
  key: string
  label: string
  /** Why an applicant cares — this is what makes the checklist persuasive. */
  why: string
  done: boolean
}

export interface ProfileCompleteness {
  checks: ProfileCheck[]
  /** 0–100, for the meter. */
  percent: number
  complete: boolean
  missing: ProfileCheck[]
}

export type InstructorProfileInput = Pick<
  InstructorRow,
  | "bio"
  | "price_18h_cents"
  | "class_format"
  | "languages"
  | "provides_range"
  | "separate_range_note"
> & { locations?: Pick<LocationRow, "is_range" | "address">[] }

export function evaluateProfile(instructor: InstructorProfileInput): ProfileCompleteness {
  const locations = instructor.locations ?? []
  // A classroom location WITH an address — "Manhattan" isn't somewhere you can
  // drive to, and the 16 classroom hours have to happen somewhere real.
  const hasClassroom = locations.some((l) => !l.is_range && !!l.address?.trim())

  // Either you supply the range, or you say which range they'd go to. Silence
  // here is the single most expensive surprise in this whole transaction.
  const rangeSorted =
    instructor.provides_range === true ||
    (instructor.provides_range === false && !!instructor.separate_range_note?.trim())

  const checks: ProfileCheck[] = [
    {
      key: "bio",
      label: "A short bio",
      why: "Applicants are choosing who teaches them to carry a firearm. A few sentences about you does more than anything else on the card.",
      done: (instructor.bio?.trim().length ?? 0) >= 40,
    },
    {
      key: "price",
      label: "Your price for the 18-hour course",
      why: "A card without a price gets skipped.",
      done: (instructor.price_18h_cents ?? 0) > 0,
    },
    {
      key: "classroom",
      label: "A classroom location with a street address",
      why: "The 16 classroom hours are in person — people need to know where they're going.",
      done: hasClassroom,
    },
    {
      key: "range",
      label: "Whether the live-fire range is included",
      why: "The range fee is the most common surprise cost. Say you provide it, or name the range they'd use.",
      done: rangeSorted,
    },
    {
      key: "format",
      label: "Class format",
      why: "Private vs small group changes who books you.",
      done: !!instructor.class_format,
    },
    {
      key: "languages",
      label: "Languages you teach in",
      why: "This is the deciding factor for a lot of New Yorkers.",
      done: (instructor.languages ?? []).length > 0,
    },
  ]

  const done = checks.filter((c) => c.done).length
  return {
    checks,
    percent: Math.round((done / checks.length) * 100),
    complete: done === checks.length,
    missing: checks.filter((c) => !c.done),
  }
}

/** Can this instructor be shown to applicants / send offers right now? */
export function isLiveEligible(
  instructor: InstructorProfileInput & Pick<InstructorRow, "verified" | "active">
): boolean {
  if (!instructor.verified || !instructor.active) return false
  return evaluateProfile(instructor).complete
}

/**
 * The required course is in-person, full stop. Instructors write their own bio,
 * background and "what's included" copy, and an instructor who advertises a
 * virtual required course creates a legal problem for the applicant and for us.
 * This catches the claim in free text; admin verification is the backstop.
 */
const VIRTUAL_WORD = /\b(virtual|online|remote|zoom|via video|over video)\b/i
const COURSE_WORD = /\b(course|class|classes|training|instruction|certification|16[- ]?hour|18[- ]?hour|live[- ]?fire)\b/i
/** Phrases that make a "virtual" mention legitimate: it's the intro, not the course. */
const INTRO_WORD = /\b(intro|introduction|introductory|consult|consultation|call|q&a|questions?|meet)\b/i
/** An explicit in-person statement in the same breath is the opposite of the claim. */
const IN_PERSON = /\bin[- ]person\b/i

/**
 * Sentence by sentence rather than one greedy pattern: "a free Zoom intro call —
 * the course itself is in person" is exactly the thing we WANT instructors to
 * say, and a single regex kept flagging it.
 */
export function findVirtualCourseClaim(text: string | null | undefined): string | null {
  if (!text) return null
  for (const raw of text.split(/(?<=[.!?\n])\s+/)) {
    const sentence = raw.trim()
    if (!sentence) continue
    if (!VIRTUAL_WORD.test(sentence) || !COURSE_WORD.test(sentence)) continue
    // "virtual intro call" / "online Q&A" — the non-required extra, which is fine.
    if (INTRO_WORD.test(sentence)) continue
    // "…the course itself is in person" — the claim's own disclaimer.
    if (IN_PERSON.test(sentence)) continue
    return sentence
  }
  return null
}

export const VIRTUAL_COURSE_MESSAGE =
  "New York requires the 18-hour course to be in person (16 classroom hours + 2 hours live fire), so it can't be described as virtual or online. If you offer a free intro call before the course, turn on “Offer a free intro call” instead."

/** Copy an instructor writes is their claim — but not these claims. */
const BANNED_CLAIMS = /\b(guarantee[ds]?|guaranteed approval|expedite[ds]?|fast[- ]track|insider|NYPD[- ]endorsed|endorsed by the NYPD|approval rate)\b/i

export function findBannedClaim(text: string | null | undefined): string | null {
  if (!text) return null
  const m = text.match(BANNED_CLAIMS)
  return m ? m[0] : null
}

export const BANNED_CLAIM_MESSAGE =
  "We can't publish language that promises an outcome or implies an endorsement — NYPD doesn't endorse anyone, and nobody can guarantee or speed up a licence. Describe what you actually provide instead."
