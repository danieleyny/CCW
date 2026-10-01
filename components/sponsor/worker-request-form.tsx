"use client"

import { useActionState } from "react"
import { CheckCircle2 } from "lucide-react"
import { requestWorker } from "@/app/sponsor/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

type State = { ok?: true; error?: string }

const SELECT_CLASS =
  "h-11 w-full rounded-md border border-hairline-strong bg-surface-3 px-3 text-base text-foreground outline-none focus-visible:border-signal/50 focus-visible:ring-2 focus-visible:ring-signal/40 md:text-sm"

/**
 * A rep requests a new worker. This does NOT provision anything — it records a request
 * for staff to approve. The rep is told plainly that staff review it (provisioning mints
 * accounts, which only staff can do), and that the worker sees nothing until they consent.
 */
export function WorkerRequestForm() {
  const [state, action, pending] = useActionState<State, FormData>(
    async (_prev, fd) => requestWorker(fd),
    {}
  )

  if (state.ok) {
    return (
      <div className="rounded-xl border border-ok/30 bg-ok/8 p-6 text-center">
        <CheckCircle2 className="mx-auto size-7 text-ok" />
        <h2 className="mt-2 font-display text-lg font-semibold text-text-hi">Request sent.</h2>
        <p className="mx-auto mt-1 max-w-md text-sm text-text-mid">
          Your Gun License NYC team will set the worker up and confirm the designated custodian and
          the worker&apos;s exact legal name before the invitation goes out. It&apos;ll appear in your
          list below once it&apos;s live and the worker has consented.
        </p>
      </div>
    )
  }

  return (
    <form action={action} noValidate className="space-y-4 rounded-xl border border-hairline bg-card p-5">
      <p className="text-sm text-text-mid">
        Tell us who to add. We provision the worker and send them a private invitation — you never
        handle their documents, and you see their file only after they consent.
      </p>
      <div className="grid gap-4 sm:grid-cols-2">
        <div className="space-y-1.5">
          <Label htmlFor="w-name">Worker&apos;s full name</Label>
          <Input id="w-name" name="applicantName" autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-email">Worker&apos;s email</Label>
          <Input id="w-email" name="applicantEmail" type="email" autoComplete="off" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-role">
            Assignment / role <span className="font-normal text-text-low">(optional)</span>
          </Label>
          <Input id="w-role" name="assignmentRole" placeholder="e.g. Armed guard, midtown post" />
        </div>
        <div className="space-y-1.5">
          <Label htmlFor="w-scope">Access you&apos;re requesting</Label>
          <select id="w-scope" name="requestedScope" defaultValue="packet_only" className={SELECT_CLASS}>
            <option value="packet_only">Company packet only (default)</option>
            <option value="assist">Assist with the worker&apos;s paperwork</option>
            <option value="full">Full file</option>
          </select>
          <p className="text-xs text-text-low">You request; our team grants the scope after review.</p>
        </div>
      </div>
      {state.error && (
        <p className="text-sm text-destructive" role="alert">
          {state.error}
        </p>
      )}
      <Button type="submit" disabled={pending}>
        {pending ? "Sending…" : "Send request"}
      </Button>
    </form>
  )
}
