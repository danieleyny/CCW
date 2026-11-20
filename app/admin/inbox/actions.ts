"use server"

import { z } from "zod"
import { requireStaff } from "@/lib/auth"
import { createClient } from "@/lib/supabase/server"

const conversationSchema = z.object({
  caseId: z.string().uuid(),
  before: z.string().datetime().nullable().optional(),
})

export interface InboxMessageRow {
  id: string
  body: string
  read: boolean
  createdAt: string
  senderName: string
  senderRole: string
}

export interface InboxUploadEvent {
  id: string
  createdAt: string
  fileName: string
  documentType: string
}

export interface InboxConversationPage {
  messages: InboxMessageRow[]
  uploads: InboxUploadEvent[]
  hasEarlier: boolean
  before: string | null
}

/** Read-only, staff-gated pagination for the staff↔client lane. */
export async function loadInboxConversationPage(input: {
  caseId: string
  before?: string | null
}): Promise<InboxConversationPage> {
  await requireStaff()
  const { caseId, before } = conversationSchema.parse(input)
  const supabase = await createClient()
  let query = supabase
    .from("messages")
    .select("id, body, read, created_at, profiles:sender_id(full_name, role)")
    .eq("case_id", caseId)
    .is("engagement_id", null)
    .order("created_at", { ascending: false })
    .limit(51)
  if (before) query = query.lt("created_at", before)
  const result = await query
  if (result.error) throw result.error

  const selected = (result.data ?? []).slice(0, 50)
  const messages: InboxMessageRow[] = selected.reverse().map((row) => {
    const profile = row.profiles as unknown as { full_name?: string | null; role?: string | null } | null
    return {
      id: row.id,
      body: row.body,
      read: row.read,
      createdAt: row.created_at,
      senderName: profile?.full_name || (profile?.role === "client" ? "Client" : "Staff"),
      senderRole: profile?.role || "staff",
    }
  })
  const oldest = messages[0]?.createdAt ?? null
  const newest = messages.at(-1)?.createdAt ?? null
  let uploads: InboxUploadEvent[] = []
  if (oldest && newest) {
    const uploadResult = await supabase
      .from("documents")
      .select("id, created_at, file_name, type")
      .eq("case_id", caseId)
      .gte("created_at", oldest)
      .lte("created_at", newest)
      .order("created_at")
    if (uploadResult.error) throw uploadResult.error
    uploads = (uploadResult.data ?? []).map((row) => ({
      id: row.id,
      createdAt: row.created_at,
      fileName: row.file_name || "Uploaded file",
      documentType: row.type.replaceAll("_", " "),
    }))
  }

  return {
    messages,
    uploads,
    hasEarlier: (result.data?.length ?? 0) > 50,
    before: oldest,
  }
}
