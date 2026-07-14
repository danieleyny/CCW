/**
 * Formspree notifications — emails a submission to the business inbox with a
 * clear, source-labeled subject so you always know WHERE a submission came from.
 * Needs no API key (unlike Resend), so lead/contact notifications work the
 * moment this ships. Fire-and-forget: it never throws and never blocks or fails
 * the user's submission.
 *
 * Endpoint is env-driven (FORMSPREE_ENDPOINT) with the current form as the
 * fallback — a Formspree form id isn't a secret (it lives in public form
 * actions), so committing it is fine; the env var lets you swap it per env.
 */
const ENDPOINT = process.env.FORMSPREE_ENDPOINT || "https://formspree.io/f/xwvgpwky"

// Human labels for known sources so the email subject reads clearly. Any source
// not listed falls back to a title-cased version, so new call sites still get a
// sensible "where it came from" label with no extra wiring.
const SOURCE_LABELS: Record<string, string> = {
  contact: "Contact form",
  eligibility_quiz: "Eligibility quiz",
  book: "Book a consult",
  checklist: "Free checklist — run it for me",
  "subscribe:checklist": "Free checklist — email capture",
  "subscribe:law-watch": "Law Watch signup",
  "subscribe:fit-report": "CK fit report",
  "subscribe:reciprocity-card": "CK reciprocity card",
}

export function submissionLabel(source: string): string {
  return (
    SOURCE_LABELS[source] ??
    source
      .replace(/^subscribe:/, "subscriber — ")
      .replace(/[_-]/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase())
  )
}

/** POST a submission to Formspree with a source-labeled subject. Never throws. */
export async function notifyFormspree(
  source: string,
  fields: Record<string, unknown>
): Promise<void> {
  const label = submissionLabel(source)
  try {
    const ctrl = new AbortController()
    const timer = setTimeout(() => ctrl.abort(), 6000)
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      // Strip null/empty so the email stays clean. `_subject` sets the subject;
      // Formspree uses an `email` field as the reply-to automatically.
      body: JSON.stringify({
        _subject: `CARRY — new ${label}`,
        source,
        ...Object.fromEntries(
          Object.entries(fields).filter(([, val]) => val !== null && val !== undefined && val !== "")
        ),
      }),
      signal: ctrl.signal,
    })
    clearTimeout(timer)
    if (!res.ok) console.error(`[formspree] non-OK (${res.status}) for source=${source}`)
  } catch (e) {
    console.error(`[formspree] notify failed for source=${source}:`, e)
  }
}
