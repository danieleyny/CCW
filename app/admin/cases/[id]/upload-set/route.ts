import { type NextRequest } from "next/server"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { assembleUploadSet } from "@/lib/packet/upload-set"

/** Staff/admin: a ZIP of the applicant's portal uploads, renamed per slot, + a README. */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ id: string }> }) {
  await requireStaff()
  const { id } = await params

  // RLS visibility with the user JWT before the service-role assembly.
  const supabase = await createClient()
  const { data: visible } = await supabase.from("cases").select("id").eq("id", id).maybeSingle()
  if (!visible) return new Response("Not found", { status: 404 })

  const result = await assembleUploadSet(createAdminClient(), id)
  if (!result) return new Response("No application data yet", { status: 404 })
  return new Response(new Uint8Array(result.zip), {
    headers: {
      "Content-Type": "application/zip",
      "Content-Disposition": `attachment; filename="${result.fileName}"`,
      "Cache-Control": "no-store",
    },
  })
}
