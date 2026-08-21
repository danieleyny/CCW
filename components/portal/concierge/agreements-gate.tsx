"use client"

import Link from "next/link"
import { useActionState, useState } from "react"
import { ChevronDown, Check, X, ShieldCheck, Loader2 } from "lucide-react"
import { signAgreements, type ConciergeResult } from "@/app/portal/concierge/actions"
import { AGREEMENTS } from "@/config/agreements"
import { SignaturePad } from "@/components/sign/signature-pad"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"

/**
 * CONCIERGE Phase 2 — the agreements gate. Nothing else on the concierge
 * dashboard unlocks until these are signed. The applicant reads all five
 * (honest, limited-scope, non-representation), types their legal name, and
 * adopts a signature once — the same signature Phase 6 later applies per
 * document, so they never redraw.
 */
export function AgreementsGate({ defaultName }: { defaultName: string }) {
  const [state, action, pending] = useActionState<ConciergeResult, FormData>(signAgreements, {})
  const [name, setName] = useState(defaultName)
  const [png, setPng] = useState("")
  // Each agreement gets an explicit "I agree" / "I do not agree" — a decision the
  // applicant makes INSIDE the expanded panel, so it can only be made after
  // reading it. Signing is unlocked only when every one is agreed; a single "do
  // not agree" hard-blocks (they can switch to self-guided instead).
  const [decisions, setDecisions] = useState<Record<string, "agree" | "disagree">>({})
  const decide = (kind: string, d: "agree" | "disagree") =>
    setDecisions((prev) => ({ ...prev, [kind]: d }))
  const agreedCount = AGREEMENTS.filter((a) => decisions[a.kind] === "agree").length
  const allAgreed = agreedCount === AGREEMENTS.length
  const anyDisagreed = AGREEMENTS.some((a) => decisions[a.kind] === "disagree")
  const canSubmit = name.trim().length >= 2 && png.length > 0 && allAgreed

  return (
    <div className="space-y-6">
      <div>
        <SectionEyebrow>Before we begin</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Your engagement, in plain English</h1>
        <p className="mt-1 max-w-prose text-sm text-text-mid">
          {AGREEMENTS.length} short agreements set out exactly what we do and the line we never cross.
          Open each one, choose <span className="text-foreground">I agree</span> or{" "}
          <span className="text-foreground">I do not agree</span>, then sign once to begin. We can only
          proceed if you agree to all of them.
        </p>
      </div>

      <ul className="space-y-2">
        {AGREEMENTS.map((a, i) => {
          const decision = decisions[a.kind]
          return (
            <li key={a.kind}>
              <details className="group rounded-lg border border-hairline bg-card" open={i === 0}>
                <summary className="flex cursor-pointer list-none items-start gap-3 p-4">
                  <span
                    className={`mt-0.5 flex size-6 shrink-0 items-center justify-center rounded-full border font-mono text-xs ${
                      decision === "agree"
                        ? "border-ok/50 bg-ok/10 text-ok"
                        : decision === "disagree"
                          ? "border-danger/50 bg-danger/10 text-danger"
                          : "border-brass/40 text-brass"
                    }`}
                  >
                    {decision === "agree" ? (
                      <Check className="size-3.5" />
                    ) : decision === "disagree" ? (
                      <X className="size-3.5" />
                    ) : (
                      i + 1
                    )}
                  </span>
                  <span className="flex-1">
                    <span className="block font-medium">{a.title}</span>
                    <span className="mt-0.5 block text-sm text-text-mid">{a.summary}</span>
                  </span>
                  <ChevronDown className="mt-1 size-4 shrink-0 text-text-low transition-transform group-open:rotate-180" />
                </summary>
                <p className="border-t border-hairline p-4 text-sm leading-relaxed text-text-mid">{a.body}</p>
                <div className="flex flex-wrap items-center gap-2 border-t border-hairline p-4">
                  <span className="mr-auto text-sm text-text-mid">Do you agree to this?</span>
                  <Button
                    type="button"
                    size="sm"
                    variant={decision === "agree" ? "default" : "outline"}
                    className="min-h-[44px]"
                    onClick={() => decide(a.kind, "agree")}
                  >
                    <Check className="mr-1 size-3.5" /> I agree
                  </Button>
                  <Button
                    type="button"
                    size="sm"
                    variant={decision === "disagree" ? "destructive" : "outline"}
                    className="min-h-[44px]"
                    onClick={() => decide(a.kind, "disagree")}
                  >
                    <X className="mr-1 size-3.5" /> I do not agree
                  </Button>
                </div>
              </details>
            </li>
          )
        })}
      </ul>

      <form action={action} className="space-y-4 rounded-lg border border-brass/30 bg-brass/[0.04] p-4 sm:p-5">
        <input type="hidden" name="base64Png" value={png} />
        <input
          type="hidden"
          name="openedKinds"
          value={AGREEMENTS.filter((a) => decisions[a.kind] === "agree").map((a) => a.kind).join(",")}
        />

        {anyDisagreed ? (
          <div className="rounded-md border border-danger/40 bg-danger/10 p-3 text-sm text-danger" role="alert">
            You&apos;ve marked one or more agreements as &ldquo;I do not agree.&rdquo; We can only prepare
            your application if you agree to all of them. If something concerns you, message us — or you
            can{" "}
            <Link href="/portal/choose-path" className="font-medium underline">
              switch to the self-guided path
            </Link>
            .
          </div>
        ) : (
          !allAgreed && (
            <p className="rounded-md border border-warn/30 bg-warn/10 p-2.5 text-xs text-warn">
              Open each agreement and choose &ldquo;I agree&rdquo; to continue ({agreedCount}/
              {AGREEMENTS.length} agreed).
            </p>
          )
        )}

        <div>
          <label htmlFor="signerName" className="engraved mb-1.5 block text-text-low">
            Your full legal name
          </label>
          <Input
            id="signerName"
            name="signerName"
            value={name}
            onChange={(e) => setName(e.target.value)}
            placeholder="First Middle Last"
            autoComplete="name"
          />
        </div>

        <div>
          <span className="engraved mb-1.5 block text-text-low">Your signature</span>
          <SignaturePad onSave={setPng} label={png ? "Update signature" : "Use this signature"} />
          {png && (
            <p className="mt-2 flex items-center gap-1.5 text-xs text-ok">
              <Check className="size-3.5" /> Signature captured.
            </p>
          )}
        </div>

        <Button type="submit" disabled={!canSubmit || pending} className="w-full sm:w-auto">
          {pending ? (
            <>
              <Loader2 className="mr-1.5 size-4 animate-spin" /> Signing…
            </>
          ) : (
            <>
              <ShieldCheck className="mr-1.5 size-4" /> Sign &amp; unlock my concierge
            </>
          )}
        </Button>

        {!canSubmit && !pending && (
          <p className="text-xs text-text-low">Enter your legal name and capture your signature to continue.</p>
        )}
        {state.error && (
          <p className="text-xs text-danger" role="alert">
            {state.error}
          </p>
        )}
      </form>
    </div>
  )
}
