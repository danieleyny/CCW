import { type NextRequest } from "next/server"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assembleApplicationRecord } from "@/lib/packet/application-record"

/** Staff/admin: the internal 17-step portal application record (PDF). No SSN in it. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireStaff()
  const { id } = await params

  // RLS visibility with the user JWT before the service-role assembly.
  const supabase = await createClient()
  const { data: visible } = await supabase.from("cases").select("id").eq("id", id).maybeSingle()
  if (!visible) return new Response("Not found", { status: 404 })

  const result = await assembleApplicationRecord(createAdminClient(), id)
  if (!result) return new Response("No application data yet", { status: 404 })
  return new Response(Buffer.from(result.pdf), {
    headers: {
      "Content-Type": "application/pdf",
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
      "Cache-Control": "no-store",
    },
  })
}
