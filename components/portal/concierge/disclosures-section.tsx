import { ShieldCheck } from "lucide-react"
import { actionFor } from "@/lib/requirements/actions"
import { isDisclosureItem } from "@/lib/requirements/sections"
import { RequirementAction } from "@/components/portal/requirement-action"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import type { RequirementView } from "@/lib/portal/requirement-view"

/**
 * CONCIERGE UX Phase 4 — "Your disclosures". Disclosure requirements are
 * conciergeScope:'hidden' and filtered out of "the one thing we need from you",
 * so a concierge applicant was never walked to them. This closes that gap.
 *
 * LEGAL (NY Penal Law § 400.00(3)): "An application shall be signed and verified
 * by the applicant." A verification is a sworn statement of personal knowledge —
 * an agent cannot swear to another person's facts. So we PREPARE the addendum and
 * the applicant SIGNS it, always. The flow (questionnaire prefilled from intake →
 * generate → read the draft → one-tap adopt the signature) is entirely the
 * existing RequirementAction: per-document affirmation, draft viewable before the
 * sign control, and the document-fingerprint record all come for free. No
 * "sign everything" control exists.
 */
export function DisclosuresSection({
  view,
  caseId,
  clientId,
}: {
  view: RequirementView
  caseId: string
  clientId: string
}) {
  // Generate-mode history items only — the questionnaire-and-sign disclosures.
  // Obtain-mode history documents (e.g. a certificate of good conduct) live in
  // the vault; references/cohabitants sign + notarize themselves (excluded).
  const items = view.items.filter(
    (i) => i.status !== "na" && isDisclosureItem(i.reqCode) && actionFor(i.reqCode)?.mode === "generate"
  )
  if (items.length === 0) return null

  return (
    <section id="disclosures" className="scroll-mt-20 space-y-4">
      <div>
        <SectionEyebrow>Your disclosures</SectionEyebrow>
        <h2 className="mt-2 text-lg font-semibold tracking-tight">We prepare them — you sign</h2>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          The NYPD application asks about your history (questions 10–28), and every &ldquo;yes&rdquo;
          needs a written explanation. We draft each one with you from what you already told us. This
          part has to be{" "}
          <span className="text-foreground">your</span>
          {" "}signature — the law requires it — and we&apos;ve done everything up to it.
        </p>
      </div>

      <div className="space-y-3">
        {items.map((i) => (
          <div key={i.reqCode} className="rounded-lg border border-hairline bg-card p-4">
            <div className="flex items-start gap-2">
              <ShieldCheck className="mt-0.5 size-4 shrink-0 text-brass" />
              <div className="min-w-0">
                <div className="text-sm font-medium">{actionFor(i.reqCode)?.customerTitle ?? i.title}</div>
                {actionFor(i.reqCode)?.help && (
                  <p className="mt-0.5 text-xs text-text-mid">{actionFor(i.reqCode)!.help}</p>
                )}
              </div>
            </div>
            <RequirementAction
              reqCode={i.reqCode}
              status={i.status}
              caseId={caseId}
              clientId={clientId}
              prefill={view.prefills[i.reqCode] ?? {}}
              generated={view.generated[i.reqCode] ?? null}
              current={view.currentByReq[i.reqCode] ?? null}
              signatureOnFile={view.signatureOnFile}
            />
          </div>
        ))}
      </div>
    </section>
  )
}
