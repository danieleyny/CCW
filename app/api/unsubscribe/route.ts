import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
import { verifyUnsub } from "@/lib/subscribe"

export const runtime = "nodejs"

/**
 * One-click unsubscribe — no login, no confirmation page beyond a plain "Done."
 * The token is an HMAC of the subscriber id, so the link can't be forged.
 */
export async function GET(req: NextRequest) {
  const token = req.nextUrl.searchParams.get("token") ?? ""
  const id = verifyUnsub(token)
  const page = (msg: string) =>
    new NextResponse(
      `<!doctype html><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Unsubscribe</title><body style="font-family:system-ui;background:#faf9f7;color:#14120e;display:grid;place-items:center;height:100vh;margin:0"><p style="font-size:18px">${msg}</p></body>`,
      { status: id ? 200 : 400, headers: { "Content-Type": "text/html; charset=utf-8" } }
    )

  if (!id) return page("This unsubscribe link isn't valid.")

  const admin = createAdminClient()
  await admin
    .from("subscribers")
    .update({ unsubscribed_at: new Date().toISOString() })
    .eq("id", id)
    .is("unsubscribed_at", null)

  return page("Done — you've been unsubscribed.")
}
