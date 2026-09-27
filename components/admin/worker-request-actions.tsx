"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { approveWorkerRequest, declineWorkerRequest } from "@/app/admin/sponsors/actions"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"

/**
 * Staff approve/decline a sponsor's worker request. Approval runs addSponsoredWorker
 * (admin client) and returns the invite URL — UNLESS the new worker's legal name isn't
 * resolved yet, in which case the invite is held and the seeded legal-name task is next.
 */
export function WorkerRequestActions({ requestId, requestedScope }: { requestId: string; requestedScope: string }) {
  const [pending, start] = useTransition()
  const [result, setResult] = useState<{ inviteUrl?: string; held?: boolean } | null>(null)
  const [declining, setDeclining] = useState(false)
  const [reason, setReason] = useState("")

  function approve(scope: string) {
    start(async () => {
      const fd = new FormData()
      fd.set("requestId", requestId)
      fd.set("scope", scope)
      const r = await approveWorkerRequest(fd)
      if (r.error) return void toast.error(r.error)
      setResult({ inviteUrl: r.inviteUrl, held: !r.identityResolved })
      toast.success(r.identityResolved ? "Worker created — invite ready." : "Worker created — invite held pending legal name.")
    })
  }

  function decline() {
    start(async () => {
      const fd = new FormData()
      fd.set("requestId", requestId)
      fd.set("reason", reason)
      const r = await declineWorkerRequest(fd)
      if (r.error) return void toast.error(r.error)
      toast.success("Request declined.")
      setDeclining(false)
    })
  }

  if (result) {
    return (
      <div className="mt-2 rounded-md border border-ok/30 bg-ok/8 p-2.5 text-xs text-text-mid">
        {result.held ? (
          <p>Worker created. <span className="text-warn">Invite held</span> — resolve the applicant&apos;s exact legal name (see the seeded task), then send the invite.</p>
        ) : (
          <p className="break-all">
            Worker created. Invite link: <span className="font-mono text-text-hi">{result.inviteUrl}</span>
          </p>
        )}
      </div>
    )
  }

  return (
    <div className="mt-2 flex flex-wrap items-center gap-2">
      <span className="text-xs text-text-low">Grant scope:</span>
      {(["packet_only", "assist", "full"] as const).map((s) => (
        <Button key={s} size="sm" variant={s === requestedScope ? "default" : "outline"} disabled={pending} onClick={() => approve(s)}>
          {s === "packet_only" ? "Packet" : s === "assist" ? "Assist" : "Full"}
        </Button>
      ))}
      {declining ? (
        <span className="flex items-center gap-2">
          <Input value={reason} onChange={(e) => setReason(e.target.value)} placeholder="Reason" className="h-9 w-48" />
          <Button size="sm" variant="destructive" disabled={pending || reason.trim().length < 3} onClick={decline}>
            Confirm decline
          </Button>
        </span>
      ) : (
        <Button size="sm" variant="ghost" disabled={pending} onClick={() => setDeclining(true)}>
          Decline
        </Button>
      )}
    </div>
  )
}
