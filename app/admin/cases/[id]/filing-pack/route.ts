import { type NextRequest } from "next/server"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assembleFilingPack, filingPackFileName } from "@/lib/packet/filing-pack"

/** Staff/admin: download the guided filing pack for a case. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireStaff()
  const { id } = await params

  // RLS visibility check with the user JWT before the service-role assembly —
  // same guard the plain packet route uses.
  const supabase = await createClient()
  const { data: visible } = await supabase
    .from("cases")
    .select("id, clients(full_name)")
    .eq("id", id)
    .maybeSingle()
  if (!visible) return new Response("Not found", { status: 404 })

  const name = (visible.clients as unknown as { full_name: string } | null)?.full_name ?? null
  const { pdf } = await assembleFilingPack(createAdminClient(), id)
  return new Response(Buffer.from(pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${filingPackFileName(name)}"`,
      "Cache-Control": "no-store",
    },
  })
}
