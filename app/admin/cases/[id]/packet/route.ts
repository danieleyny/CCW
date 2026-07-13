import { type NextRequest } from "next/server"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assemblePacket } from "@/lib/packet/assemble"

/** Staff/admin: download the assembled application packet for a case. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireStaff()
  const { id } = await params

  // RLS visibility check (staff/admin see all cases per 20260713000100) before
  // assembling. The service-role client below is justified: assembly must read
  // Storage objects + cross-case rows that the user JWT can't stream directly.
  const supabase = await createClient()
  const { data: visible } = await supabase.from("cases").select("id").eq("id", id).maybeSingle()
  if (!visible) return new Response("Not found", { status: 404 })

  const { pdf } = await assemblePacket(createAdminClient(), id)
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": 'attachment; filename="application-packet.pdf"',
      "Cache-Control": "no-store",
    },
  })
}
