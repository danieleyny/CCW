"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import {
  Check,
  Loader2,
  ExternalLink,
  PenLine,
  FileCheck2,
  Stamp,
  Download,
  ArrowUpRight,
} from "lucide-react"
import { signRequirementDocument } from "@/app/portal/requirements/actions"
import type { ReviewItem } from "@/lib/concierge/review"
import { Button } from "@/components/ui/button"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

// The applicant files on the NYPD portal — we never submit for them. Same URLs
// the fee sheet and worksheet already point to (lib/fees, document-engine).
const NYPD_PORTAL = "https://licensing.nypdonline.org"
const NYPD_INSTRUCTIONS = "https://licensing.nypdonline.org/new-app-instruction"

/**
 * CONCIERGE Phase 6 — review & file. The applicant adopts their already-captured
 * signature onto the documents we prepared (one tap, no redraw), then files their
 * OWN application. There is no "we file" control anywhere here, by design.
 */
export function ReviewAndFile({
  items,
  ready,
}: {
  items: ReviewItem[]
  /** Packet assembled + QA-passed (stage ≥ application_assembled). */
  ready: boolean
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [busyCode, setBusyCode] = useState<string | null>(null)

  const unsigned = items.filter((i) => !i.signed)
  const hasWork = unsigned.length > 0

  function sign(reqCode: string) {
    setBusyCode(reqCode)
    start(async () => {
      // No PNG argument → uses the signature adopted at the agreements gate.
      const r = await signRequirementDocument(reqCode)
      setBusyCode(null)
      if (r.error) toast.error(r.error)
      else {
        toast.success("Signed with your signature.")
        router.refresh()
      }
    })
  }

  // Nothing to review yet and not assembled — we're still preparing.
  if (!hasWork && !ready && items.length === 0) {
    return (
      <section className="space-y-3">
        <div>
          <SectionEyebrow>The finish line</SectionEyebrow>
          <h2 className="mt-2 text-lg font-semibold tracking-tight">Review &amp; file</h2>
        </div>
        <p className="rounded-lg border border-hairline bg-card p-4 text-sm text-text-mid">
          We&apos;re still preparing your documents. When something needs your signature or your packet is
          ready to file, it shows up right here.
        </p>
      </section>
    )
  }

  return (
    <section className="space-y-4">
      <div>
        <SectionEyebrow>The finish line</SectionEyebrow>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">Review &amp; file</h2>
      </div>

      {items.length > 0 && (
        <div className="space-y-3">
          <p className="text-sm text-text-mid">
            These are the documents we prepared that are yours to sign. One tap applies the signature you
            already gave us — no redrawing.
          </p>
          {items.map((item) => (
            <div
              key={item.reqCode}
              className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-hairline bg-card p-4"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2">
                  {item.signed ? (
                    <Check className="size-4 shrink-0 text-ok" />
                  ) : (
                    <PenLine className="size-4 shrink-0 text-brass" />
                  )}
                  <span className="text-sm font-medium">{item.title}</span>
                </div>
                {item.signed ? (
                  <p className="mt-0.5 flex items-center gap-1 pl-6 text-xs text-ok">
                    Signed{item.notarize && (
                      <span className="text-warn">
                        {" "}
                        · <Stamp className="inline size-3" /> take it to a notary next
                      </span>
                    )}
                  </p>
                ) : (
                  item.notarize && (
                    <p className="mt-0.5 pl-6 text-xs text-text-low">You&apos;ll sign, then have it notarized.</p>
                  )
                )}
              </div>
              <div className="flex items-center gap-2">
                {item.url && (
                  <Button asChild size="sm" variant="ghost">
                    <a href={item.url} target="_blank" rel="noreferrer">
                      <ExternalLink className="size-4" /> View
                    </a>
                  </Button>
                )}
                {!item.signed && (
                  <Button
                    size="sm"
                    disabled={pending && busyCode === item.reqCode}
                    onClick={() => sign(item.reqCode)}
                  >
                    {pending && busyCode === item.reqCode ? (
                      <Loader2 className="size-4 animate-spin" />
                    ) : (
                      <PenLine className="size-4" />
                    )}
                    Sign
                  </Button>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* The file-it-yourself guide — only once the packet is assembled + QA-passed */}
      {ready ? (
        <div className="brass-edge rounded-lg border border-brass/40 bg-brass/8 p-5">
          <div className="flex items-center gap-2">
            <FileCheck2 className="size-5 text-brass" />
            <h3 className="text-lg font-semibold tracking-tight">Your packet is ready — file it yourself</h3>
          </div>
          <p className="mt-1 text-sm text-text-mid">
            Everything&apos;s prepared and checked. The last step is yours: you submit your own application on
            the NYPD portal. By law we can&apos;t and don&apos;t file for you — but here&apos;s exactly how.
          </p>

          <ol className="mt-4 space-y-2 text-sm text-text-mid">
            <li className="flex gap-2">
              <span className="font-mono text-xs text-brass">1</span> Download your packet and worksheet
              below — every answer is laid out in the NYPD form&apos;s own order.
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-xs text-brass">2</span> Open the NYPD licensing portal, create
              your login, and enter your answers from the worksheet.
            </li>
            <li className="flex gap-2">
              <span className="font-mono text-xs text-brass">3</span> Upload your prepared documents, pay the
              NYPD&apos;s fees, and submit. The NYPD schedules your fingerprinting from there.
            </li>
          </ol>

          <div className="mt-4 flex flex-wrap gap-2">
            <Button asChild variant="outline">
              <a href="/portal/packet" target="_blank" rel="noreferrer">
                <Download className="size-4" /> Download packet
              </a>
            </Button>
            <Button asChild>
              <a href={NYPD_PORTAL} target="_blank" rel="noreferrer">
                Open the NYPD portal <ArrowUpRight className="size-4" />
              </a>
            </Button>
            <Button asChild variant="ghost" size="sm">
              <a href={NYPD_INSTRUCTIONS} target="_blank" rel="noreferrer">
                NYPD filing instructions <ExternalLink className="size-3.5" />
              </a>
            </Button>
          </div>

          {/* Phase 4 — set expectations for the investigation phase so a later
              request isn't a surprise. These forms aren't part of the packet. */}
          <p className="mt-4 border-t border-brass/20 pt-3 text-xs text-text-low">
            After you file, the NYPD investigator may ask you to sign a medical release (HIPAA) or an
            employment authorization. That&apos;s a normal part of the review — we hold those official
            forms and can prepare them for you if you&apos;re asked.
          </p>
        </div>
      ) : (
        items.length > 0 && (
          <p className="rounded-lg border border-hairline bg-surface-2/40 p-4 text-sm text-text-mid">
            Once everything&apos;s signed and we&apos;ve assembled and checked your full packet, your
            file-it-yourself steps appear right here.
          </p>
        )
      )}
    </section>
  )
}
