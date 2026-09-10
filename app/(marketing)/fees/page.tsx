import Link from "next/link"
import { getPublicFeeTable } from "@/lib/public-data"
import { FACTS } from "@/content/facts"
import { formatDate } from "@/lib/format"
import { buildMetadata } from "@/lib/seo"
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

const measure: React.CSSProperties = { width: "min(100% - 48px, 820px)", marginInline: "auto" }
const wide: React.CSSProperties = { width: "min(100% - 48px, 1000px)", marginInline: "auto" }
const linkStyle = { color: "var(--electric-deep)", textDecoration: "none" as const }

const cell: React.CSSProperties = { padding: "16px", color: "var(--ink-soft)", fontSize: 14, borderBottom: "1px solid var(--rule)", verticalAlign: "top" }
const head: React.CSSProperties = {
  padding: "14px 16px",
  fontFamily: "var(--mono)",
  fontSize: 11,
  fontWeight: 500,
  letterSpacing: "0.06em",
  textTransform: "uppercase",
  color: "var(--ink-muted)",
  textAlign: "left",
  borderBottom: "1px solid var(--ink)",
}

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
    <div className="guide-page">
      <Breadcrumbs items={[{ name: "Home", path: "/" }, { name: "Fees", path: "/fees" }]} />
      <PageHero
        eyebrow="Government fees"
        title="Current NYC gun license fees"
        subtitle="The government fees, straight from our records — each with who sets it, who it's paid to, and when we last checked."
      />

      <div className="article-body" style={{ ...measure, padding: "56px 0 8px" }}>
        <DirectAnswer>
          A NYC gun license carries two government fees: the{" "}
          <strong>{application?.amount ?? "NYPD"} NYPD License Division application fee</strong> and
          the <strong>{fingerprint?.amount ?? "State"} NYS fingerprint fee</strong>. Both are paid
          directly to the government — never to us — and both are non-refundable regardless of the
          outcome. Training and notarization are billed separately by those providers.
        </DirectAnswer>
      </div>

      <section style={{ padding: "24px 0" }}>
        <div style={wide}>
          <div style={{ overflowX: "auto", border: "1px solid var(--rule)", background: "var(--ivory)" }}>
            <table style={{ width: "100%", minWidth: 560, borderCollapse: "collapse", textAlign: "left" }}>
              <thead>
                <tr>
                  <th style={head}>Fee</th>
                  <th style={head}>Amount</th>
                  <th style={head}>Paid to</th>
                  <th style={head}>Set by</th>
                </tr>
              </thead>
              <tbody>
                {payable.map((r) => (
                  <tr key={r.key}>
                    <td style={cell}>
                      <div style={{ fontWeight: 600, color: "var(--ink)" }}>{r.label}</div>
                      {r.notes && (
                        <p style={{ margin: "4px 0 0", fontSize: 12, color: "var(--ink-muted)" }}>{r.notes}</p>
                      )}
                    </td>
                    <td style={{ ...cell, fontFamily: "var(--mono)", fontWeight: 600, color: "var(--ink)" }}>
                      {r.amount}
                    </td>
                    <td style={cell}>{r.payTo}</td>
                    <td style={cell}>{r.authority ?? "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          {leoWaiver && (
            <p
              style={{
                marginTop: 16,
                border: "1px solid var(--rule)",
                background: "var(--ivory)",
                padding: "14px 16px",
                fontSize: 14,
                color: "var(--ink-soft)",
              }}
            >
              <strong style={{ color: "var(--ink)" }}>Retired law enforcement:</strong> {leoWaiver.notes}{" "}
              See{" "}
              <Link href="/retired-leo" style={linkStyle}>
                retired law enforcement
              </Link>
              .
            </p>
          )}

          {lastVerified && (
            <p style={{ marginTop: 16, fontSize: 12, color: "var(--ink-muted)" }}>
              Fees last verified {formatDate(lastVerified)}. Amounts are read live from our records;
              government agencies can change them at any time, so confirm the current figure with the
              agency before you pay.
            </p>
          )}
        </div>
      </section>

      <div className="article-body" style={{ ...measure, padding: "8px 0" }}>
        <h3>Who sets these fees</h3>
        <p>
          We don&apos;t set any government amount and we can&apos;t refund it. Here&apos;s the
          authority behind each, with a link to the primary source so you can check us:
        </p>
        <FactList facts={[FACTS.applicationFee, FACTS.fingerprintFee]} />
      </div>

      <FaqBlock faqs={FAQS} />

      <section style={{ padding: "24px 0 8px" }}>
        <div style={{ ...measure, textAlign: "center" }}>
          <Link className="button" href="/eligibility">
            Check your eligibility <span className="button-arrow" aria-hidden="true">→</span>
          </Link>
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
    </div>
  )
}
