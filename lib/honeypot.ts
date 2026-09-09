/**
 * Shared anti-bot honeypot for public forms.
 *
 * The field is named to AVOID browser autofill and password-manager collisions. The
 * old name "company" was a mistake: browser address-autofill (and password managers)
 * fill a hidden organization/company field from the visitor's saved profile the moment
 * they autofill their name/email/phone — which silently flagged REAL people as bots.
 * They saw a success screen and nothing was ever sent. This name matches no autofill
 * token, and `HoneypotField` adds the ignore attributes password managers honor.
 *
 * Keep the field name here as the single source of truth so the input and the server
 * check can never drift apart (drift is exactly what reintroduces the silent-drop bug).
 */
export const HONEYPOT_FIELD = "hp_field"

/** True when the honeypot was filled — treat the submission as a bot. */
export function honeypotTripped(formData: FormData): boolean {
  return String(formData.get(HONEYPOT_FIELD) ?? "").trim() !== ""
}
