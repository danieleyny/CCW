import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createAdminClient } from "@/lib/supabase/admin"
import { assembleFilingPack, filingPackFileName } from "@/lib/packet/filing-pack"

/**
 * PART B / Phase 4 — the applicant's one-click filing pack: worksheet + upload
 * guide + assembled documents, in one PDF. We prepare; the applicant files.
 */
export async function GET() {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return new Response("No case", { status: 404 })

  const name = (myCase.clients as unknown as { full_name: string } | null)?.full_name ?? null
  const { pdf } = await assembleFilingPack(createAdminClient(), myCase.id)
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filingPackFileName(name)}"`,
      "Cache-Control": "no-store",
    },
  })
}
