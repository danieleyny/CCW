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
import type { DocumentType } from "@/lib/doc-types"
import { Button } from "@/components/ui/button"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { NotaryRoutes } from "@/components/shared/notary-options"
import { DocumentUploader } from "@/components/portal/document-uploader"
import { PrepareInvestigationForms } from "@/components/portal/concierge/prepare-investigation-forms"

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
  caseId,
  clientId,
  area = "",
}: {
  items: ReviewItem[]
  /** Packet assembled + QA-passed (stage ≥ application_assembled). */
  ready: boolean
  caseId: string
  clientId: string
  /** Applicant ZIP/neighborhood, to scope the in-person notary options. */
  area?: string
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
            The documents we prepared that need you. Some you sign here with one tap — no redrawing. The
            ones that must be signed on paper you download, complete in front of a notary or a witness, and
            upload back.
          </p>
          {items.map((item) => (
            <div
              key={item.reqCode}
              id={item.reqCode}
              className="scroll-mt-24 rounded-lg border border-hairline bg-card p-4"
            >
              <div className="flex flex-wrap items-center justify-between gap-3">
                <div className="min-w-0">
                  <div className="flex items-center gap-2">
                    {item.signed ? (
                      <Check className="size-4 shrink-0 text-ok" />
                    ) : item.wetInk ? (
                      <Stamp className="size-4 shrink-0 text-brass" />
                    ) : (
                      <PenLine className="size-4 shrink-0 text-brass" />
                    )}
                    <span className="text-sm font-medium">{item.title}</span>
                  </div>
                  {/* The instruction. NEVER "sign then notarise" — a jurat requires signing
                      in the notary's/witness's presence, and we reject a pre-signed document. */}
                  {item.signable ? (
                    item.signed && <p className="mt-0.5 pl-6 text-xs text-ok">Signed — nothing more to do here.</p>
                  ) : item.wetInk === "witness" ? (
                    <p className="mt-0.5 pl-6 text-xs text-text-mid">
                      Don&apos;t sign this yet — the person safeguarding your firearm signs it in front of a{" "}
                      <b>witness</b>, who signs and prints their name in the witness block. No notary is needed.
                      Then upload the completed copy.
                    </p>
                  ) : (
                    <p className="mt-0.5 pl-6 text-xs text-text-mid">
                      Don&apos;t sign this yet — you sign it <b>in front of the notary</b>, who then completes and
                      stamps the certificate. Then upload the notarised copy.
                    </p>
                  )}
                </div>
                <div className="flex items-center gap-2">
                  {item.url && (
                    <Button asChild size="sm" variant="ghost">
                      <a href={item.url} target="_blank" rel="noreferrer">
                        {item.signable ? <ExternalLink className="size-4" /> : <Download className="size-4" />}
                        {item.signable ? "View" : "Download the form"}
                      </a>
                    </Button>
                  )}
                  {item.signable && !item.signed && (
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

              {/* Wet-ink: upload the completed copy — that is what finishes it. Notary
                  routes only for notary documents; a witnessed form needs no notary. */}
              {!item.signable && item.documentType && (
                <div className="mt-3 space-y-3">
                  <DocumentUploader
                    caseId={caseId}
                    clientId={clientId}
                    type={item.documentType as DocumentType}
                    reqCode={item.reqCode}
                    label="Upload the completed copy"
                    current={item.current}
                  />
                  {item.wetInk === "notary" && <NotaryRoutes area={area} />}
                </div>
              )}
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
          <div className="mt-4 border-t border-brass/20 pt-3">
            <p className="text-xs text-text-low">
              After you file, the NYPD investigator may ask you to sign a medical release (HIPAA) or an
              employment authorization. That&apos;s a normal part of the review — we hold those official
              forms and can fill them with your details now so they&apos;re ready if you&apos;re asked.
            </p>
            <PrepareInvestigationForms />
          </div>
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
