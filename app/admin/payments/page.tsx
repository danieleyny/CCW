import { ExternalLink } from "lucide-react"
import { createClient } from "@/lib/supabase/server"
import { requireStaff } from "@/lib/auth"
import { PageHeader } from "@/components/shared/page-header"
import { Card, CardContent } from "@/components/ui/card"
import { StatusBadge } from "@/components/shared/status-badge"
import { RequestPaymentForm } from "@/components/admin/request-payment-form"
import { RecordOfflinePaymentForm } from "@/components/admin/record-offline-payment-form"
import { money, formatDate } from "@/lib/format"
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table"

export const metadata = { title: "Payments" }

export default async function AdminPayments() {
  const auth = await requireStaff()
  const isAdmin = auth.profile.role === "admin"
  const supabase = await createClient()

  const [{ data: payments }, { data: cases }] = await Promise.all([
    supabase
      .from("payments")
      .select("id, amount_cents, type, status, description, hosted_invoice_url, paid_at, created_at, clients(full_name)")
      .order("created_at", { ascending: false }),
    supabase
      .from("cases")
      .select("id, service_mode, clients(full_name)")
      .neq("status", "closed")
      .order("created_at", { ascending: false }),
  ])

  const rows = payments ?? []
  const collected = rows.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0)
  const outstanding = rows
    .filter((p) => p.status === "pending")
    .reduce((s, p) => s + p.amount_cents, 0)

  // Revenue by month (paid only).
  const byMonth = new Map<string, number>()
  for (const p of rows) {
    if (p.status !== "paid") continue
    const d = new Date(p.paid_at ?? p.created_at)
    const key = d.toLocaleDateString("en-US", { month: "short", year: "numeric" })
    byMonth.set(key, (byMonth.get(key) ?? 0) + p.amount_cents)
  }
  const months = [...byMonth.entries()].slice(0, 6).reverse()
  const maxMonth = Math.max(1, ...months.map(([, v]) => v))

  const caseOptions = (cases ?? []).map((c) => ({
    id: c.id,
    name: (c.clients as unknown as { full_name: string } | null)?.full_name ?? "Unknown",
    serviceMode: (c.service_mode as string | null) ?? null,
  }))

  return (
    <div>
      <PageHeader title="Payments" description="Revenue, balances owed, and payment requests." />

      <div className="mb-6 grid grid-cols-2 gap-4 lg:grid-cols-3">
        <Stat label="Collected" value={money(collected)} />
        <Stat label="Outstanding" value={money(outstanding)} accent />
        <Stat label="Transactions" value={String(rows.length)} />
      </div>

      {months.length > 0 && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="engraved mb-4">Revenue by month</div>
            <div className="flex items-end gap-3" style={{ height: 140 }}>
              {months.map(([label, val]) => (
                <div key={label} className="flex flex-1 flex-col items-center justify-end gap-2">
                  <div className="font-mono text-[10px] text-text-mid">{money(val)}</div>
                  <div
                    className="w-full rounded-t bg-brass/80"
                    style={{ height: `${(val / maxMonth) * 100}%` }}
                  />
                  <div className="engraved">{label}</div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      <Card className="mb-6">
        <CardContent className="p-6">
          <div className="engraved mb-4">Request a payment</div>
          <RequestPaymentForm cases={caseOptions} />
        </CardContent>
      </Card>

      {isAdmin && (
        <Card className="mb-6">
          <CardContent className="p-6">
            <div className="engraved mb-1">Record an offline payment</div>
            <p className="mb-4 text-xs text-text-low">
              Money that arrived outside Stripe (check, transfer, cash). Records it paid and unlocks the
              chosen package for this case — no Stripe round-trip.
            </p>
            <RecordOfflinePaymentForm cases={caseOptions} />
          </CardContent>
        </Card>
      )}

      <div className="rounded-lg border border-hairline bg-card">
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Client</TableHead>
              <TableHead>Description</TableHead>
              <TableHead>Type</TableHead>
              <TableHead>Amount</TableHead>
              <TableHead>Status</TableHead>
              <TableHead>Invoice</TableHead>
              <TableHead>Date</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.length === 0 && (
              <TableRow>
                <TableCell colSpan={7} className="h-20 text-center text-text-mid">
                  No payments yet.
                </TableCell>
              </TableRow>
            )}
            {rows.map((p) => {
              const client = p.clients as unknown as { full_name: string } | null
              return (
                <TableRow key={p.id}>
                  <TableCell className="font-medium">{client?.full_name ?? "—"}</TableCell>
                  <TableCell className="text-text-mid">{p.description ?? "—"}</TableCell>
                  <TableCell className="capitalize text-text-mid">{p.type}</TableCell>
                  <TableCell className="font-mono tabular-nums">{money(p.amount_cents)}</TableCell>
                  <TableCell>
                    <StatusBadge status={p.status} />
                  </TableCell>
                  <TableCell className="text-xs">
                    {p.hosted_invoice_url ? (
                      <a
                        href={p.hosted_invoice_url}
                        target="_blank"
                        rel="noreferrer"
                        className="inline-flex items-center gap-1 text-signal hover:underline"
                      >
                        View <ExternalLink className="size-3" />
                      </a>
                    ) : (
                      <span className="text-text-low">—</span>
                    )}
                  </TableCell>
                  <TableCell className="font-mono text-xs text-text-low">
                    {formatDate(p.paid_at ?? p.created_at)}
                  </TableCell>
                </TableRow>
              )
            })}
          </TableBody>
        </Table>
      </div>
    </div>
  )
}

function Stat({ label, value, accent }: { label: string; value: string; accent?: boolean }) {
  return (
    <Card className={accent ? "brass-edge" : ""}>
      <CardContent className="p-5">
        <div className="engraved">{label}</div>
        <div className="mt-1.5 font-display text-2xl font-semibold tabular-nums">{value}</div>
      </CardContent>
    </Card>
  )
}
