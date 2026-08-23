/**
 * CLI form-template validator — the machinery that proves the fill maps are
 * correct. Prints a table and exits non-zero on any missing field / duplicate.
 *   tsx scripts/verify-form-templates.ts
 * The same check runs under `pnpm test` (tests/form-templates.test.ts).
 */
import { validateFormTemplates } from "../lib/forms/validate"

async function main() {
  const r = await validateFormTemplates()
  console.log("template".padEnd(40), "pdf".padStart(4), "map".padStart(4), " missing")
  console.log("-".repeat(70))
  for (const row of r.rows) {
    console.log(
      row.key.padEnd(40),
      String(row.pdfFields).padStart(4),
      String(row.mapped).padStart(4),
      " " + (row.missing.join(", ") || "-")
    )
  }
  if (r.errors.length) {
    console.error("\nERRORS:")
    r.errors.forEach((e) => console.error("  - " + e))
    process.exit(1)
  }
  console.log("\n✓ All templates valid.")
}

main().catch((e) => {
  console.error(e)
  process.exit(1)
})
