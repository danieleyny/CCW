import "server-only"

import { readFileSync } from "node:fs"
import { join } from "node:path"
import { createHash } from "node:crypto"
import { PDFDocument } from "pdf-lib"
import { formTemplate, type FormTemplate } from "./templates"

/**
 * Fill the REAL official PDF. Reads the bundled template (assets/form-templates/,
 * the same readFileSync mechanism the fonts use), applies our values onto its
 * actual AcroForm fields, and returns the bytes + the template's sha256 for
 * traceability. We NEVER regenerate a look-alike — this is the official artifact
 * with our values in it.
 *
 * Signing is a SEPARATE step (signTemplate): the filled draft is left editable so
 * the applicant can review it, then their adopted signature is drawn onto the
 * form's real signature field and the whole thing is flattened. Only the applicant
 * ever signs.
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

export interface FilledDocument {
  bytes: Uint8Array
  sha256: string
  template: FormTemplate
}

/** Fill a template with values. Signable forms are left UNFLATTENED (the draft),
 *  so signTemplate can find the signature field afterwards. */
export async function fillTemplate(key: string, values: Record<string, unknown>): Promise<FilledDocument> {
  const t = formTemplate(key)
  if (!t) throw new Error(`Unknown form template: ${key}`)
  const { bytes, sha256 } = templateBytes(t)
  const pdf = await PDFDocument.load(bytes)
  const form = pdf.getForm()
  const filled = t.build ? t.build(values) : {}

  for (const [name, val] of Object.entries(filled.text ?? {})) {
    if (val == null || val === "") continue
    try {
      form.getTextField(name).setText(String(val))
    } catch {
      /* field absent / not a text field — skip rather than fail the whole fill */
    }
  }
  for (const [name, on] of Object.entries(filled.checks ?? {})) {
    if (!on) continue
    try {
      form.getCheckBox(name).check()
    } catch {
      /* skip */
    }
  }

  // Deliberately NOT flattened: signable forms wait for the applicant's signature
  // (signTemplate flattens then), and the company/investigation forms are pre-fills
  // the recipient COMPLETES on the real form — flattening would remove the fields
  // they still need to fill. The set values render via pdf-lib's appearances.
  const out = await pdf.save()
  return { bytes: out, sha256, template: t }
}

/**
 * The ADOPT step — draw the applicant's signature onto the form's REAL signature
 * field, stamp the date, and flatten. Operates on the already-filled draft bytes
 * so nothing (e.g. a transient SSN already rendered into the draft) is recollected.
 */
export async function signTemplate(
  draftBytes: Uint8Array,
  key: string,
  signaturePng: Uint8Array,
  signedAt: Date
): Promise<FilledDocument> {
  const t = formTemplate(key)
  if (!t) throw new Error(`Unknown form template: ${key}`)
  const filled = t.build ? t.build({}) : {}
  const pdf = await PDFDocument.load(draftBytes)
  const form = pdf.getForm()

  // Date fields — a single "Date" and/or a MM/DD/YYYY split, whichever the form has.
  const mm = String(signedAt.getMonth() + 1).padStart(2, "0")
  const dd = String(signedAt.getDate()).padStart(2, "0")
  const yyyy = String(signedAt.getFullYear())
  const dateStr = `${mm}/${dd}/${yyyy}`
  if (filled.dateField) {
    try {
      form.getTextField(filled.dateField).setText(dateStr)
    } catch {
      /* skip */
    }
  }
  for (const [n, val] of [["MM", mm], ["DD", dd], ["YYYY", yyyy]] as const) {
    try {
      form.getTextField(n).setText(val)
    } catch {
      /* not all forms split the date */
    }
  }

  // Draw the adopted signature onto the real signature field's rectangle.
  if (filled.signatureField) {
    try {
      const field = form.getFields().find((f) => f.getName() === filled.signatureField)
      if (field) {
        const widget = field.acroField.getWidgets()[0]
        const rect = widget.getRectangle()
        const ref = widget.P()
        const page = pdf.getPages().find((p) => p.ref === ref) ?? pdf.getPages()[0]
        const png = await pdf.embedPng(signaturePng)
        // Fit the signature within the field box, keeping aspect.
        const scale = Math.min(rect.width / png.width, rect.height / png.height, 1)
        const w = png.width * scale
        const h = png.height * scale
        page.drawImage(png, { x: rect.x + 2, y: rect.y + 2, width: w, height: h })
        try {
          form.removeField(field)
        } catch {
          /* older pdf-lib — leave the (now covered) field */
        }
      }
    } catch {
      /* signature overlay is best-effort; the filled+dated form still stands */
    }
  }

  try {
    form.flatten()
  } catch {
    /* skip */
  }
  const { sha256 } = templateBytes(t)
  const out = await pdf.save()
  return { bytes: out, sha256, template: t }
}
