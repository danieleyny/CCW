import type { Database } from "@/lib/supabase/types"

/**
 * V3-P2.1 — the document-type vocabulary now comes straight from the DB enum
 * (config/checklist-templates.ts, its previous home, is deleted; the versioned
 * requirements registry is the single source of truth for what's required).
 */
export type DocumentType = Database["public"]["Enums"]["document_type"]
