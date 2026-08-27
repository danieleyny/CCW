/**
 * DEV HARNESS (not part of the normal suite). Fills every fillable template from its
 * FIXTURE and writes the PDF to $RENDER_FORMS_DIR so it can be rasterised (pdftoppm)
 * and LOOKED AT — the manifest's "verify by rendering, not by reading /V". Run:
 *   RENDER_FORMS_DIR=/abs/dir pnpm vitest run tests/form-render.manual.test.ts
 * Skipped entirely unless RENDER_FORMS_DIR is set.
 */
import { describe, it } from "vitest"
import { writeFileSync } from "node:fs"
import { join } from "node:path"
import { fillTemplate } from "@/lib/forms/fill"
import { FORM_TEMPLATES } from "@/lib/forms/templates"
import { FIXTURES } from "@/lib/forms/validate"

const DIR = process.env.RENDER_FORMS_DIR

describe.skipIf(!DIR)("render fillable templates for visual verification", () => {
  it("fills every template with a fixture and writes the PDF", async () => {
    for (const [key, t] of Object.entries(FORM_TEMPLATES)) {
      if (!t.build) continue
      const fx = FIXTURES[key]?.[0]
      if (!fx) {
        // eslint-disable-next-line no-console
        console.log(`SKIP ${key} — no fixture`)
        continue
      }
      const filled = await fillTemplate(key, fx)
      writeFileSync(join(DIR!, `${key}.pdf`), filled.bytes)
      // eslint-disable-next-line no-console
      console.log(`WROTE ${key}.pdf  missing=[${filled.missing.join(",")}]  missingRequired=[${filled.missingRequired.join(",")}]`)
    }
  })
})
