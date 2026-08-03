import Link from "next/link"
import { getPublicFeeTable } from "@/lib/public-data"
import { FACTS } from "@/content/facts"
import { formatDate } from "@/lib/format"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "Current NYC Gun License Fees",
  description:
    "The current NYPD and NYS government fees for a NYC gun license, each with the agency that sets it and the date we last verified it. We never collect them.",
  path: "/fees",
})

/**
 * THE LIVE FEE TABLE. /cost carries the narrative and the all-in estimate; this
 * page is the compact, indexable reference: the raw government-fee rows straight
 * from the `fees` table (getPublicFeeTable), each with its statutory authority
 * and last-verified date, so the number and its provenance are visible together.
 *
 * Every amount is DB-sourced — an admin fee edit flows straight here. We never
 * collect these fees; the page says so plainly and links the primary sources.
 */
export default async function FeesPage() {
  const rows = await getPublicFeeTable()
  // The two fees everyone pays (the retired-LEO waiver row carries amount 0 and
  // is surfaced as a note, not a headline row).
  const payable = rows.filter((r) => r.key !== "retired_leo_application")
  const leoWaiver = rows.find((r) => r.key === "retired_leo_application")
  // The most recent row-touch date stands in for "table last verified".
  const lastVerified = rows.map((r) => r.updatedAt).filter(Boolean).sort().at(-1)

  const application = payable.find((r) => r.key === "nypd_application")
  const fingerprint = payable.find((r) => r.key === "dcjs_fingerprint")

  const FAQS = [
    {
      q: "What is the NYPD gun license application fee?",
      a: `The NYPD handgun license application fee is ${application?.amount ?? "set by the NYPD"}, paid directly to the NYPD License Division. It applies to new applications and renewals alike, it is not refundable, and it is never collected by us.`,
    },
    {
      q: "How much is the fingerprint fee?",
      a: `The fingerprint fee is ${fingerprint?.amount ?? "set by New York State"}, set by the NYS Division of Criminal Justice Services and paid to the NYPD License Division at your in-person fingerprinting appointment. Confirm the exact amount when NYPD schedules you — it can change.`,
    },
    {
      q: "Do you collect any of these fees?",
      a: "No. The application fee is paid to the NYPD and the fingerprint fee at your NYPD fingerprinting appointment — never to us, not even as a pass-through. Our own service fee is a separate charge, shown in full on our pricing page.",
    },
    {
      q: "Are the fees refundable?",
      a: "No. Both the application fee and the fingerprint fee are non-refundable regardless of the outcome of your application.",
    },
  ]

  return (
    <>
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Fees", path: "/fees" }]} />
      <PageHero
        eyebrow="Government fees"
        title="Current NYC gun license fees"
        subtitle="The government fees, straight from our records — each with who sets it, who it's paid to, and when we last checked."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 pt-8 sm:px-6">
        <DirectAnswer>
          A NYC gun license carries two government fees: the{" "}
          <strong>{application?.amount ?? "NYPD"} NYPD License Division application fee</strong> and
          the <strong>{fingerprint?.amount ?? "State"} NYS fingerprint fee</strong>. Both are paid
          directly to the government — never to us — and both are non-refundable regardless of the
          outcome. Training and notarization are billed separately by those providers.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-4xl px-4 py-8 sm:px-6">
        <div className="overflow-x-auto rounded-xl border border-hairline">
          <table className="w-full min-w-[38rem] border-collapse text-left text-sm">
            <thead>
              <tr className="border-b border-hairline bg-card text-xs uppercase tracking-wide text-text-low">
                <th className="px-4 py-3 font-medium">Fee</th>
                <th className="px-4 py-3 font-medium">Amount</th>
                <th className="px-4 py-3 font-medium">Paid to</th>
                <th className="px-4 py-3 font-medium">Set by</th>
              </tr>
            </thead>
            <tbody>
              {payable.map((r) => (
                <tr key={r.key} className="border-b border-hairline align-top last:border-0">
                  <td className="px-4 py-4">
                    <div className="font-medium text-text-hi">{r.label}</div>
                    {r.notes && <p className="mt-1 text-xs text-text-low">{r.notes}</p>}
                  </td>
                  <td className="px-4 py-4 font-mono font-semibold text-text-hi">{r.amount}</td>
                  <td className="px-4 py-4 text-text-mid">{r.payTo}</td>
                  <td className="px-4 py-4 text-text-mid">{r.authority ?? "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {leoWaiver && (
          <p className="mt-4 rounded-lg border border-hairline bg-card px-4 py-3 text-sm text-text-mid">
            <span className="font-medium text-text-hi">Retired law enforcement:</span> {leoWaiver.notes}{" "}
            See <Link href="/retired-leo" className="text-signal hover:underline">retired law enforcement</Link>.
          </p>
        )}

        {lastVerified && (
          <p className="mt-4 text-xs text-text-low">
            Fees last verified {formatDate(lastVerified)}. Amounts are read live from our records;
            government agencies can change them at any time, so confirm the current figure with the
            agency before you pay.
          </p>
        )}
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">Who sets these fees</h2>
        <p className="mt-3 text-text-mid">
          We don&apos;t set any government amount and we can&apos;t refund it. Here&apos;s the
          authority behind each, with a link to the primary source so you can check us:
        </p>
        <FactList facts={[FACTS.applicationFee, FACTS.fingerprintFee]} />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "The all-in cost, explained", href: "/cost" },
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "Official sources and forms", href: "/resources" },
          { label: "How long the process takes", href: "/timeline" },
        ]}
      />
    </>
  )
}
