const NY_TZ = "America/New_York"

export function adminDayKey(value: Date) {
  const parts = new Intl.DateTimeFormat("en-US", { timeZone: NY_TZ, year: "numeric", month: "2-digit", day: "2-digit" }).formatToParts(value)
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? ""
  return `${get("year")}-${get("month")}-${get("day")}`
}

export function addAdminBusinessDays(value: Date, count: number) {
  const date = new Date(value)
  let added = 0
  while (added < count) {
    date.setUTCDate(date.getUTCDate() + 1)
    const weekday = new Intl.DateTimeFormat("en-US", { timeZone: NY_TZ, weekday: "short" }).format(date)
    if (weekday !== "Sat" && weekday !== "Sun") added++
  }
  return date
}
