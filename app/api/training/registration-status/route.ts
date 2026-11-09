/* eslint-disable @typescript-eslint/no-explicit-any */
import { NextRequest, NextResponse } from "next/server"
import { createAdminClient } from "@/lib/supabase/admin"
export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("rid")
  if (!id) return NextResponse.json({ error: "Missing registration." }, { status: 400 })
  const db = createAdminClient() as any
  const { data } = await db.from("training_registrations").select("status").eq("id", id).maybeSingle()
  return NextResponse.json({ status: data?.status ?? "not_found" })
}
