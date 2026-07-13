"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { Pin, PinOff, StickyNote, Search } from "lucide-react"
import { addCaseNote, toggleNotePin } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Textarea } from "@/components/ui/textarea"
import { formatDateTime } from "@/lib/format"
import { cn } from "@/lib/utils"

export interface NoteRow {
  id: string
  body: string
  pinned: boolean
  createdAt: string
  authorName: string | null
}

/** V3-P2.2 — case notes: pinnable, searchable, internal-only (staff RLS). */
export function CaseNotes({ caseId, notes }: { caseId: string; notes: NoteRow[] }) {
  const [draft, setDraft] = useState("")
  const [query, setQuery] = useState("")
  const [pending, start] = useTransition()

  const visible = query.trim()
    ? notes.filter((n) => n.body.toLowerCase().includes(query.trim().toLowerCase()))
    : notes

  function save() {
    const body = draft.trim()
    if (!body) return
    start(async () => {
      const fd = new FormData()
      fd.set("caseId", caseId)
      fd.set("body", body)
      const res = await addCaseNote(fd)
      if (res.error) toast.error(res.error)
      else {
        setDraft("")
        toast.success("Note saved")
      }
    })
  }

  return (
    <div className="space-y-4">
      <div className="rounded-lg border bg-card p-4">
        <label className="flex items-center gap-1.5 text-sm font-medium">
          <StickyNote className="size-4 text-brass" /> New note
        </label>
        <Textarea
          rows={3}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="What happened on this case? Calls, context, decisions — notes are internal and never visible to the client or instructor."
          className="mt-2"
        />
        <Button size="sm" className="mt-2" disabled={pending || !draft.trim()} onClick={save}>
          Save note
        </Button>
      </div>

      {notes.length > 3 && (
        <div className="relative">
          <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-text-low" />
          <Input value={query} onChange={(e) => setQuery(e.target.value)} placeholder="Search notes…" className="pl-8" />
        </div>
      )}

      <ul className="space-y-2">
        {visible.map((n) => (
          <li key={n.id} className={cn("rounded-lg border bg-card p-3", n.pinned && "border-brass/40 bg-brass/5")}>
            <div className="flex items-start justify-between gap-2">
              <p className="min-w-0 flex-1 whitespace-pre-wrap text-sm">{n.body}</p>
              <Button
                size="icon"
                variant="ghost"
                className="shrink-0 text-text-low"
                disabled={pending}
                aria-label={n.pinned ? "Unpin note" : "Pin note"}
                onClick={() =>
                  start(async () => {
                    const fd = new FormData()
                    fd.set("noteId", n.id)
                    fd.set("caseId", caseId)
                    fd.set("pinned", String(!n.pinned))
                    await toggleNotePin(fd)
                  })
                }
              >
                {n.pinned ? <PinOff className="size-4" /> : <Pin className="size-4" />}
              </Button>
            </div>
            <p className="mt-1 text-xs text-text-low">
              {n.authorName ?? "—"} · {formatDateTime(n.createdAt)}
              {n.pinned && <span className="ml-2 text-brass">pinned</span>}
            </p>
          </li>
        ))}
        {visible.length === 0 && (
          <li className="rounded-lg border border-dashed p-6 text-center text-sm text-muted-foreground">
            {notes.length === 0 ? "No notes yet — write the first one." : "No notes match your search."}
          </li>
        )}
      </ul>
    </div>
  )
}
