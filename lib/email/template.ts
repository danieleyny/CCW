import { brand } from "@/config/brand"

/**
 * The ONE branded, email-client-safe template every transactional email uses.
 *
 * Hard constraints (do not "improve" away — email clients are not browsers):
 * - Table-based layout, ALL styles INLINE, 600px max centered.
 * - Web-safe font stack only; no web fonts, no <style> reliance, no flex/grid.
 * - Obsidian header + WHITE body: a light body renders reliably in every client
 *   (dark bodies get inverted / mangled by Outlook & some Gmail modes).
 * - Every email also returns a clean plain-text version (never ship HTML-only).
 * - brand.disclaimer sits in every footer.
 */

export interface RenderEmailOpts {
  /** Hidden inbox-preview line. */
  preheader?: string
  /** Small mono label above the heading, e.g. "Action needed". */
  eyebrow?: string
  heading: string
  /** Body copy — already-safe plain strings (escaped here regardless). */
  paragraphs: string[]
  cta?: { label: string; url: string }
  /** e.g. "This secure link expires in 30 days." */
  footnote?: string
  /** e.g. "You received this because an applicant listed you as a reference." */
  recipientReason?: string
  /** If set, renders a clickable "Unsubscribe" link in the footer (marketing mail). */
  unsubscribeUrl?: string
}

// Literal hex — email clients need real values, not CSS vars. Pulled from the
// brand palette where they match (brass family), plus a few email-tuned neutrals.
const C = {
  obsidian: "#0B0C0F", // header band
  brass: "#C9A24B", // paletteDark.brass
  brassBright: "#E7C77A",
  brassDeep: "#8E6F2E",
  ink: "#0B0A07", // text on brass
  page: "#ECEAE4", // outer page behind the card
  card: "#FFFFFF", // body
  heading: "#14120E",
  body: "#44413B",
  faint: "#8A8580",
  footerBg: "#F4F2EE",
  link: "#0E7490",
  hairline: "#E7E3DB",
  headerText: "#F2F3F5",
} as const

const FONT = "-apple-system, 'Segoe UI', Helvetica, Arial, sans-serif"

const esc = (s: string) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
const escAttr = (s: string) => esc(s).replace(/"/g, "&quot;")

/** Bulletproof, Outlook-safe CTA button (bgcolor on the <td>, real <a>). */
function button(label: string, url: string): string {
  return `<table role="presentation" cellpadding="0" cellspacing="0" border="0" style="margin:8px 0 4px;">
    <tr>
      <td align="center" bgcolor="${C.brass}" style="border-radius:9px;">
        <a href="${escAttr(url)}" target="_blank" rel="noopener" style="display:inline-block;padding:14px 26px;font-family:${FONT};font-size:15px;font-weight:600;line-height:1;color:${C.ink};text-decoration:none;border-radius:9px;">${esc(label)}</a>
      </td>
    </tr>
  </table>`
}

export function renderEmail(opts: RenderEmailOpts): { html: string; text: string } {
  const { preheader, eyebrow, heading, paragraphs, cta, footnote, recipientReason, unsubscribeUrl } = opts

  const eyebrowHtml = eyebrow
    ? `<tr><td style="padding:0 0 10px;"><span style="font-family:${FONT};font-size:11px;font-weight:600;letter-spacing:1.5px;text-transform:uppercase;color:${C.brassDeep};">${esc(eyebrow)}</span></td></tr>`
    : ""

  const paragraphsHtml = paragraphs
    .map(
      (p) =>
        `<tr><td style="font-family:${FONT};font-size:15px;line-height:1.65;color:${C.body};padding:0 0 16px;">${esc(p)}</td></tr>`
    )
    .join("")

  const ctaHtml = cta
    ? `<tr><td style="padding:6px 0 4px;">${button(cta.label, cta.url)}</td></tr>
       <tr><td style="font-family:${FONT};font-size:12px;line-height:1.5;color:${C.faint};padding:2px 0 8px;">
         Or paste this link into your browser:<br>
         <a href="${escAttr(cta.url)}" style="color:${C.link};word-break:break-all;text-decoration:underline;">${esc(cta.url)}</a>
       </td></tr>`
    : ""

  const footnoteHtml = footnote
    ? `<tr><td style="font-family:${FONT};font-size:13px;line-height:1.55;color:${C.faint};padding:10px 0 0;border-top:1px solid ${C.hairline};margin-top:8px;">${esc(footnote)}</td></tr>`
    : ""

  const unsubHtml = unsubscribeUrl
    ? ` <a href="${escAttr(unsubscribeUrl)}" style="color:${C.link};text-decoration:underline;">Unsubscribe</a>.`
    : ""
  const reasonHtml =
    recipientReason || unsubscribeUrl
      ? `<p style="font-family:${FONT};font-size:12px;line-height:1.5;color:${C.faint};margin:0 0 12px;">${esc(recipientReason ?? "")}${unsubHtml}</p>`
      : ""

  // Preheader: hidden, followed by whitespace so the client preview shows only it.
  const preheaderHtml = preheader
    ? `<div style="display:none;max-height:0;overflow:hidden;opacity:0;mso-hide:all;">${esc(preheader)}${"&nbsp;&zwnj;".repeat(30)}</div>`
    : ""

  const html = `<!DOCTYPE html><html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><meta name="color-scheme" content="light only"><meta name="supported-color-schemes" content="light"></head>
<body style="margin:0;padding:0;background-color:${C.page};">
${preheaderHtml}
<table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0" style="background-color:${C.page};">
  <tr><td align="center" style="padding:24px 12px;">
    <table role="presentation" width="600" cellpadding="0" cellspacing="0" border="0" style="width:600px;max-width:600px;background-color:${C.card};border-radius:14px;overflow:hidden;border:1px solid ${C.hairline};">

      <!-- Header -->
      <tr><td style="background-color:${C.obsidian};padding:22px 32px;">
        <span style="font-family:${FONT};font-size:20px;line-height:1;color:${C.brass};vertical-align:middle;">&#9678;</span>
        <span style="font-family:${FONT};font-size:17px;font-weight:600;letter-spacing:0.2px;color:${C.headerText};vertical-align:middle;padding-left:8px;">${esc(brand.name)}</span>
      </td></tr>
      <!-- Brass rule -->
      <tr><td style="height:3px;line-height:3px;font-size:0;background-color:${C.brass};background-image:linear-gradient(90deg,${C.brassDeep},${C.brassBright},${C.brassDeep});">&nbsp;</td></tr>

      <!-- Body -->
      <tr><td style="padding:32px 32px 28px;">
        <table role="presentation" width="100%" cellpadding="0" cellspacing="0" border="0">
          ${eyebrowHtml}
          <tr><td style="font-family:${FONT};font-size:22px;font-weight:600;line-height:1.3;color:${C.heading};padding:0 0 16px;">${esc(heading)}</td></tr>
          ${paragraphsHtml}
          ${ctaHtml}
          ${footnoteHtml}
        </table>
      </td></tr>

      <!-- Footer -->
      <tr><td style="background-color:${C.footerBg};padding:22px 32px;border-top:1px solid ${C.hairline};">
        <p style="font-family:${FONT};font-size:13px;font-weight:600;color:${C.heading};margin:0 0 8px;">
          <span style="color:${C.brassDeep};">&#9678;</span> ${esc(brand.name)}
        </p>
        ${reasonHtml}
        <p style="font-family:${FONT};font-size:11px;line-height:1.55;color:${C.faint};margin:0;">${esc(brand.disclaimer)}</p>
      </td></tr>

    </table>
  </td></tr>
</table>
</body></html>`

  // Plain-text rendering — heading, paragraphs, link, footnote, reason, disclaimer.
  const textParts: string[] = []
  if (eyebrow) textParts.push(eyebrow.toUpperCase())
  textParts.push(heading, "")
  for (const p of paragraphs) textParts.push(p, "")
  if (cta) textParts.push(`${cta.label}: ${cta.url}`, "")
  if (footnote) textParts.push(footnote, "")
  textParts.push("—", brand.name)
  if (recipientReason) textParts.push(recipientReason)
  if (unsubscribeUrl) textParts.push(`Unsubscribe: ${unsubscribeUrl}`)
  textParts.push("", brand.disclaimer)
  const text = textParts.join("\n")

  return { html, text }
}
