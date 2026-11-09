/** Presentation-only training time helpers. Session records retain 24-hour
 * America/New_York clock values so calendar exports remain unambiguous. */
function parseClock(value: string) {
  const [rawHour = "0", rawMinute = "0"] = value.split(":")
  const hour = Number(rawHour)
  const minute = Number(rawMinute)
  return { hour: Number.isFinite(hour) ? hour : 0, minute: Number.isFinite(minute) ? minute : 0 }
}

function period(hour: number) { return hour < 12 ? "AM" : "PM" }

function clock(value: string, includePeriod: boolean) {
  const { hour, minute } = parseClock(value)
  const displayHour = hour % 12 || 12
  const minutes = minute === 0 ? "" : `:${String(minute).padStart(2, "0")}`
  return `${displayHour}${minutes}${includePeriod ? ` ${period(hour)}` : ""}`
}

/** `17:00`–`22:00` becomes `5–10 PM`; mixed periods remain explicit. */
export function formatSessionTime(start: string, end: string) {
  const startHour = parseClock(start).hour
  const endHour = parseClock(end).hour
  return period(startHour) === period(endHour)
    ? `${clock(start, false)}–${clock(end, true)}`
    : `${clock(start, true)}–${clock(end, true)}`
}

export function formatTrainingPrice(cents: number) {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    maximumFractionDigits: 0,
  }).format(cents / 100)
}
