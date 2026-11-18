"use server"

import { z } from "zod"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const querySchema = z.string().trim().min(2).max(80)

export interface AdminSearchResult {
  caseId: string
  name: string
  email: string | null
  phone: string | null
  track: string
  stage: string
}

/** Read-only staff search. RLS remains the final visibility boundary. */
export async function searchAdminCases(input: string): Promise<AdminSearchResult[]> {
  await requireStaff()
  const query = querySchema.safeParse(input)
  if (!query.success) return []
  const db = await createClient()
  const pattern = `%${query.data.replaceAll("%", "").replaceAll("_", "")}%`
  const select = "id, full_name, email, phone, track"
  const [names, emails, phones] = await Promise.all([
    db.from("clients").select(select).ilike("full_name", pattern).limit(8),
    db.from("clients").select(select).ilike("email", pattern).limit(8),
    db.from("clients").select(select).ilike("phone", pattern).limit(8),
  ])
  const clients = new Map<string, { id: string; full_name: string; email: string | null; phone: string | null; track: string }>()
  for (const row of [...(names.data ?? []), ...(emails.data ?? []), ...(phones.data ?? [])]) clients.set(row.id, row)
  const clientIds = [...clients.keys()].slice(0, 8)
  if (!clientIds.length) return []
  const { data: cases } = await db.from("cases").select("id, client_id, stage, license_track, status").in("client_id", clientIds).order("updated_at", { ascending: false })
  const firstCase = new Map<string, (typeof cases extends Array<infer T> | null ? T : never)>()
  for (const row of cases ?? []) if (!firstCase.has(row.client_id) || row.status === "active") firstCase.set(row.client_id, row)
  return clientIds.flatMap((id) => {
    const client = clients.get(id)
    const caseRow = firstCase.get(id)
    if (!client || !caseRow) return []
    return [{ caseId: caseRow.id, name: client.full_name, email: client.email, phone: client.phone, track: (caseRow.license_track ?? client.track).replaceAll("_", " "), stage: caseRow.stage.replaceAll("_", " ") }]
  }).slice(0, 8)
}

