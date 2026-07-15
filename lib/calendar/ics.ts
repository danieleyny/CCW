/**
 * Native iCalendar (.ics) generation — zero cost, universally importable. We
 * email both parties a VEVENT on booking confirmation; no Calendly/Cal.com.
 */

export interface IcsEvent {
  uid: string
  start: Date | string
  end: Date | string
  summary: string
  description?: string
  location?: string
  organizerName?: string
  organizerEmail?: string
  attendeeEmail?: string
  url?: string
}

function toDate(d: Date | string): Date {
  return typeof d === "string" ? new Date(d) : d
}

/** UTC basic format: YYYYMMDDTHHMMSSZ */
function fmt(d: Date): string {
  return d.toISOString().replace(/[-:]/g, "").replace(/\.\d{3}/, "")
}

function esc(s: string): string {
  return s.replace(/\\/g, "\\\\").replace(/;/g, "\\;").replace(/,/g, "\\,").replace(/\r?\n/g, "\\n")
}

export function generateIcs(ev: IcsEvent): string {
  const start = toDate(ev.start)
  const end = toDate(ev.end)
  const lines = [
    "BEGIN:VCALENDAR",
    "VERSION:2.0",
    "PRODID:-//Gun License NYC//Scheduling//EN",
    "CALSCALE:GREGORIAN",
    "METHOD:REQUEST",
    "BEGIN:VEVENT",
    `UID:${ev.uid}`,
    `DTSTAMP:${fmt(new Date())}`,
    `DTSTART:${fmt(start)}`,
    `DTEND:${fmt(end)}`,
    `SUMMARY:${esc(ev.summary)}`,
    ev.description ? `DESCRIPTION:${esc(ev.description)}` : "",
    ev.location ? `LOCATION:${esc(ev.location)}` : "",
    ev.organizerEmail ? `ORGANIZER;CN=${esc(ev.organizerName ?? "Gun License NYC")}:mailto:${ev.organizerEmail}` : "",
    ev.attendeeEmail ? `ATTENDEE;ROLE=REQ-PARTICIPANT;RSVP=TRUE:mailto:${ev.attendeeEmail}` : "",
    ev.url ? `URL:${ev.url}` : "",
    "STATUS:CONFIRMED",
    "END:VEVENT",
    "END:VCALENDAR",
  ].filter((l) => l !== "")
  return lines.join("\r\n")
}

/** A no-API map link for the location address (works without any key). */
export function mapLink(address: string): string {
  return `https://www.google.com/maps/search/?api=1&query=${encodeURIComponent(address)}`
}

const SLOT_TYPE_LABELS: Record<string, string> = {
  classroom_16h: "16-hour classroom",
  live_fire_2h: "2-hour live-fire range",
  combined_18h: "18-hour course (classroom + range)",
  consult: "Consultation",
}

/** Build a booking's ICS + display strings (pure — used by the email sender). */
export function buildBookingIcs(input: {
  bookingId: string
  icsUid?: string | null
  type: string
  startsAt: string
  endsAt: string
  clientEmail?: string | null
  locationLabel?: string | null
  address?: string | null
}): { ics: string; uid: string; locationStr: string; typeLabel: string } {
  const typeLabel = SLOT_TYPE_LABELS[input.type] ?? input.type
  const locationStr = [input.locationLabel, input.address].filter(Boolean).join(", ")
  const uid = input.icsUid ?? `${input.bookingId}@carry.app`
  const ics = generateIcs({
    uid,
    start: input.startsAt,
    end: input.endsAt,
    summary: `Gun License NYC training — ${typeLabel}`,
    description:
      `Your Gun License NYC ${typeLabel}.` +
      (input.address ? ` Map: ${mapLink(input.address)}.` : "") +
      " Bring a photo ID and eye/ear protection.",
    location: locationStr || undefined,
    organizerName: "Gun License NYC",
    attendeeEmail: input.clientEmail ?? undefined,
  })
  return { ics, uid, locationStr, typeLabel }
}
