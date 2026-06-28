/**
 * Optional Google Calendar two-way sync — ships dark behind GOOGLE_CALENDAR_ENABLED.
 * Native .ics invites (lib/calendar/ics.ts) always work; this is an extra. Every
 * entry point no-ops cleanly when the flag/keys are absent, so the app runs fully
 * without Google configured. Uses the free Google Calendar API + OAuth.
 */

export const GOOGLE_CALENDAR_ENABLED =
  process.env.GOOGLE_CALENDAR_ENABLED === "true" &&
  Boolean(process.env.GOOGLE_OAUTH_CLIENT_ID && process.env.GOOGLE_OAUTH_CLIENT_SECRET)

const AUTH_BASE = "https://accounts.google.com/o/oauth2/v2/auth"
const SCOPE = "https://www.googleapis.com/auth/calendar.events"

/** OAuth consent URL, or null when the feature is disabled. */
export function getGoogleAuthUrl(state: string): string | null {
  if (!GOOGLE_CALENDAR_ENABLED) return null
  const params = new URLSearchParams({
    client_id: process.env.GOOGLE_OAUTH_CLIENT_ID!,
    redirect_uri: process.env.GOOGLE_OAUTH_REDIRECT_URI ?? "",
    response_type: "code",
    access_type: "offline",
    prompt: "consent",
    scope: SCOPE,
    state,
  })
  return `${AUTH_BASE}?${params.toString()}`
}

export interface GooglePushInput {
  accessToken: string
  calendarId?: string
  summary: string
  description?: string
  location?: string
  start: string
  end: string
}

/** Push a confirmed booking to the connected Google Calendar (no-op if disabled). */
export async function pushBookingToGoogle(
  input: GooglePushInput
): Promise<{ skipped: true } | { skipped: false; ok: boolean }> {
  if (!GOOGLE_CALENDAR_ENABLED) return { skipped: true }
  const calId = input.calendarId ?? "primary"
  const res = await fetch(
    `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(calId)}/events`,
    {
      method: "POST",
      headers: { Authorization: `Bearer ${input.accessToken}`, "Content-Type": "application/json" },
      body: JSON.stringify({
        summary: input.summary,
        description: input.description,
        location: input.location,
        start: { dateTime: input.start },
        end: { dateTime: input.end },
      }),
    }
  )
  return { skipped: false, ok: res.ok }
}
