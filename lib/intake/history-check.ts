/**
 * CARRY GUARD task 9 — soft continuity checks for the five-year residence and
 * employment histories.
 *
 * A gap in a sworn history is what generates a deficiency letter months later, so we
 * check for it up front — but as GUIDANCE, never a hard block. The portal itself
 * enforces nothing here; we require start/end on both histories, warn on gaps and
 * overlaps, and ask that the most recent entry run to the present. Every message is
 * addressed to the applicant, in plain language, so it reads as help rather than a
 * validation error.
 *
 * Pure and dependency-free so it can be unit-tested and run on either surface (the
 * intake wizard and the "Your details" facts editor) identically.
 */

export type HistoryRow = { fromMonth?: string; toMonth?: string }
export type HistoryNotice = { kind: "missing-dates" | "not-present" | "gap" | "overlap"; message: string }

/** Month index (year*12 + monthIndex) from "YYYY-MM" or "YYYY-MM-DD"; null if unset/invalid. */
function monthIndex(iso?: string): number | null {
  if (!iso) return null
  const m = /^(\d{4})-(\d{2})/.exec(iso.trim())
  if (!m) return null
  const year = Number(m[1])
  const month = Number(m[2])
  if (month < 1 || month > 12) return null
  return year * 12 + (month - 1)
}

function currentMonthIndex(now = new Date()): number {
  return now.getFullYear() * 12 + now.getMonth()
}

/** A short "Mon YYYY" label for a month index, for friendly messages. */
function monthLabel(idx: number): string {
  const year = Math.floor(idx / 12)
  const month = idx % 12
  return `${["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"][month]} ${year}`
}

/**
 * Guidance for one history. `noun` is the verb the applicant reads ("lived" / "worked").
 * `now` is injectable for tests. Empty rows (no dates at all) are ignored — an unstarted
 * row is not a defect, it's just blank.
 */
export function checkHistory(rows: HistoryRow[], noun: "lived" | "worked", now = new Date()): HistoryNotice[] {
  const notices: HistoryNotice[] = []
  // Only rows the applicant has actually started (any date present).
  const started = rows.filter((r) => monthIndex(r.fromMonth) !== null || monthIndex(r.toMonth) !== null)
  if (started.length === 0) return notices

  const nowIdx = currentMonthIndex(now)
  const place = noun === "lived" ? "lived" : "worked"

  // 1) Require start AND end on every row — except the single most-recent one, which may
  //    run to "Present" (blank end).
  const withFrom = started.map((r) => ({ from: monthIndex(r.fromMonth), to: monthIndex(r.toMonth), row: r }))
  const newestFrom = Math.max(...withFrom.map((r) => r.from ?? -Infinity))
  let missing = false
  for (const r of withFrom) {
    if (r.from === null) missing = true
    // A blank end is only OK on the most-recent entry (that's "Present").
    if (r.to === null && r.from !== newestFrom) missing = true
  }
  if (missing) {
    notices.push({
      kind: "missing-dates",
      message: `Add the month you moved in and out of every place you ${place} — a five-year history has to have no missing dates. Leave only your current one open, marked “Present.”`,
    })
  }

  // 2) The most-recent entry should run to today.
  const newest = withFrom.find((r) => r.from === newestFrom)
  if (newest && newest.to !== null && newest.to < nowIdx) {
    notices.push({
      kind: "not-present",
      message: `Your most recent entry ends in ${monthLabel(newest.to)}. If you still ${place} there, mark it “Present”; if not, add where you ${place} since then.`,
    })
  }

  // 3) Gaps and overlaps between consecutive entries (sorted oldest → newest).
  const ordered = withFrom
    .filter((r) => r.from !== null)
    .sort((a, b) => (a.from as number) - (b.from as number))
  for (let i = 1; i < ordered.length; i++) {
    const prev = ordered[i - 1]
    const cur = ordered[i]
    const prevEnd = prev.to ?? nowIdx // an open earlier row is treated as running to now
    if (cur.from !== null && cur.from > prevEnd + 1) {
      notices.push({
        kind: "gap",
        message: `There’s a gap between ${monthLabel(prevEnd)} and ${monthLabel(cur.from)} — add where you ${place} in between so there are no unexplained months.`,
      })
    } else if (cur.from !== null && prev.to !== null && cur.from < prev.to) {
      notices.push({
        kind: "overlap",
        message: `Two entries overlap around ${monthLabel(cur.from)} — check those dates so the timeline is clean.`,
      })
    }
  }

  return notices
}
