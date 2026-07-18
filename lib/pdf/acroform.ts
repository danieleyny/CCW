/**
 * AcroForm filling — for the day we have a REAL official fillable PDF.
 *
 * HONEST STATUS: no NYPD or DMV fillable template is bundled in this repo, so
 * nothing calls this yet. It exists so that when an official AcroForm is added
 * to /public/forms, we fill the actual government form instead of producing a
 * look-alike. Until then every document we produce is a clearly-labeled
 * PREPARED document plus a worksheet — never passed off as the official form.
 *
 * Usage once a template exists:
 *   const bytes = await fillAcroForm(templateBytes, { "Applicant Name": "…" })
 */
import { PDFDocument } from "pdf-lib"

export interface AcroFillResult {
  bytes: Uint8Array
  /** Fields we were asked to set that the template doesn't have. */
  unknownFields: string[]
  /** Fields the template has that we left empty. */
  unfilledFields: string[]
}

/**
 * Fill a fillable PDF's text fields by name. Unknown field names are reported
 * rather than thrown, so a template revision degrades loudly but doesn't crash a
 * customer's download. Set `flatten` to bake the values in (no further editing).
 */
export async function fillAcroForm(
  templateBytes: Uint8Array | ArrayBuffer,
  values: Record<string, string>,
  opts: { flatten?: boolean } = {}
): Promise<AcroFillResult> {
  const pdf = await PDFDocument.load(templateBytes)
  const form = pdf.getForm()

  const available = new Set(form.getFields().map((f) => f.getName()))
  const unknownFields: string[] = []

  for (const [name, value] of Object.entries(values)) {
    if (!available.has(name)) {
      unknownFields.push(name)
      continue
    }
    try {
      form.getTextField(name).setText(value ?? "")
    } catch {
      // Field exists but isn't a text field (checkbox/radio/dropdown) — report it
      // rather than guessing at its type.
      unknownFields.push(name)
    }
  }

  const unfilledFields = [...available].filter((n) => !(n in values))
  if (opts.flatten) form.flatten()

  return { bytes: await pdf.save(), unknownFields, unfilledFields }
}

/** Inspect a template's field names — used when wiring a new official form. */
export async function listAcroFields(templateBytes: Uint8Array | ArrayBuffer): Promise<string[]> {
  const pdf = await PDFDocument.load(templateBytes)
  return pdf.getForm().getFields().map((f) => f.getName())
}
