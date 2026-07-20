/**
 * Dev-only: render each transactional email to static HTML for visual review.
 * Run: pnpm tsx scripts/preview-emails.ts <outDir>
 * Not part of the app — safe to delete.
 */
import { mkdirSync, writeFileSync } from "node:fs"
import { renderEmail } from "@/lib/email/template"

const outDir = process.argv[2] ?? "public/email-preview"
mkdirSync(outDir, { recursive: true })

const link = "https://gunlicensenyc.com/r/6bQ2eXAMPLEtoken8f3k9q2xw8pR"
const clink = "https://gunlicensenyc.com/c/7cR3fEXAMPLEtoken9g4l0r3yx9qS"

const emails: Record<string, ReturnType<typeof renderEmail>> = {
  reference: renderEmail({
    preheader: "Confirm your character reference for a NYC carry-license application — takes a minute.",
    eyebrow: "Action needed",
    heading: "Confirm your character reference",
    paragraphs: [
      "Hi Pat Rivera,",
      "An applicant listed you as a character reference for their NYC concealed-carry license. Please confirm and attest — it takes a minute, and no account is needed. We'll build a ready-to-notarize letter from your answers.",
    ],
    cta: { label: "Confirm your reference →", url: link },
    footnote: "This secure link expires in 30 days. If you weren't expecting this, you can ignore this email.",
    recipientReason: "You received this because an applicant listed you as a character reference.",
  }),
  cohabitant: renderEmail({
    preheader: "Confirm and complete your cohabitant affidavit — no account needed.",
    eyebrow: "Action needed",
    heading: "Complete your cohabitant affidavit",
    paragraphs: [
      "Hi Sam Rivera,",
      "You were listed as a household member on a NYC concealed-carry license application. Please confirm and complete a short affidavit — no account needed, and we'll build a ready-to-notarize document for you.",
    ],
    cta: { label: "Complete your affidavit →", url: clink },
    footnote: "This secure link expires in 30 days. If you weren't expecting this, you can ignore this email.",
    recipientReason: "You received this because an applicant listed you as a member of their household.",
  }),
  notification: renderEmail({
    preheader: "A character reference completed their statement.",
    heading: "A character reference responded",
    paragraphs: [
      "A reference completed their statement and is getting it notarized. You'll be notified when the notarized copy is uploaded to your case.",
    ],
    cta: { label: "View your case →", url: "https://gunlicensenyc.com/portal" },
    recipientReason: "You're receiving this because it concerns your NYC carry-license application.",
  }),
}

for (const [name, { html, text }] of Object.entries(emails)) {
  writeFileSync(`${outDir}/${name}.html`, html)
  console.log(`\n===== ${name}.txt =====\n${text}`)
}

// Gallery: all three in iframes, with a light/dark toggle for the page chrome.
const gallery = `<!doctype html><html><head><meta charset="utf-8"><title>Email previews</title>
<style>body{margin:0;font-family:system-ui;background:#ccc}h2{padding:12px 16px;margin:0;font-size:13px;color:#333}
iframe{width:100%;max-width:640px;height:820px;border:0;display:block;margin:0 auto 24px;background:#fff;box-shadow:0 2px 12px rgba(0,0,0,.2)}
.dark{background:#111}.dark h2{color:#ccc}</style></head>
<body><label style="display:block;padding:12px 16px;font-family:system-ui;font-size:13px">
<input type="checkbox" onchange="document.body.classList.toggle('dark',this.checked)"> simulate dark mail client (page chrome)</label>
${Object.keys(emails).map((n) => `<h2>${n}</h2><iframe src="./${n}.html"></iframe>`).join("\n")}
</body></html>`
writeFileSync(`${outDir}/index.html`, gallery)
console.log(`\nWrote previews + index.html to ${outDir}`)
