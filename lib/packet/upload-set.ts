import "server-only"
import type { SupabaseClient } from "@supabase/supabase-js"
import type { Database } from "@/lib/supabase/types"
import { assembleApplicationTab } from "@/lib/portal/application-tab"
import { PORTAL_UPLOAD_SLOTS } from "@/config/portal-steps"
import { makeZip, type ZipEntry } from "@/lib/packet/zip"

type DB = SupabaseClient<Database>

function extOf(name: string | null): string {
  const m = (name ?? "").match(/\.([a-z0-9]{1,5})$/i)
  return m ? `.${m[1].toLowerCase()}` : ".bin"
}

/**
 * The per-slot upload SET — a ZIP where each portal upload slot's accepted/pending file
 * is renamed to that slot (01-photograph.jpg, 02-photo-id.pdf, …) so a staffer attaches
 * them into the portal without hunting through the vault. A README maps every slot to
 * its portal label and current state, including the ones still missing.
 */
export async function assembleUploadSet(admin: DB, caseId: string): Promise<{ zip: Buffer; fileName: string } | null> {
  const data = await assembleApplicationTab(admin, caseId)
  if (!data) return null

  const zipBaseByCode = new Map(PORTAL_UPLOAD_SLOTS.map((s) => [s.reqCode, s.zipBase]))
  const withDoc = data.slots.filter((s) => s.documentId)
  const { data: docRows } = withDoc.length
    ? await admin.from("documents").select("id, file_path, file_name").in("id", withDoc.map((s) => s.documentId!))
    : { data: [] as { id: string; file_path: string | null; file_name: string | null }[] }
  const docById = new Map((docRows ?? []).map((d) => [d.id, d]))

  const entries: ZipEntry[] = []
  const readmeLines: string[] = [
    `NYPD portal upload set — ${data.applicant}`,
    `Generated internal work product. Attach each file into the portal's matching slot.`,
    ``,
  ]

  for (const slot of data.slots) {
    const zipBase = zipBaseByCode.get(slot.reqCode) ?? slot.reqCode.toLowerCase()
    const star = slot.starred ? " (required)" : ""
    if (slot.documentId) {
      const doc = docById.get(slot.documentId)
      if (doc?.file_path) {
        const { data: file } = await admin.storage.from("documents").download(doc.file_path)
        if (file) {
          const bytes = new Uint8Array(await file.arrayBuffer())
          const name = `${zipBase}${extOf(doc.file_name ?? doc.file_path)}`
          entries.push({ name, data: bytes })
          readmeLines.push(`${slot.portalLabel}${star}: ${name} — ${slot.state}${slot.rejectionNote ? ` (sent back: ${slot.rejectionNote})` : ""}`)
          continue
        }
      }
      readmeLines.push(`${slot.portalLabel}${star}: file could not be read — ${slot.state}`)
    } else {
      readmeLines.push(`${slot.portalLabel}${star}: NOT UPLOADED`)
    }
  }

  if (data.heldForInterview.length > 0) {
    readmeLines.push(``, `Held for the interview — do NOT upload these to the portal:`)
    for (const h of data.heldForInterview) readmeLines.push(`  · ${h.title}`)
  }

  entries.push({ name: "README.txt", data: Buffer.from(readmeLines.join("\n"), "utf8") })

  const safe = data.applicant.replace(/[^a-z0-9]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "applicant"
  return { zip: makeZip(entries), fileName: `upload-set-${safe}.zip` }
}
