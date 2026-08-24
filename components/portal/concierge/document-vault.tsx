import Link from "next/link"
import { Lock, ArrowRight, Users, ShieldCheck } from "lucide-react"
import { DocumentUploader } from "@/components/portal/document-uploader"
import type { DocumentType } from "@/lib/doc-types"
import type { VaultItem } from "@/lib/concierge/vault"
import type { ReferenceProgress } from "@/components/portal/requirement-action"

/**
 * CONCIERGE Phase 3 — the secure vault. A short, guided set of drop zones, each
 * feeding the SAME documents/case_requirements the admin reads (via the reused
 * DocumentUploader). References and cohabitant affidavits aren't uploaded here —
 * the applicant just lists names, and we invite and chase them.
 */
export function DocumentVault({
  caseId,
  clientId,
  items,
  referenceProgress,
  cohabitantProgress,
}: {
  caseId: string
  clientId: string
  items: VaultItem[]
  referenceProgress: ReferenceProgress | null
  cohabitantProgress: ReferenceProgress | null
}) {
  // UX 2.4 — count RECEIVED (uploaded) and APPROVED (a human checked it) as two
  // numbers, so the header tells the same story the cards do.
  const received = items.filter((i) => i.current != null || i.status === "satisfied").length
  const approved = items.filter((i) => i.status === "satisfied").length
  const total = items.length

  return (
    <section className="space-y-4">
      <div>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-lg font-semibold tracking-tight">Your document vault</h2>
          {total > 0 && (
            <span className="font-mono text-[11px] tabular-nums text-text-low">
              {received !== approved ? `${received} received · ${approved} approved` : `${received} of ${total} in`}
            </span>
          )}
        </div>
        <p className="mt-1 flex items-start gap-1.5 text-sm text-text-mid">
          <Lock className="mt-0.5 size-3.5 shrink-0 text-text-low" />
          Everything you send is encrypted and seen only by your concierge team. Snap a photo or upload a
          file — we take it from there.
        </p>
      </div>

      {total > 0 ? (
        <div className="space-y-3">
          {items.map((item) => (
            // id = req code so a "Go" deep-link (e.g. #DMV-01) scrolls to and
            // highlights THIS card, not the whole vault. scroll-mt clears the
            // sticky header.
            <div key={item.reqCode} id={item.reqCode} className="scroll-mt-24">
              <DocumentUploader
                caseId={caseId}
                clientId={clientId}
                type={item.documentType as DocumentType}
                reqCode={item.reqCode}
                label={item.title}
                description={item.help}
                current={item.current}
                photoSpec={item.photoSpec}
                smartKinds={item.smartKinds.length > 0 ? item.smartKinds : undefined}
                conciergeVoice
                guide={item.guide}
              />
            </div>
          ))}
        </div>
      ) : (
        <p className="rounded-lg border border-ok/30 bg-ok/8 p-4 text-sm text-ok">
          <ShieldCheck className="mr-1.5 inline size-4" /> Every document we need is in. Nothing to upload
          right now.
        </p>
      )}

      {(referenceProgress || cohabitantProgress) && (
        <div className="rounded-lg border border-hairline bg-card p-4">
          <div className="flex items-center gap-2">
            <Users className="size-4 text-brass" />
            <h3 className="text-sm font-medium">The people we contact for you</h3>
          </div>
          <p className="mt-1 text-sm text-text-mid">
            You just give us their names and emails — we send each of them a private link and chase the
            notarized letters until they&apos;re back. You don&apos;t manage any of it.
          </p>
          <ul className="mt-3 space-y-1.5 text-sm">
            {referenceProgress && (
              <li className="flex items-center justify-between">
                <span className="text-text-mid">Character references</span>
                <span className="font-mono text-[11px] tabular-nums text-text-low">
                  {referenceProgress.notarizedCount} of {referenceProgress.required} back
                </span>
              </li>
            )}
            {cohabitantProgress && (
              <li className="flex items-center justify-between">
                <span className="text-text-mid">Household affidavits</span>
                <span className="font-mono text-[11px] tabular-nums text-text-low">
                  {cohabitantProgress.notarizedCount} of {cohabitantProgress.required} back
                </span>
              </li>
            )}
          </ul>
          <Link
            href="/portal/people"
            className="mt-3 inline-flex items-center gap-1.5 text-sm text-signal underline"
          >
            Add or update their details <ArrowRight className="size-3.5" />
          </Link>
        </div>
      )}
    </section>
  )
}
