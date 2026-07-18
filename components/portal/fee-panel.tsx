"use client"

import { useState, useTransition } from "react"
import {
  Banknote,
  CalendarClock,
  Check,
  Download,
  ExternalLink,
  Fingerprint,
  Info,
  Landmark,
  Phone,
} from "lucide-react"
import { toast } from "sonner"
import type { FeeSummary } from "@/lib/fees"
import { FINGERPRINT_SCHEDULING } from "@/lib/fees"
import { acknowledgeFees, generateFeeSheet } from "@/app/portal/requirements/actions"
import { DocumentUploader } from "@/components/portal/document-uploader"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export interface FeeReceipts {
  nypd: boolean
  fingerprint: boolean
}

/**
 * FEE-01: what you'll owe, to whom, when, and how — then an acknowledgement
 * that actually means something.
 *
 * THE LINE WE DON'T CROSS: these two fees are paid by the applicant directly to
 * the NYPD and to the fingerprint vendor. There is no "pay now" here and there
 * never will be — collecting government money, even as a pass-through, would put
 * us in the role NYPD reserves for the applicant. Every amount comes from the
 * platform fee schedule, so an admin edit moves this panel.
 */
export function FeePanel({
  reqCode,
  summary,
  receipts,
  caseId,
  clientId,
  done,
}: {
  reqCode: string
  summary: FeeSummary
  receipts: FeeReceipts
  caseId: string
  clientId: string
  done: boolean
}) {
  const [method, setMethod] = useState<"card" | "money_order" | "">("")
  const [pending, startTransition] = useTransition()
  const [sheetPending, startSheet] = useTransition()

  function acknowledge() {
    startTransition(async () => {
      const r = await acknowledgeFees(reqCode, { method: method || undefined })
      toast[r.error ? "error" : "success"](
        r.error ?? "Noted — you know what's owed and to whom. Nothing is paid to us."
      )
    })
  }

  return (
    <div className="mt-3 space-y-3">
      {/* The reassurance people actually need, before the numbers. */}
      <p className="flex items-start gap-2 rounded-md border border-hairline bg-surface-2/40 p-3 text-xs text-text-mid">
        <Info className="mt-0.5 size-3.5 shrink-0 text-signal" />
        These go straight to the government and the fingerprint vendor — never to us. Here&apos;s
        exactly what to have ready so nothing surprises you at filing.
      </p>

      {/* ── Itemized breakdown ─────────────────────────────────────────────── */}
      <div className="overflow-hidden rounded-md border border-hairline">
        {summary.items.map((item) => (
          <div key={item.key} className="border-b border-hairline p-3 last:border-b-0">
            <div className="flex items-start justify-between gap-3">
              <div className="min-w-0">
                <div className="flex items-center gap-1.5 text-sm font-medium">
                  {item.key === "nypd_application" ? (
                    <Landmark className="size-3.5 text-brass" />
                  ) : (
                    <Fingerprint className="size-3.5 text-brass" />
                  )}
                  {item.label}
                </div>
                <p className="mt-1 text-xs text-text-mid">
                  Paid to <span className="text-foreground">{item.payTo}</span> · {item.when}
                </p>
              </div>
              <div className="shrink-0 text-right">
                <div className={cn("font-mono text-sm font-semibold", item.waived && "text-ok")}>
                  {item.waived ? "$0" : item.amount}
                </div>
                {item.waived && <div className="text-[10px] text-ok">{item.waivedReason}</div>}
              </div>
            </div>

            <ul className="mt-2 space-y-0.5">
              {item.how.map((h) => (
                <li key={h} className="text-xs text-text-low">
                  · {h}
                </li>
              ))}
            </ul>

            {item.caveat && (
              <p className="mt-1.5 text-[11px] text-warn">{item.caveat}</p>
            )}
          </div>
        ))}

        <div className="flex items-center justify-between gap-3 bg-surface-2/60 p-3">
          <div className="text-xs">
            <div className="font-medium">Total you&apos;ll pay directly</div>
            <div className="text-text-low">Not to Gun License NYC — we never handle these fees.</div>
          </div>
          <div className="font-mono text-base font-semibold">{summary.total}</div>
        </div>
      </div>

      {summary.hasWaiver && (
        <p className="flex items-start gap-1.5 rounded-md border border-ok/30 bg-ok/8 p-2 text-xs text-ok">
          <Check className="mt-0.5 size-3.5 shrink-0" />
          Your application fee is waived as retired law enforcement. The fingerprint fee is still
          owed.
        </p>
      )}

      <p className="text-xs text-warn">{summary.nonRefundable}</p>

      {/* ── Fingerprint appointment helper ─────────────────────────────────── */}
      <div className="rounded-md border border-hairline bg-surface-2/40 p-3">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <CalendarClock className="size-3.5 text-brass" />
          Booking your fingerprinting
        </div>
        <p className="mt-1 text-xs text-text-mid">{FINGERPRINT_SCHEDULING.serviceCodeNote}</p>
        <div className="mt-2 flex flex-wrap items-center gap-3">
          <a
            href={FINGERPRINT_SCHEDULING.schedulingUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-signal underline"
          >
            Book with {FINGERPRINT_SCHEDULING.vendor} <ExternalLink className="size-3" />
          </a>
          <a
            href={FINGERPRINT_SCHEDULING.lookupUrl}
            target="_blank"
            rel="noreferrer"
            className="inline-flex min-h-[44px] items-center gap-1.5 text-xs text-signal underline"
          >
            Service code lookup <ExternalLink className="size-3" />
          </a>
          <span className="inline-flex items-center gap-1.5 text-xs text-text-mid">
            <Phone className="size-3" /> {FINGERPRINT_SCHEDULING.phone}
          </span>
        </div>
        <div className="mt-2 text-xs text-text-low">
          Bring: {FINGERPRINT_SCHEDULING.bring.join(" · ")}
        </div>
      </div>

      {/* ── Fee sheet ──────────────────────────────────────────────────────── */}
      <Button
        size="sm"
        variant="outline"
        className="min-h-[44px]"
        disabled={sheetPending}
        onClick={() =>
          startSheet(async () => {
            const r = await generateFeeSheet()
            if (r.error) {
              toast.error(r.error)
              return
            }
            if (r.url) window.open(r.url, "_blank", "noreferrer")
            toast.success("Your fee sheet is ready — it's saved under Documents too.")
          })
        }
      >
        <Download className="mr-1.5 size-3.5" />
        {sheetPending ? "Preparing…" : "Download my fee sheet"}
      </Button>

      {/* ── Receipt tracking (optional, never blocks) ──────────────────────── */}
      <div className="space-y-2 rounded-md border border-hairline p-3">
        <div className="flex items-center gap-1.5 text-sm font-medium">
          <Banknote className="size-3.5 text-brass" />
          Receipts (optional)
        </div>
        <p className="text-xs text-text-mid">
          Once you&apos;ve paid, keep the receipts here with the rest of your file. This is
          record-keeping — it doesn&apos;t gate anything, and you pay both fees later anyway.
        </p>

        <div className="flex flex-wrap gap-3 text-xs">
          <span className={receipts.nypd ? "text-ok" : "text-text-low"}>
            NYPD fee — {receipts.nypd ? "receipt saved ✓" : "not yet"}
          </span>
          <span className={receipts.fingerprint ? "text-ok" : "text-text-low"}>
            Fingerprint fee — {receipts.fingerprint ? "receipt saved ✓" : "not yet"}
          </span>
        </div>

        <DocumentUploader
          caseId={caseId}
          clientId={clientId}
          type="nypd_fee_receipt"
          reqCode={reqCode}
          label="NYPD payment receipt"
          current={null}
        />
        <DocumentUploader
          caseId={caseId}
          clientId={clientId}
          type="fingerprint_fee_receipt"
          reqCode={reqCode}
          label="Fingerprint payment receipt"
          current={null}
        />
      </div>

      {/* ── The acknowledgement ────────────────────────────────────────────── */}
      {done ? (
        <span className="inline-flex items-center gap-1.5 text-xs text-ok">
          <Check className="size-3.5" /> You&apos;ve confirmed you&apos;re ready for these fees.
        </span>
      ) : (
        <div className="space-y-2 rounded-md border border-brass/30 bg-brass/8 p-3">
          <div className="text-sm font-medium text-brass-bright">Confirm you&apos;re ready</div>
          <p className="text-xs text-text-mid">
            By confirming, you&apos;re saying you understand the amounts above and who they&apos;re
            paid to, that you&apos;ll have an accepted payment method ready, and that these fees are
            non-refundable.
          </p>

          <div className="flex flex-wrap gap-2">
            {(
              [
                { v: "card", label: "I'll pay by card" },
                { v: "money_order", label: "I'll use money orders" },
              ] as const
            ).map((opt) => (
              <button
                key={opt.v}
                type="button"
                aria-pressed={method === opt.v}
                onClick={() => setMethod(method === opt.v ? "" : opt.v)}
                className={cn(
                  "min-h-[44px] rounded-md border px-3 text-xs font-medium transition-colors",
                  method === opt.v
                    ? "border-brass/60 bg-brass/20 text-brass-bright"
                    : "border-hairline text-text-mid hover:text-foreground"
                )}
              >
                {opt.label}
              </button>
            ))}
          </div>

          <Button size="sm" className="min-h-[44px]" disabled={pending} onClick={acknowledge}>
            {pending ? "Saving…" : "I understand — I'm ready for these fees"}
          </Button>
        </div>
      )}
    </div>
  )
}
