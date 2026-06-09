import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { STRIPE_ENABLED } from "@/lib/stripe"
import { money, formatDate } from "@/lib/format"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { SectionEyebrow } from "@/components/shared/section-eyebrow"
import { PayButton } from "@/components/portal/pay-button"
import { Button } from "@/components/ui/button"

export const metadata = { title: "Payments" }

export default async function PortalPayments() {
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
    .select("id, amount_cents, type, status, description, invoice_url, paid_at, created_at")
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

      <ul className="divide-y divide-hairline rounded-lg border border-hairline bg-card">
        {rows.length === 0 && (
          <li className="p-6 text-center text-sm text-text-mid">No payments yet.</li>
        )}
        {rows.map((p) => (
          <li key={p.id} className="flex items-center justify-between gap-3 p-4">
            <div className="min-w-0">
              <div className="text-sm font-medium">{p.description ?? p.type}</div>
              <div className="font-mono text-xs text-text-low">
                {p.paid_at ? `Paid ${formatDate(p.paid_at)}` : formatDate(p.created_at)}
              </div>
            </div>
            <div className="flex items-center gap-3">
              <span className="font-display font-semibold tabular-nums">{money(p.amount_cents)}</span>
              <StatusBadge status={p.status} />
              {p.status === "pending" && <PayButton paymentId={p.id} />}
              {p.status === "paid" && p.invoice_url && (
                <Button asChild size="sm" variant="outline">
                  <a href={p.invoice_url} target="_blank" rel="noreferrer">
                    Receipt
                  </a>
                </Button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  )
}
