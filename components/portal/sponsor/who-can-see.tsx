"use client"

import { useTransition } from "react"
import { Eye, ShieldCheck, Loader2, History } from "lucide-react"
import { toast } from "sonner"
import { revokeSponsor } from "@/app/portal/sponsor/actions"
import { actionFor } from "@/lib/requirements/actions"
import { formatDate } from "@/lib/format"
import { Button } from "@/components/ui/button"

interface TrailEntry {
  id: string
  reqCode: string | null
  action: string
  at: string
}

const SCOPE_LABEL: Record<string, string> = {
  full: "Your full file, including sensitive records",
  assist: "Ordinary paperwork only — sensitive records stay private",
  packet_only: "Only their own company packet",
}

const ACTION_LABEL: Record<string, string> = {
  view_url_issued: "opened",
  download: "downloaded",
  upload: "uploaded",
}

/** Standing control: who has access, at what scope, and the read trail — plus a
 *  one-click revoke that cuts access immediately (no staff needed). */
export function WhoCanSee({
  sponsorshipId,
  company,
  rep,
  scope,
  consentedAt,
  trail,
}: {
  sponsorshipId: string
  company: string
  rep: string
  scope: string
  consentedAt: string
  trail: TrailEntry[]
}) {
  const [pending, start] = useTransition()

  function revoke() {
    if (!confirm(`Withdraw ${rep}'s access to your file? This takes effect immediately.`)) return
    start(async () => {
      const r = await revokeSponsor(sponsorshipId)
      if (r.error) {
        toast.error(r.error)
        return
      }
      toast.success(`${rep}'s access has been withdrawn.`)
    })
  }

  const reads = trail.filter((t) => t.action === "view_url_issued")

  return (
    <section className="space-y-4 rounded-lg border bg-card p-5">
      <div className="flex items-start justify-between gap-3">
        <div className="flex items-start gap-2">
          <ShieldCheck className="mt-0.5 size-5 shrink-0 text-ok" />
          <div>
            <h2 className="text-lg font-semibold tracking-tight">
              {rep} of {company} can see your file
            </h2>
            <p className="mt-1 text-sm text-text-mid">{SCOPE_LABEL[scope] ?? scope}</p>
            <p className="mt-0.5 text-xs text-text-low">You consented on {formatDate(consentedAt)}.</p>
          </div>
        </div>
        <Button variant="destructive" size="sm" onClick={revoke} disabled={pending} className="min-h-[40px] shrink-0">
          {pending ? <Loader2 className="size-4 animate-spin" /> : "Withdraw access"}
        </Button>
      </div>

      <div className="rounded-md border border-hairline bg-surface-2/40 p-4">
        <div className="flex items-center gap-2 text-text-low">
          <History className="size-4" />
          <span className="engraved">What they&apos;ve looked at</span>
        </div>
        {reads.length === 0 ? (
          <p className="mt-2 text-sm text-text-mid">They haven&apos;t opened any of your documents yet.</p>
        ) : (
          <ul className="mt-2 space-y-1.5 text-sm">
            {reads.slice(0, 20).map((t) => {
              const title = (t.reqCode && actionFor(t.reqCode)?.customerTitle) || t.reqCode || "a document"
              return (
                <li key={t.id} className="flex items-start gap-2 text-text-mid">
                  <Eye className="mt-0.5 size-3.5 shrink-0 text-text-low" />
                  <span>
                    {rep} {ACTION_LABEL[t.action] ?? t.action} <span className="text-foreground">{title}</span> ·{" "}
                    {formatDate(t.at)}
                  </span>
                </li>
              )
            })}
          </ul>
        )}
      </div>
    </section>
  )
}
