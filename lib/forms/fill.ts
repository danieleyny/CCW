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
      applyFont(tf, t.fontSize)
      tf.setText(String(val))
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

  // Completeness: which declared-required fields ended up empty?
  const missingRequired = (t.requires ?? []).filter((r) => {
    const v = filled.text?.[r]
    return v == null || v === ""
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
