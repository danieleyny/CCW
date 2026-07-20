# Gun License NYC — branded email redesign
### Claude Code prompt

Every transactional email is currently an unstyled `<div style="font-family:sans-serif"><p>…</p></div>` composed ad-hoc at each send site (lib/notify.ts, lib/outreach.ts, lib/email/index.ts `notifyClient`, plus instructor/reference/cohabitant flows). Replace them with ONE branded, email-client-safe template that every send site uses.

**Guardrails:** keep `brand.disclaimer` in every email footer; no guarantee/expedite/approval-rate language; the applicant files their own application. Don't change WHEN emails are sent — only how they look. Keep the plain-text fallback on every email. `pnpm build` + `pnpm test` pass.

---

## Phase 1 — The shared email template
```
Create lib/email/template.ts exporting renderEmail(opts) → { html, text }:
  opts: {
    preheader?: string          // hidden inbox-preview line
    eyebrow?: string            // small mono label, e.g. "Action needed"
    heading: string
    paragraphs: string[]        // body copy (already-safe strings)
    cta?: { label: string; url: string }
    footnote?: string           // e.g. "This secure link expires in 30 days."
    recipientReason?: string    // e.g. "You received this because…"
  }

DESIGN (match the approved mock — premium, brand-consistent, robust):
- EMAIL-SAFE HTML ONLY: table-based layout, ALL styles INLINE, max-width 600px centered, web-safe font stack
  (-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif). NO external CSS, NO flexbox/grid, NO <style> reliance,
  NO web fonts. Must render in Gmail, Apple Mail, Outlook.
- STRUCTURE: obsidian header band (#0B0C0F) with the brass ◎ mark + "Gun License NYC" wordmark; a thin brass gradient
  rule; a WHITE body (light body renders reliably in both light and dark clients — do not ship an all-dark email);
  optional mono eyebrow (brass #8E6F2E), heading (#14120E, ~22px, 600), paragraphs (#44413B, 15px, 1.65 line-height);
  a BULLETPROOF CTA button (brass #C9A24B bg, #0B0A07 text, padding 14x26, radius 9 — table/anchor based, no VML needed
  but Outlook-safe); the raw URL shown as a fallback under the button (color #0E7490, word-break); an optional footnote;
  then a footer (#F4F2EE) with the small wordmark, brand.disclaimer, and the recipientReason line.
- Colors pulled from config/brand (brass etc.) where practical, but inlined as hex in the final HTML (email clients need
  literal values). Add a hidden preheader span at the top.
- TEXT VERSION: renderEmail also returns a clean plain-text rendering (heading, paragraphs, "Open: <url>", footnote,
  disclaimer) for the `text` field — never ship HTML-only.
- Accessibility: real <a> for the CTA, meaningful alt where images are used (prefer no images — the ◎ is a text glyph).
```

## Phase 2 — Refactor every send site to use it
```
Route all outgoing mail through renderEmail. Update at minimum:
- lib/email/index.ts notifyClient() → renderEmail({ heading: subject, paragraphs:[body] }).
- lib/notify.ts notifyCaseParties() → branded template (client + instructor variants).
- lib/outreach.ts → the reference request and cohabitant affidavit emails become renderEmail calls with a proper CTA
  button ("Complete your affidavit →" / "Confirm your reference →"), the expiry footnote, and the recipientReason.
- Any other sendEmail html callers (instructor offer-accepted notice, intake/process, instructors/profile, calendar
  invite covering note). Grep for `html:` across lib/app and convert each; keep .ics attachments as-is, just wrap the
  covering message.
Each converted email keeps its existing subject + intent; only the presentation changes. Preserve the text fallback.
```

## Phase 3 — Deliverability & from-address
```
- FROM: today EMAIL_FROM falls back to onboarding@resend.dev. Recommend (and wire, if the env is set) a verified-domain
  sender like "Gun License NYC <noreply@gunlicensenyc.com>" once the domain is verified in Resend. Read EMAIL_FROM from
  env; document that the domain must be verified (SPF/DKIM) in Resend for inbox placement. Don't hardcode a domain that
  isn't verified — keep the env fallback.
- Add a reply-to (e.g. the brand contact email) so replies reach a human.
- Keep EMAIL_ENABLED gating (no key → log-only) intact.
```

## Phase 4 — Verify
```
- Render each email type to static HTML and open it: header/wordmark, brass CTA button, fallback link, footer disclaimer
  all present and correct; renders acceptably in a light AND a dark mail client (test both).
- Every email still has a plain-text version; disclaimer present in all; no guarantee/expedite language.
- Send-site behavior unchanged (same triggers, same recipients, same subjects); EMAIL_ENABLED log-only path still works
  with no key.
- pnpm build && pnpm test pass.
Deliver: rendered previews of the cohabitant-affidavit email, the reference-request email, and a case-notification email.
```

---

### Notes for you (not for Claude Code)
- **Why a light body, not a fully dark email:** dark emails render unpredictably — some clients invert them, brass-on-white becomes unreadable, and Outlook mangles dark backgrounds. The obsidian header + light body is the premium look that survives every client. It's a deliberate choice, not a compromise.
- **One deliverability upgrade worth doing:** move the FROM address to your own verified domain (noreply@gunlicensenyc.com) in Resend. `onboarding@resend.dev` works but hurts inbox placement and looks less trustworthy than your own domain. The prompt wires it to an env var so you flip it on once the domain's verified.
- This is presentation-only — no email gets sent at a different time or to a different person; they just look like your brand now.
