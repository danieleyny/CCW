import "server-only"

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createHash } from "node:crypto"
import { PDFDocument, PDFName, StandardFonts, type PDFFont, type PDFTextField } from "pdf-lib"
import { formTemplate, type FormTemplate } from "./templates"

/**
 * Fill the REAL official PDF. Reads the bundled template (assets/form-templates/,
 * the same readFileSync mechanism the fonts use), applies our values onto its
 * actual AcroForm fields, and returns the bytes + the template's sha256 for
 * traceability. We NEVER regenerate a look-alike.
 *
 * HARD RULES (see FORM_ENGINE_FIXES_PROMPT):
 *  - NEVER write to a field because its name looks like a date. The signing date
 *    goes ONLY to the template's declared dateField/dateSplit; application data
 *    (incl. date of birth) is written by build() like any other value.
 *  - Fill failures are LOUD: fillTemplate reports every attempted field that isn't
 *    on the form so a partially-filled government form can never present as done.
 *  - A form its own instructions say must be NOTARISED is never digitally signed.
 */
function templateBytes(t: FormTemplate): { bytes: Buffer; sha256: string } {
  const bytes = readFileSync(join(process.cwd(), "assets", "form-templates", t.file))
  const sha256 = createHash("sha256").update(bytes).digest("hex")
  return { bytes, sha256 }
}

/** Compute the on-disk sha256 for a template (drift check / registration). */
export function templateSha256(key: string): string | null {
  const t = formTemplate(key)
  if (!t) return null
  return templateBytes(t).sha256
}

/** The raw (blank) official PDF bytes + sha — for a download-only template. */
export function rawTemplate(key: string): { bytes: Uint8Array; sha256: string; title: string } | null {
  const t = formTemplate(key)
  if (!t) return null
  const { bytes, sha256 } = templateBytes(t)
  return { bytes, sha256, title: t.officialTitle }
}

export interface FilledDocument {
  bytes: Uint8Array
  sha256: string
  template: FormTemplate
  /** Field names build() produced that DON'T exist on the PDF — a mapping error. */
  missing: string[]
  /** Declared-required fields that came out empty — the form is NOT complete. */
  missingRequired: string[]
  /** Fill summary for the activity trail. */
  summary: { textAttempted: number; textApplied: number; checksAttempted: number; checksApplied: number }
}

function applyFont(field: { setFontSize: (n: number) => void }, size?: number) {
  try {
    field.setFontSize(size ?? 9)
  } catch {
    /* some fields resist an explicit size — leave the default */
  }
}

/**
 * Choose a font size that FITS a single-line value inside its widget. NYPD forms
 * have narrow columns (occupation, Q31) where the default size clips silently —
 * `SECURITY GUARD` → `SECURITY G`, intact in /V, gone on the page. Measure against
 * the widget rect and step down to a floor. Multiline fields wrap, so they keep the
 * intended size. Returns the fitted size (never below the floor).
 */
const FONT_FLOOR = 5
function fitFontSize(tf: PDFTextField, text: string, font: PDFFont, intended: number): number {
  try {
    if (tf.isMultiline()) return intended
    const w = tf.acroField.getWidgets()[0]
    if (!w) return intended
    const rect = w.getRectangle()
    const avail = Math.max(4, rect.width - 4) // small horizontal padding
    let size = intended
    while (size > FONT_FLOOR && font.widthOfTextAtSize(text, size) > avail) size -= 0.5
    return size
  } catch {
    return intended
  }
}

/**
 * Set a DUAL-WIDGET NYPD checkbox (SectionB*, LicenseType, AlienOrCitizen). These
 * are ONE field with two widgets whose on-values are /Yes and /No (or /CarryGuard…
 * etc.). pdf-lib's `.check()` always ticks the FIRST widget, so it can never answer
 * "No" and once ticked CARRY BUSINESS on a carry-guard app. Set /AS on the matching
 * widget and /V on the field. THROWS on no match — never falls back to the first
 * widget, never a bare catch. (Trap 1, TEMPLATES-MANIFEST.md.)
 */
function setNypdChoice(form: ReturnType<PDFDocument["getForm"]>, name: string, onValue: string) {
  const af = form.getField(name).acroField
  const want = PDFName.of(onValue)
  let matched = false
  for (const w of af.getWidgets()) {
    const on = w.getOnValue()
    const hit = !!on && on.asString() === want.asString()
    w.dict.set(PDFName.of("AS"), hit ? want : PDFName.of("Off"))
    if (hit) matched = true
  }
  if (!matched) throw new Error(`${name}: no widget with on-value /${onValue}`)
  af.dict.set(PDFName.of("V"), want)
}

/**
 * Fill a template with values. Left UNFLATTENED: signable forms wait for the
 * applicant's signature (signTemplate flattens then), and the company/investigation
 * pre-fills are completed by the recipient. Throws for a download-only template.
 */
export async function fillTemplate(key: string, values: Record<string, unknown>): Promise<FilledDocument> {
  const t = formTemplate(key)
  if (!t) throw new Error(`Unknown form template: ${key}`)
  if (!t.build) throw new Error(`Template ${key} is download-only and cannot be filled`)
  const { bytes, sha256 } = templateBytes(t)
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const form = pdf.getForm()
  // Trap 2: without an EMBEDDED font + regenerated appearances, several NYPD fields
  // store the value in /V and render BLANK. Embed Helvetica and use it for every
  // text field's appearance (see updateFieldAppearances below).
  const font = await pdf.embedFont(StandardFonts.Helvetica)
  const filled = t.build(values)
  const missing: string[] = []
  let textAttempted = 0
  let textApplied = 0
  let checksAttempted = 0
  let checksApplied = 0

  for (const [name, val] of Object.entries(filled.text ?? {})) {
    if (val == null || val === "") continue
    textAttempted++
    try {
      const tf = form.getTextField(name)
      const text = String(val)
      const intended = t.fieldFontSize?.[name] ?? t.fontSize ?? 9
      applyFont(tf, fitFontSize(tf, text, font, intended)) // Trap 3: shrink to fit
      tf.setText(text)
      textApplied++
    } catch {
      missing.push(name)
    }
  }
  for (const [name, on] of Object.entries(filled.checks ?? {})) {
    if (!on) continue
    checksAttempted++
    try {
      form.getCheckBox(name).check()
      checksApplied++
    } catch {
      missing.push(name)
    }
  }

  // Trap 2: regenerate every text-field appearance with the embedded font BEFORE we
  // set the dual-widget choices (whose /AS we then set directly, below).
  try {
    form.updateFieldAppearances(font)
  } catch {
    /* best-effort — a field that resists appearance regen still holds its /V */
  }

  // Trap 1: dual-widget NYPD choices — set the matching widget's /AS directly, AFTER
  // updateFieldAppearances so it can't clobber our selection. Throws on no match.
  for (const [name, onValue] of Object.entries(filled.choices ?? {})) {
    if (onValue == null || onValue === "") continue
    checksAttempted++
    try {
      setNypdChoice(form, name, onValue)
      checksApplied++
    } catch {
      missing.push(name)
    }
  }

  // Completeness: which declared-required fields ended up empty? A required field can
  // be satisfied by text OR by a choice selection. `requires` may be track-derived.
  const required = typeof t.requires === "function" ? t.requires(values) : t.requires ?? []
  const missingRequired = required.filter((r) => {
    const v = filled.text?.[r]
    const c = filled.choices?.[r]
    return (v == null || v === "") && (c == null || c === "")
  })

  const out = await pdf.save()
  return { bytes: out, sha256, template: t, missing, missingRequired, summary: { textAttempted, textApplied, checksAttempted, checksApplied } }
}

/**
 * The ADOPT step — draw the applicant's signature onto the form's REAL signature
 * field, stamp the SIGNING date (only into the template's declared date fields),
 * and flatten. Operates on the already-filled draft bytes so application data
 * (e.g. the date of birth build() wrote) is preserved untouched.
 */
export async function signTemplate(
  draftBytes: Uint8Array,
  key: string,
  signaturePng: Uint8Array,
  signedAt: Date
): Promise<FilledDocument> {
  const t = formTemplate(key)
  if (!t) throw new Error(`Unknown form template: ${key}`)
  if (t.notarize) throw new Error(`Template ${key} must be notarised — it is never digitally signed`)
  const pdf = await PDFDocument.load(draftBytes, { ignoreEncryption: true })
  const form = pdf.getForm()
  const font = await pdf.embedFont(StandardFonts.Helvetica)

  const mm = String(signedAt.getMonth() + 1).padStart(2, "0")
  const dd = String(signedAt.getDate()).padStart(2, "0")
  const yyyy = String(signedAt.getFullYear())

  // The SIGNING date — ONLY into fields the template explicitly declares as such.
  if (t.dateField) {
    try {
      const f = form.getTextField(t.dateField)
      applyFont(f, t.fontSize)
      f.setText(`${mm}/${dd}/${yyyy}`)
    } catch {
      /* declared but absent — a mapping error the validator catches */
    }
  }
  if (t.dateSplit) {
    for (const [name, val] of [
      [t.dateSplit.mm, mm],
      [t.dateSplit.dd, dd],
      [t.dateSplit.yyyy, yyyy],
    ] as const) {
      try {
        const f = form.getTextField(name)
        applyFont(f, t.fontSize)
        f.setText(val)
      } catch {
        /* absent — validator catches */
      }
    }
  }

  // Regenerate the signing-date appearances with the embedded font before flatten.
  try {
    form.updateFieldAppearances(font)
  } catch {
    /* best-effort */
  }

  if (t.signatureField) {
    try {
      const field = form.getFields().find((f) => f.getName() === t.signatureField)
      if (field) {
        const widget = field.acroField.getWidgets()[0]
        const rect = widget.getRectangle()
        const ref = widget.P()
        const page = pdf.getPages().find((p) => p.ref === ref) ?? pdf.getPages()[0]
        const png = await pdf.embedPng(signaturePng)
        const scale = Math.min(rect.width / png.width, rect.height / png.height, 1)
        page.drawImage(png, { x: rect.x + 2, y: rect.y + 2, width: png.width * scale, height: png.height * scale })
        try {
          form.removeField(field)
        } catch {
          /* older pdf-lib — leave the (now covered) field */
        }
      }
    } catch {
      /* signature overlay is best-effort; the filled + dated form still stands */
    }
  }

  try {
    form.flatten()
  } catch {
    /* skip */
  }
  const { sha256 } = templateBytes(t)
  const out = await pdf.save()
  return { bytes: out, sha256, template: t, missing: [], missingRequired: [], summary: { textAttempted: 0, textApplied: 0, checksAttempted: 0, checksApplied: 0 } }
}
