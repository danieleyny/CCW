import { requireRole } from "@/lib/auth"
import { getMyCase } from "@/lib/portal"
import { createAdminClient } from "@/lib/supabase/admin"
import { assemblePacket } from "@/lib/packet/assemble"

/** Applicant: download their own assembled application packet. */
export async function GET() {
  await requireRole(["client"])
  const myCase = await getMyCase()
  if (!myCase) return new Response("No case", { status: 404 })

  const { pdf } = await assemblePacket(createAdminClient(), myCase.id)
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="my-application-packet.pdf"',
      "Cache-Control": "no-store",
    },
  })
}
