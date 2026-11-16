import type { NextRequest } from "next/server"
import { NextResponse } from "next/server"
import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createAdminClient } from "@/lib/supabase/admin"
import { createClient } from "@/lib/supabase/server"
import { assembleFilingPack, filingPackFileName } from "@/lib/packet/filing-pack"
import { getFilingPackOutstanding } from "@/lib/filing-pack/readiness-server"

/**
 * PART B / Phase 4 — the applicant's one-click filing pack: worksheet + upload
 * guide + assembled documents, in one PDF. We prepare; the applicant files.
 */
export async function GET(request: NextRequest) {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return new Response("No case", { status: 404 })

  const readiness = await getFilingPackOutstanding(await createClient(), myCase)
  if (!readiness.ready) {
    return NextResponse.redirect(new URL("/portal/forms?gate=1", request.url))
  }

  const name = myCase.client.full_name
  const { pdf } = await assembleFilingPack(createAdminClient(), myCase.id)
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filingPackFileName(name)}"`,
      "Cache-Control": "no-store",
    },
  })
}
