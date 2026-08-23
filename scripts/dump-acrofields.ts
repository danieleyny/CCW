/**
 * Dump the AcroForm field names of a bundled form template — provenance for the
 * field mapping in lib/forms/templates.ts. Field names in the official PDFs are
 * often OCR-mangled ("Name oflnstructor"), so they must be used VERBATIM; this
 * prints them exactly as pdf-lib sees them.
 *
 *   pnpm tsx scripts/dump-acrofields.ts request-pre-exemption.pdf
 */
import { readFileSync } from "node:fs"
import { join } from "node:path"
import { PDFDocument } from "pdf-lib"

async function main() {
  const file = process.argv[2]
  if (!file) {
    console.error("usage: pnpm tsx scripts/dump-acrofields.ts <file.pdf>")
    process.exit(1)
  }
  const bytes = readFileSync(join(process.cwd(), "assets", "form-templates", file))
  const pdf = await PDFDocument.load(bytes, { ignoreEncryption: true })
  const fields = pdf.getForm().getFields()
  console.log(`${file} — ${fields.length} field(s):`)
  for (const f of fields) {
    console.log(`  ${JSON.stringify(f.getName())}  [${f.constructor.name}]`)
  }
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
