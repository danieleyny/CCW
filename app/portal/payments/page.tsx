import { createClient } from "@/lib/supabase/server"
import { getMyCase } from "@/lib/portal"
import { STRIPE_ENABLED } from "@/lib/stripe"
import { getFees } from "@/lib/fees"
import { PaymentsView } from "@/components/portal/payments-view"
import { getMessages } from "@/lib/i18n"

export const metadata = { title: "Payments" }

export default async function PortalPayments({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>
}) {
  const { status } = await searchParams
  const [myCase, t] = await Promise.all([getMyCase(), getMessages()])
  if (!myCase) {
    return (
      <p className="rounded-lg border border-dashed bg-card p-8 text-center text-sm text-text-mid">
        {t.common.noCase}
      </p>
    )
  }

  const supabase = await createClient()
  const { data: payments } = await supabase
    .from("payments")
    .select("id, amount_cents, type, status, description, invoice_url, hosted_invoice_url, paid_at, created_at")
    .eq("case_id", myCase.id)
    .order("created_at", { ascending: false })

  const fees = await getFees(supabase).catch(() => null)

  const rows = payments ?? []
  const paid = rows.filter((p) => p.status === "paid").reduce((s, p) => s + p.amount_cents, 0)
  const due = rows.filter((p) => p.status === "pending").reduce((s, p) => s + p.amount_cents, 0)

  return (
    <PaymentsView
      rows={rows}
      paid={paid}
      due={due}
      status={status}
      stripeEnabled={STRIPE_ENABLED}
      fees={fees}
      clientName={myCase.client.full_name}
      caseNumber={myCase.nypd_app_ref}
    />
  )
}
