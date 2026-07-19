"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { useRouter } from "next/navigation"
import { Eye, Check, Ban, Trash2 } from "lucide-react"
import {
  acknowledgeDataRequest,
  resolveDataRequest,
  executeErasure,
} from "@/app/admin/privacy/actions"
import { Button } from "@/components/ui/button"

export interface DataRequest {
  id: string
  case_id: string | null
  kind: string
  status: string
  requester_email: string
  detail: string | null
  requested_at: string
  resolution_note: string | null
}

/**
 * One request in the staff queue. Erasure sits behind a typed confirmation —
 * it is irreversible and spans tables no interactive session can otherwise
 * delete from.
 */
export function DataRequestRow({ request: r }: { request: DataRequest }) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [confirming, setConfirming] = useState(false)

  return (
    <li className="rounded-lg border bg-card p-3 text-sm">
      <div className="flex flex-wrap items-start justify-between gap-2">
        <div className="min-w-0">
          <div className="flex flex-wrap items-center gap-2">
            <span className="rounded bg-surface-2 px-1.5 py-0.5 font-mono text-[11px] uppercase">
              {r.kind}
            </span>
            <span className="font-medium">{r.requester_email}</span>
            <span className="rounded bg-surface-2 px-1.5 py-0.5 text-[10px] uppercase text-text-low">
              {r.status}
            </span>
          </div>
          {r.detail && <p className="mt-1 text-xs text-text-mid">{r.detail}</p>}
          <p className="mt-1 text-xs text-text-low">
            Filed {new Date(r.requested_at).toLocaleDateString("en-US", { dateStyle: "medium" })}
            {r.case_id ? ` · case ${r.case_id.slice(0, 8)}` : " · no case attached"}
          </p>
        </div>

        <div className="flex shrink-0 flex-wrap items-center gap-1.5">
          {r.status === "open" && (
            <form action={acknowledgeDataRequest}>
              <input type="hidden" name="id" value={r.id} />
              <Button type="submit" size="sm" variant="outline">
                <Eye className="size-3.5" /> Acknowledge
              </Button>
            </form>
          )}
          <form action={resolveDataRequest}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="status" value="fulfilled" />
            <Button type="submit" size="sm" variant="ghost">
              <Check className="size-3.5" /> Mark done
            </Button>
          </form>
          <form action={resolveDataRequest}>
            <input type="hidden" name="id" value={r.id} />
            <input type="hidden" name="status" value="refused" />
            <Button type="submit" size="sm" variant="ghost" className="text-text-low">
              <Ban className="size-3.5" /> Refuse
            </Button>
          </form>
          {r.kind === "deletion" && r.case_id && (
            <Button size="sm" variant="outline" className="text-danger" onClick={() => setConfirming((v) => !v)}>
              <Trash2 className="size-3.5" /> Erase…
            </Button>
          )}
        </div>
      </div>

      {confirming && (
        <form
          action={(fd) =>
            start(async () => {
              const res = await executeErasure(fd)
              if (res.error) toast.error(res.error)
              else {
                toast.success("Erased and recorded.")
                setConfirming(false)
                router.refresh()
              }
            })
          }
          className="mt-3 space-y-2 rounded-md border border-danger/30 bg-danger/5 p-3"
        >
          <input type="hidden" name="id" value={r.id} />
          <p className="text-xs text-danger">
            This permanently removes this case&apos;s disclosures, intake and questionnaire answers,
            documents (including the stored files), household and reference records, notes and
            messages. Proof-of-signing records are retained and minimized, as disclosed to the
            applicant. It cannot be undone.
          </p>
          <input
            name="confirm"
            placeholder="Type ERASE to confirm"
            autoComplete="off"
            className="w-full rounded-md border bg-surface-1 px-2 py-1.5 text-sm"
          />
          <Button type="submit" size="sm" variant="outline" className="text-danger" disabled={pending}>
            {pending ? "Erasing…" : "Erase this case's data"}
          </Button>
        </form>
      )}
    </li>
  )
}
