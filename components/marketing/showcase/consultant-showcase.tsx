import { ShieldCheck, MessageSquare, StickyNote } from "lucide-react"

/**
 * B2 — the human on the other side. A calm consultant case-file view: a private
 * note and a message to the client, paired with the one claim the CP-5 gate
 * makes true — we are structurally unable to let an incomplete application file.
 */
export function ConsultantShowcase() {
  return (
    <div className="dark rounded-xl border border-hairline bg-surface-1 p-5 text-foreground shadow-[0_30px_80px_-40px_rgba(20,18,14,0.5)]">
      <div className="flex items-center justify-between border-b border-hairline pb-3">
        <span className="engraved text-text-mid">Consultant · case view</span>
        <span className="flex items-center gap-1.5 rounded bg-ok/15 px-2 py-0.5 text-[11px] font-medium text-ok">
          <ShieldCheck className="size-3.5" /> QA gate armed
        </span>
      </div>

      <div className="mt-4 space-y-3">
        <div className="rounded-lg border border-hairline bg-surface-2/60 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-text-low">
            <StickyNote className="size-3.5" /> Private note · staff only
          </div>
          <p className="text-sm text-text-mid">
            Reference #3 came back unnotarized. Sent the notary link; following up Thursday if it&apos;s
            still open.
          </p>
        </div>

        <div className="rounded-lg border border-hairline bg-surface-2/60 p-3">
          <div className="mb-1.5 flex items-center gap-1.5 text-[11px] text-text-low">
            <MessageSquare className="size-3.5" /> To the applicant
          </div>
          <p className="text-sm">
            Everything&apos;s in except one notarized reference — I sent your reference a link, it takes
            about ten minutes online. Once it&apos;s back we run final QA and assemble.
          </p>
        </div>
      </div>

      <div className="mt-4 rounded-lg border border-brass/25 bg-brass/5 p-3">
        <p className="text-sm leading-snug text-brass-bright">
          &ldquo;We are structurally unable to let you file an incomplete application.&rdquo;
        </p>
        <p className="mt-1 text-[11px] text-text-low">
          The pre-filing gate blocks assembly until every required item is satisfied, every disclosure
          is explained, and a named reviewer signs off.
        </p>
      </div>
    </div>
  )
}
