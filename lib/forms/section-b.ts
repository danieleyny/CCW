/**
 * THE Section B question numbers of PD 643-041, in form order — the ONE list. Four
 * copies of this drifted once already: Part 5 added "20a" to four of the five and
 * missed the fifth (the disclosure-addendum builder), so a sworn "yes" to Q20a
 * rendered no explanation row. One exported constant, imported everywhere, kills that
 * class of bug. lib/forms is the lowest layer here (lib/requirements may import from
 * it, not the reverse), so it lives here.
 *
 * 24/25/26 are three separate questions; 20 (the entity) and 20a (the people) are
 * separate. Twenty numbers, twenty answers.
 */
export const SECTION_B_NUMBERS = [
  "10", "11", "12", "13", "14", "15", "16", "17", "18", "19",
  "20", "20a", "21", "22", "23", "24", "25", "26", "27", "28",
] as const

export type SectionBNumber = (typeof SECTION_B_NUMBERS)[number]
