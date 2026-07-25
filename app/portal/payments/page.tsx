import {
  CheckCircle2,
  Clock,
  AlertTriangle,
  Receipt,
  ExternalLink,
  ShieldCheck,
  XCircle,
  type LucideIcon,
} from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { STRIPE_ENABLED } from "@/lib/stripe"
import { money, formatDate } from "@/lib/format"
import { cn } from "@/lib/utils"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { PayButton } from "@/components/portal/pay-button"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Payments" }

/** Per-status card furniture — glyph + ambient glow, from the shared token set. */
const STATUS_UI: Record<string, { icon: LucideIcon; glow: string; iconTone: string }> = {
  paid: { icon: CheckCircle2, glow: "glow-ok", iconTone: "text-ok" },
  pending: { icon: Clock, glow: "glow-neutral", iconTone: "text-brass" },
  failed: { icon: AlertTriangle, glow: "glow-fix", iconTone: "text-warn" },
  refunded: { icon: XCircle, glow: "glow-neutral", iconTone: "text-text-mid" },
}

export default async function PortalPayments({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const myCase = await getMyCase()
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-text-mid">
        Your case isn&apos;t set up yet.
      </p>
    )
  }

  const supabase = await createClient()
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount_cents, type, status, description, invoice_url, hosted_invoice_url, paid_at, created_at")
    .eq("case_id", myCase.id)
    .order("created_at", { ascending: false })

  const rows = payments ?? []
  const paid = rows.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0)
  const due = rows.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount_cents, 0)

  return (
    <div>
      <div className="mb-5">
        <SectionEyebrow>Billing</SectionEyebrow>
        <h1 className="mt-2 text-2xl font-semibold tracking-tight">Payments</h1>
      </div>

      {/* Return from Stripe Checkout. */}
      {status === "success" && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-ok/30 bg-ok/10 p-4 text-sm text-ok">
          <CheckCircle2 className="mt-0.5 size-4 shrink-0" />
          <span>Payment received — thank you. Your receipt is below and your case is up to date.</span>
        </div>
      )}
      {status === "canceled" && (
        <div className="mb-5 flex items-start gap-2 rounded-lg border border-warn/30 bg-warn/10 p-4 text-sm text-warn">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" />
          <span>Checkout was canceled — nothing was charged. You can pay any balance below whenever you&apos;re ready.</span>
        </div>
      )}

      <div className="mb-6 grid grid-cols-2 gap-3">
        <Card>
          <CardContent className="p-5">
            <div className="engraved">Paid to date</div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{money(paid)}</div>
          </CardContent>
        </Card>
        <Card className={due > 0 ? "brass-edge" : ""}>
          <CardContent className="p-5">
            <div className="engraved">Balance due</div>
            <div className="mt-1 font-display text-2xl font-semibold tabular-nums">{money(due)}</div>
          </CardContent>
        </Card>
      </div>

      {!STRIPE_ENABLED && due > 0 && (
        <p className="mb-4 rounded-md border border-hairline bg-surface-2 p-3 text-sm text-text-mid">
          Online card payments are opening soon. Your concierge will send a secure invoice for any
          balance due.
        </p>
      )}

      {rows.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-hairline bg-card/50 px-6 py-12 text-center">
          <Receipt className="mx-auto size-6 text-text-low" />
          <p className="mt-3 text-sm font-medium">No payments yet</p>
          <p className="mx-auto mt-1 max-w-sm text-sm text-text-mid">
            When you enroll or your concierge issues an invoice, it&apos;ll appear here with a secure pay
            link and a receipt.
          </p>
        </div>
      ) : (
        <ul className="space-y-3.5">
          {rows.map((p) => {
            const ui = STATUS_UI[p.status] ?? STATUS_UI.pending
            const Icon = ui.icon
            const receiptUrl = p.hosted_invoice_url ?? p.invoice_url
            return (
              <li key={p.id} className={cn("card-raised p-5", ui.glow)}>
                <div className="flex items-start gap-3.5">
                  <div className="icon-tile shrink-0" aria-hidden>
                    <Icon className={cn("size-5", ui.iconTone)} />
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-1">
                      <h2 className="min-w-0 font-medium">{p.description ?? p.type}</h2>
                      <span className="shrink-0 font-display font-semibold tabular-nums">
                        {money(p.amount_cents)}
                      </span>
                    </div>
                    <div className="mt-0.5 flex flex-wrap items-center gap-x-2 gap-y-1 font-mono text-xs text-text-low">
                      <StatusBadge status={p.status} />
                      <span>{p.paid_at ? `Paid ${formatDate(p.paid_at)}` : formatDate(p.created_at)}</span>
                    </div>

                    <div className="mt-3 flex flex-wrap items-center gap-2">
                      {p.status === "pending" && <PayButton paymentId={p.id} />}
                      {p.status === "pending" && p.hosted_invoice_url && (
                        <Button asChild size="sm" variant="outline">
                          <a href={p.hosted_invoice_url} target="_blank" rel="noreferrer">
                            <ExternalLink className="mr-1.5 size-3.5" /> View invoice
                          </a>
                        </Button>
                      )}
                      {p.status === "paid" && receiptUrl && (
                        <Button asChild size="sm" variant="outline">
                          <a href={receiptUrl} target="_blank" rel="noreferrer">
                            <Receipt className="mr-1.5 size-3.5" /> Receipt
                          </a>
                        </Button>
                      )}
                    </div>
                  </div>
                </div>
              </li>
            )
          })}
        </ul>
      )}

      <p className="mt-5 flex items-center justify-center gap-1.5 text-center text-xs text-text-low">
        <ShieldCheck className="size-3.5 text-text-mid" />
        Payments secured by Stripe · we never collect NYPD or DCJS fees.
      </p>
    </div>
  )
}
