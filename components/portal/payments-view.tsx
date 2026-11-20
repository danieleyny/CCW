"use client"

import {
  AlertTriangle,
  Building2,
  Check,
  CheckCircle2,
  Clock3,
  Download,
  ExternalLink,
  Landmark,
  Receipt,
  ShieldCheck,
  X,
  type LucideIcon,
} from "lucide-react"
import BrandMark from "@/components/brand/BrandMark"
import { PayButton } from "@/components/portal/pay-button"
import { Button } from "@/components/ui/button"
import type { Fees } from "@/lib/fees"
import { money } from "@/lib/format"
import type { Database } from "@/lib/supabase/types"
import { interpolate, usePortalI18n } from "@/components/shared/portal-i18n-provider"
import type { Locale } from "@/config/i18n"
import type { Messages } from "@/lib/i18n/messages"

export type PortalPayment = Pick<
  Database["public"]["Tables"]["payments"]["Row"],
  | "id"
  | "amount_cents"
  | "type"
  | "status"
  | "description"
  | "invoice_url"
  | "hosted_invoice_url"
  | "paid_at"
  | "created_at"
>

type PaymentStatus = PortalPayment["status"]
type PaymentsMessages = Messages["payments"]

const STATUS_UI: Record<PaymentStatus, { labelKey: keyof Pick<PaymentsMessages, "paid" | "due" | "failed" | "refunded">; icon: LucideIcon }> = {
  paid: { labelKey: "paid", icon: Check },
  pending: { labelKey: "due", icon: Clock3 },
  failed: { labelKey: "failed", icon: AlertTriangle },
  refunded: { labelKey: "refunded", icon: X },
}

function formatPaymentDate(value: string, locale: Locale) {
  return new Intl.DateTimeFormat(locale === "es" ? "es-US" : "en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  }).format(new Date(value))
}

function StatusPill({ status }: { status: PaymentStatus }) {
  const { messages } = usePortalI18n()
  const { labelKey, icon: Icon } = STATUS_UI[status]
  return (
    <span className={`payments-status-pill payments-status-${status}`}>
      <Icon aria-hidden />
      {messages.payments[labelKey]}
    </span>
  )
}

function PaymentBanner({ status }: { status: "success" | "canceled" }) {
  const { messages } = usePortalI18n()
  const t = messages.payments
  const success = status === "success"
  const Icon = success ? CheckCircle2 : AlertTriangle
  return (
    <div className={`payments-banner payments-banner-${status}`} role="status">
      <span className="payments-banner-icon" aria-hidden>
        <Icon />
      </span>
      <span>
        {success
          ? t.successBanner
          : t.canceledBanner}
      </span>
    </div>
  )
}

function StripeOffNote() {
  const { messages } = usePortalI18n()
  const t = messages.payments
  return (
    <div className="payments-stripe-note">
      <span className="payments-stripe-note-icon" aria-hidden>
        <Building2 />
      </span>
      <p>
        <strong>{t.cardSoon}</strong> {t.cardSoonDetail}
      </p>
    </div>
  )
}

function EmptyPayments() {
  const { messages } = usePortalI18n()
  const t = messages.payments
  return (
    <div className="payments-empty">
      <span className="payments-empty-icon" aria-hidden>
        <Receipt />
      </span>
      <h2>{t.noPayments}</h2>
      <p>{t.noPaymentsDetail}</p>
    </div>
  )
}

function SecurityLine() {
  const { messages } = usePortalI18n()
  return (
    <p className="payments-security-line">
      <ShieldCheck aria-hidden />
      {messages.payments.stripeSecurity}
    </p>
  )
}

function GovernmentFeesCard({ fees }: { fees: Fees | null }) {
  const { messages } = usePortalI18n()
  const t = messages.payments
  if (!fees) return null

  return (
    <section className="payments-fees-card" aria-labelledby="payments-fees-title">
      <div className="payments-fees-header">
        <span className="payments-fees-icon" aria-hidden>
          <Landmark />
        </span>
        <div>
          <h2 id="payments-fees-title">{t.governmentFees}</h2>
          <p>{t.governmentFeesDetail}</p>
        </div>
      </div>
      <dl className="payments-fees-rows">
        <div>
          <dt>{t.applicationFee}</dt>
          <dd>{fees.applicationFee}</dd>
        </div>
        <div>
          <dt>{t.fingerprintFee}</dt>
          <dd>{fees.fingerprintFee}</dd>
        </div>
        <div className="payments-fees-total">
          <dt>{t.totalNypd}</dt>
          <dd>{fees.combined}</dd>
        </div>
      </dl>
    </section>
  )
}

function paymentTitle(payment: PortalPayment, t: PaymentsMessages) {
  return (payment.description ?? payment.type)
    .replace(/Deposit/gi, t.deposit)
    .replace(/Full Concierge/gi, t.fullConcierge)
    .replace(/Self[ -]?Guided/gi, t.selfGuided)
}

function derivePlan(rows: PortalPayment[], t: PaymentsMessages) {
  for (const payment of rows) {
    const description = payment.description ?? ""
    if (/full concierge/i.test(description)) return t.fullConcierge
    if (/self[ -]?guided/i.test(description)) return t.selfGuided
  }
  return null
}

function PaymentProgressRing({ paid, total }: { paid: number; total: number }) {
  const { messages } = usePortalI18n()
  const t = messages.payments
  const percent = total > 0 ? Math.min(100, Math.max(0, Math.round((paid / total) * 100))) : 0
  return (
    <div
      className="payments-progress-ring"
      role="img"
      aria-label={`${money(paid)} ${interpolate(t.ofPaid, { total: money(total) })}`}
    >
      <svg viewBox="0 0 120 120" aria-hidden>
        <circle className="payments-ring-track" cx="60" cy="60" r="52" pathLength="100" />
        <circle
          className="payments-ring-value"
          cx="60"
          cy="60"
          r="52"
          pathLength="100"
          strokeDasharray={`${percent} 100`}
        />
      </svg>
      <span className="payments-ring-copy">
        <strong>{money(paid)}</strong>
        <small>{interpolate(t.ofPaid, { total: money(total) })}</small>
      </span>
    </div>
  )
}

function InvoiceLink({ href, className = "" }: { href: string; className?: string }) {
  const { messages } = usePortalI18n()
  return (
    <Button asChild size="sm" variant="outline" className={className}>
      <a href={href} target="_blank" rel="noreferrer">
        {messages.payments.viewInvoice} <ExternalLink aria-hidden />
      </a>
    </Button>
  )
}

function ReceiptLink({ href, compact = false }: { href: string; compact?: boolean }) {
  const { messages } = usePortalI18n()
  return (
    <Button asChild size="sm" variant="outline" className={compact ? "payments-receipt-compact" : ""}>
      <a href={href} target="_blank" rel="noreferrer">
        <Receipt aria-hidden /> {messages.payments.receipt}
      </a>
    </Button>
  )
}

function DesktopPayments({
  rows,
  paid,
  due,
  stripeEnabled,
  fees,
}: {
  rows: PortalPayment[]
  paid: number
  due: number
  stripeEnabled: boolean
  fees: Fees | null
}) {
  const { locale, messages } = usePortalI18n()
  const t = messages.payments
  const pending = rows.filter((payment) => payment.status === "pending")
  const oldestPending = pending.at(-1) ?? null
  const total = paid + due
  const plan = derivePlan(rows, t)
  const heroLabel = oldestPending
    ? pending.length > 1
      ? interpolate(t.payNext, { amount: money(oldestPending.amount_cents) })
      : interpolate(t.payNow, { amount: money(due) })
    : ""

  return (
    <div className="payments-desktop">
      {due > 0 && oldestPending ? (
        <section className="payments-balance-hero" aria-labelledby="payments-balance-title">
          <div className="payments-balance-copy">
            <p className="payments-hero-eyebrow">{t.balanceDue}</p>
            <h2 id="payments-balance-title">{money(due)}</h2>
            <p className="payments-balance-meta">
              {paymentTitle(oldestPending, t)} · {interpolate(t.invoiceRequested, { date: formatPaymentDate(oldestPending.created_at, locale) })}
            </p>
            <div className="payments-hero-actions">
              <PayButton
                paymentId={oldestPending.id}
                label={heroLabel}
                size="lg"
                variant="gold"
                className="payments-hero-pay"
              />
              {oldestPending.hosted_invoice_url ? (
                <a
                  className="payments-hero-invoice"
                  href={oldestPending.hosted_invoice_url}
                  target="_blank"
                  rel="noreferrer"
                >
                  {t.viewInvoice} <ExternalLink aria-hidden />
                </a>
              ) : null}
            </div>
          </div>
          <div className="payments-balance-progress">
            <PaymentProgressRing paid={paid} total={total} />
            <dl className="payments-hero-facts">
              <div>
                <dt>{t.paidToDate}</dt>
                <dd>{money(paid)}</dd>
              </div>
              {plan ? (
                <div>
                  <dt>{t.plan}</dt>
                  <dd>{plan}</dd>
                </div>
              ) : null}
            </dl>
          </div>
        </section>
      ) : rows.length > 0 ? (
        <section className="payments-paid-hero" aria-labelledby="payments-paid-title">
          <span className="payments-paid-icon" aria-hidden>
            <CheckCircle2 />
          </span>
          <div>
            <p className="payments-hero-eyebrow">{t.balanceClear}</p>
            <h2 id="payments-paid-title">{t.allPaid}</h2>
            <p>{t.paidToDate} {money(paid)}</p>
          </div>
        </section>
      ) : null}

      {!stripeEnabled && due > 0 ? <StripeOffNote /> : null}

      {rows.length === 0 ? (
        <EmptyPayments />
      ) : (
        <section className="payments-history" aria-labelledby="payments-history-title">
          <div className="payments-history-heading">
            <h2 id="payments-history-title">{t.history}</h2>
            <span>{rows.length} {rows.length === 1 ? t.item : t.items}</span>
          </div>
          <ul>
            {rows.map((payment) => {
              const { icon: Icon } = STATUS_UI[payment.status]
              const receiptUrl = payment.hosted_invoice_url ?? payment.invoice_url
              return (
                <li
                  key={payment.id}
                  className={payment.status === "pending" ? "payments-history-pending" : undefined}
                >
                  <span className={`payments-status-tile payments-status-${payment.status}`} aria-hidden>
                    <Icon />
                  </span>
                  <div className="payments-history-title">
                    <h3>{paymentTitle(payment, t)}</h3>
                    <p>
                      {payment.paid_at
                        ? `${t.paid} ${formatPaymentDate(payment.paid_at, locale)}`
                        : formatPaymentDate(payment.created_at, locale)}
                    </p>
                  </div>
                  <StatusPill status={payment.status} />
                  <strong className="payments-history-amount">{money(payment.amount_cents)}</strong>
                  <div className="payments-history-actions">
                    {payment.status === "pending" ? (
                      <PayButton paymentId={payment.id} className="payments-row-pay" />
                    ) : null}
                    {payment.status === "pending" && payment.hosted_invoice_url ? (
                      <InvoiceLink href={payment.hosted_invoice_url} />
                    ) : null}
                    {payment.status === "paid" && receiptUrl ? <ReceiptLink href={receiptUrl} /> : null}
                  </div>
                </li>
              )
            })}
          </ul>
        </section>
      )}

      <GovernmentFeesCard fees={fees} />
      <SecurityLine />
    </div>
  )
}

function MobilePayments({
  rows,
  paid,
  due,
  stripeEnabled,
  fees,
  clientName,
  caseNumber,
}: {
  rows: PortalPayment[]
  paid: number
  due: number
  stripeEnabled: boolean
  fees: Fees | null
  clientName: string
  caseNumber: string | null
}) {
  const { locale, messages } = usePortalI18n()
  const t = messages.payments
  const pending = rows.filter((payment) => payment.status === "pending")
  const oldestPending = pending.at(-1) ?? null
  const compedRows = rows.filter(
    (payment) =>
      payment.status === "paid" &&
      payment.amount_cents === 0 &&
      /comp|access code/i.test(payment.description ?? "")
  )
  const comped = compedRows.reduce((sum, payment) => sum + payment.amount_cents, 0)
  const statementUrl = rows
    .filter((payment) => payment.status === "paid")
    .map((payment) => payment.hosted_invoice_url ?? payment.invoice_url)
    .find((url): url is string => Boolean(url))
  const payLabel = oldestPending
    ? pending.length > 1
      ? interpolate(t.payNext, { amount: money(oldestPending.amount_cents) })
      : interpolate(t.payNow, { amount: money(due) })
    : ""

  return (
    <div className="payments-mobile">
      <section className="payments-statement" aria-labelledby="payments-statement-title">
        <header className="payments-statement-header">
          <div className="payments-statement-brand">
            <BrandMark size={40} title="Gun License NYC" />
            <strong>Gun License NYC</strong>
          </div>
          <p className="payments-statement-meta">
            {t.statement} · {clientName}
            {caseNumber ? ` · ${t.caseLabel} ${caseNumber}` : ""}
          </p>
          <p className="payments-statement-balance-label">{t.balanceDue}</p>
          <h2 id="payments-statement-title">{money(due)}</h2>
        </header>

        <div className="payments-statement-body">
          {rows.length === 0 ? (
            <EmptyPayments />
          ) : (
            <ul className="payments-statement-items">
              {rows.map((payment) => {
                const receiptUrl = payment.hosted_invoice_url ?? payment.invoice_url
                return (
                  <li key={payment.id}>
                    <div className="payments-statement-item-main">
                      <div>
                        <h3>{paymentTitle(payment, t)}</h3>
                        <p>
                          {payment.paid_at
                            ? `${t.paid} ${formatPaymentDate(payment.paid_at, locale)}`
                            : formatPaymentDate(payment.created_at, locale)}
                        </p>
                        <StatusPill status={payment.status} />
                      </div>
                      <strong>{money(payment.amount_cents)}</strong>
                    </div>
                    {payment.status === "paid" && receiptUrl ? (
                      <ReceiptLink href={receiptUrl} compact />
                    ) : null}
                  </li>
                )
              })}
            </ul>
          )}

          <dl className="payments-statement-totals">
            <div>
              <dt>{t.paidToDate}</dt>
              <dd>{money(paid)}</dd>
            </div>
            {compedRows.length > 0 ? (
              <div>
                <dt>{t.comped}</dt>
                <dd>{money(comped)}</dd>
              </div>
            ) : null}
            <div className="payments-statement-total-due">
              <dt>{t.balanceDue}</dt>
              <dd>{money(due)}</dd>
            </div>
          </dl>

          {oldestPending ? (
            <div className="payments-statement-actions">
              <PayButton
                paymentId={oldestPending.id}
                label={payLabel}
                size="lg"
                variant="gold"
              />
              {oldestPending.hosted_invoice_url ? (
                <InvoiceLink href={oldestPending.hosted_invoice_url} />
              ) : null}
              {statementUrl ? (
                <Button asChild size="lg" variant="outline">
                  <a href={statementUrl} target="_blank" rel="noreferrer">
                    <Download aria-hidden /> {t.downloadStatement}
                  </a>
                </Button>
              ) : null}
            </div>
          ) : statementUrl ? (
            <div className="payments-statement-actions">
              <Button asChild size="lg" variant="outline">
                <a href={statementUrl} target="_blank" rel="noreferrer">
                  <Download aria-hidden /> {t.downloadStatement}
                </a>
              </Button>
            </div>
          ) : null}
        </div>

        <footer className="payments-statement-footer">
          <SecurityLine />
        </footer>
      </section>

      {!stripeEnabled && due > 0 ? <StripeOffNote /> : null}
      <GovernmentFeesCard fees={fees} />
    </div>
  )
}

export function PaymentsView({
  rows,
  paid,
  due,
  status,
  stripeEnabled,
  fees,
  clientName,
  caseNumber,
}: {
  rows: PortalPayment[]
  paid: number
  due: number
  status?: string
  stripeEnabled: boolean
  fees: Fees | null
  clientName: string
  caseNumber: string | null
}) {
  const { messages } = usePortalI18n()
  const t = messages.payments
  return (
    <div className="payments-page">
      <header className="payments-page-header">
        <p>{t.billing}</p>
        <h1>{t.payments}</h1>
      </header>

      {status === "success" ? <PaymentBanner status="success" /> : null}
      {status === "canceled" ? <PaymentBanner status="canceled" /> : null}

      <DesktopPayments
        rows={rows}
        paid={paid}
        due={due}
        stripeEnabled={stripeEnabled}
        fees={fees}
      />
      <MobilePayments
        rows={rows}
        paid={paid}
        due={due}
        stripeEnabled={stripeEnabled}
        fees={fees}
        clientName={clientName}
        caseNumber={caseNumber}
      />
    </div>
  )
}
