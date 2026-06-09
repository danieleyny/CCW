import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { DocumentUploader, type CurrentDoc } from "@/components/portal/document-uploader"
import type { DocumentType } from "@/config/checklist-templates"

export const metadata = { title: "Documents" }

// Curated list of uploadable documents shown in the portal (journey order).
const DOC_TYPES: { type: DocumentType; label: string; description: string }[] = [
  { type: "id", label: "Government photo ID", description: "Driver license, non-driver ID, or passport." },
  { type: "proof_residence", label: "Proof of residence / business", description: "A recent utility bill, lease, or similar." },
  { type: "training_cert", label: "Training completion certificate", description: "Your 16-hour + 2-hour course completion." },
  { type: "safe_photo_closed", label: "Safe photo — door closed", description: "Color photo of your gun safe, whole safe visible, door closed." },
  { type: "safe_photo_open", label: "Safe photo — door open", description: "Color photo of your gun safe, whole safe visible, door open." },
  { type: "social_media_list", label: "Social media list (3 years)", description: "All current & former accounts for the past 3 years." },
  { type: "reference_letter", label: "Notarized reference letters", description: "Upload your notarized character references." },
  { type: "cohabitant_affidavit", label: "Notarized cohabitant affidavits", description: "One notarized affidavit per adult in your home." },
]

export default async function DocumentsPage() {
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-muted-foreground">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const supabase = await createClient()
  const { data: docs } = await supabase
    .from("documents")
    .select("type, status, review_notes, version, file_path")
    .eq("case_id", myCase.id)
    .order("version", { ascending: false })

  // Latest version per type.
  type DocRow = NonNullable<typeof docs>[number]
  const latest = new Map<string, DocRow>()
  for (const d of docs ?? []) {
    if (!latest.has(d.type)) latest.set(d.type, d)
  }

  // Build current-doc views with signed URLs.
  const current = new Map<string, CurrentDoc>()
  await Promise.all(
    [...latest.entries()].map(async ([type, d]) => {
      let signedUrl: string | null = null
      if (d.file_path) {
        const { data } = await supabase.storage.from("documents").createSignedUrl(d.file_path, 3600)
        signedUrl = data?.signedUrl ?? null
      }
      current.set(type, {
        status: d.status,
        review_notes: d.review_notes,
        version: d.version,
        signedUrl,
      })
    })
  )

  return (
    <div>
      <div className="mb-5">
        <h1 className="text-2xl font-semibold tracking-tight">Documents</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Snap a photo or upload a file for each item. We&apos;ll review and let you know if anything
          needs a fix.
        </p>
      </div>

      <div className="space-y-3">
        {DOC_TYPES.map((d) => (
          <DocumentUploader
            key={d.type}
            caseId={myCase.id}
            clientId={myCase.client.id}
            type={d.type}
            label={d.label}
            description={d.description}
            current={current.get(d.type) ?? null}
          />
        ))}
      </div>
    </div>
  )
}
