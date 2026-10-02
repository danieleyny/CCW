import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { DirectAnswer, FactList } from "@/components/marketing/page-blocks"
import { ArticleTemplate } from "@/components/marketing/v2/article-template"

export const metadata = buildMetadata({
  title: "Do I Need a Lawyer for a NYC Gun License?",
  description:
    "An honest comparison of doing it yourself, a document-prep service, and a New York attorney for a NYC gun license — including when we're the wrong choice.",
  path: "/do-i-need-a-lawyer",
})

/**
 * The honest-comparison page. It exists to talk some readers OUT of hiring us —
 * a straightforward case genuinely doesn't need help, and an arrest history or a
 * denial genuinely needs an attorney, which we are not (FACTS.youFile). Every
 * legal claim renders from content/facts.ts; nothing here is asserted freehand.
 * Rendered through the v2 interior article template.
 */

const linkStyle = { color: "var(--electric-deep)", textDecoration: "none" as const }

const ROWS: { label: string; diy: string; us: string; attorney: string }[] = [
  {
    label: "What it is",
    diy: "You read the rules, gather your own documents, and submit.",
    us: "We prepare your documents and manage the case. You still review and submit it yourself.",
    attorney: "A New York-licensed attorney who can represent you before the License Division.",
  },
  {
    label: "Who submits the application",
    diy: "You do.",
    us: "You do.",
    attorney: "You do — but an attorney can appear and advocate for you.",
  },
  {
    label: "Can give you legal advice",
    diy: "No one is advising you.",
    us: "No. We can explain a published rule; we can't advise you on your situation.",
    attorney: "Yes. That's the whole point of hiring one.",
  },
  {
    label: "Best when",
    diy: "Your history is clean, you have time, and you're comfortable with paperwork.",
    us: "You want the paperwork and deadlines handled, and your case is straightforward.",
    attorney: "You have an arrest history, an order of protection, a prior denial, or an appeal.",
  },
  {
    label: "What it costs",
    diy: "Just the fees everyone pays — application, fingerprints, training, notary.",
    us: "A flat fee on top of those. See our pricing.",
    attorney: "Attorneys set their own rates. Ask for the fee arrangement in writing.",
  },
]

const FAQS = [
  {
    q: "Do I need a lawyer to apply for a NYC gun license?",
    a: "Usually, no. If you're over 21, your record is clean, and you're willing to work through the paperwork carefully, plenty of people apply on their own and do fine. A lawyer matters most when there's something in your history that needs judgment — an arrest, an order of protection, a prior denial, or an appeal.",
  },
  {
    q: "Are you attorneys?",
    a: "No. Gun License NYC is a document-preparation and case-management service. We are not attorneys, we don't represent you before the NYPD License Division, and we can't advise you on your specific legal situation. On every plan, you remain the applicant and submit your own application.",
  },
  {
    q: "What's the difference between what you do and what a lawyer does?",
    a: "We handle the mechanics: which documents you need, getting them right, keeping the notarizations and training dates valid, and tracking the case. A lawyer handles judgment and advocacy: what your record means, how to present it, and speaking for you if things go sideways.",
  },
  {
    q: "I have an arrest on my record. Who should I call?",
    a: "An attorney, first. Even a sealed or dismissed arrest is still disclosed on a New York firearms application, and how you present it is a legal question we're not allowed to answer. We can refer you to a New York-licensed attorney, and we can still handle the paperwork alongside them.",
  },
  {
    q: "Can I use a lawyer and a service like yours at the same time?",
    a: "Yes, and for some people that's the right setup. Your attorney handles the legal questions and any representation; we handle the documents, the deadlines, and the case file. Nothing about hiring us limits your ability to hire a lawyer.",
  },
  {
    q: "Will hiring anyone make my application go faster?",
    a: "No. The NYPD sets its own pace and retains full discretion over the decision. What help can do is keep your file complete and correct the first time, so you're not losing weeks to a missing signature.",
  },
]

const cellStyle: React.CSSProperties = {
  padding: "14px 16px",
  color: "var(--ink-soft)",
  fontSize: 14,
  lineHeight: 1.5,
  borderBottom: "1px solid var(--rule)",
  verticalAlign: "top",
}
const headStyle: React.CSSProperties = {
  padding: "14px 16px",
  fontFamily: "var(--display)",
  fontWeight: 600,
  fontSize: 16,
  textAlign: "left",
  borderBottom: "1px solid var(--ink)",
}

function ComparisonTable() {
  return (
    <div style={{ overflowX: "auto", margin: "24px 0", border: "1px solid var(--rule)", background: "var(--ivory)" }}>
      <table style={{ width: "100%", minWidth: 640, borderCollapse: "collapse", textAlign: "left" }}>
        <caption style={{ padding: "12px 16px", textAlign: "left", fontSize: 12, color: "var(--ink-muted)" }}>
          Doing it yourself is a legitimate option. So is skipping us for an attorney.
        </caption>
        <thead>
          <tr>
            <th scope="col" style={{ ...headStyle, width: 150 }}>
              <span className="sr-only">Compared on</span>
            </th>
            <th scope="col" style={headStyle}>
              Doing it yourself
            </th>
            <th scope="col" style={{ ...headStyle, color: "var(--electric-deep)" }}>
              Gun License NYC
            </th>
            <th scope="col" style={headStyle}>
              A New York attorney
            </th>
          </tr>
        </thead>
        <tbody>
          {ROWS.map((r) => (
            <tr key={r.label}>
              <th scope="row" style={{ ...cellStyle, color: "var(--ink)", fontWeight: 600 }}>
                {r.label}
              </th>
              <td style={cellStyle}>{r.diy}</td>
              <td style={cellStyle}>{r.us}</td>
              <td style={cellStyle}>{r.attorney}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

export default function DoINeedALawyerPage() {
  return (
    <ArticleTemplate
      eyebrow="Choosing help"
      title="Do I need a lawyer for a NYC gun license?"
      lede="An honest answer, including the parts where the honest answer is “not us.”"
      breadcrumb={[
        { name: "Home", path: "/" },
        { name: "Do I need a lawyer?", path: "/do-i-need-a-lawyer" },
      ]}
      meta={["Reviewed September 2026", "We are not attorneys"]}
      sections={[
        {
          id: "article-answer",
          heading: "The honest answer",
          navLabel: "The short answer",
          body: (
            <DirectAnswer>
              For most people, <strong>no</strong>. If you&apos;re over 21 with a clean record, a NYC gun
              license application is long and fussy but not a legal fight — plenty of people do it
              themselves. You need a New York-licensed attorney if you have an{" "}
              <strong>arrest history, an order of protection, a prior denial, or an appeal</strong>,
              because those call for legal advice and representation. A service like ours sits in the
              middle: we prepare your documents and manage the case, but we aren&apos;t attorneys, and you
              review and submit your own application on every plan. Full Concierge adds hands-on preparation and review, not representation.
            </DirectAnswer>
          ),
        },
        {
          id: "article-compare",
          heading: "Three ways to do this, side by side",
          navLabel: "Side by side",
          body: (
            <>
              <p>We&apos;d rather you pick right than pick us. Here&apos;s the real comparison.</p>
              <ComparisonTable />
            </>
          ),
        },
        {
          id: "article-diy",
          heading: "When you should do it yourself",
          navLabel: "Do it yourself",
          body: (
            <p>
              If your record is clean, you&apos;re organized, and you have the evenings to spend on it, you
              can absolutely do this alone. The rules are published — we link every one of them on our{" "}
              <Link href="/resources" style={linkStyle}>
                resources page
              </Link>
              , for free, whether or not you ever pay us a dollar. What you&apos;re buying from us is time
              and fewer mistakes, not access. There is no access to buy.
            </p>
          ),
        },
        {
          id: "article-attorney",
          heading: "When you should call an attorney instead",
          navLabel: "Call an attorney",
          body: (
            <>
              <p>Call a New York-licensed attorney — not us — if any of this is true:</p>
              <ul style={{ listStyle: "none", margin: "16px 0 0", padding: 0, display: "grid", gap: 10 }}>
                <li style={{ border: "1px solid var(--rule)", background: "var(--ivory)", padding: "14px 16px", fontSize: 15, color: "var(--ink-soft)" }}>
                  You have an <strong style={{ color: "var(--ink)" }}>arrest history</strong>, including one
                  that was sealed or dismissed. It still gets disclosed, and how you present it is a legal
                  question.
                </li>
                <li style={{ border: "1px solid var(--rule)", background: "var(--ivory)", padding: "14px 16px", fontSize: 15, color: "var(--ink-soft)" }}>
                  There&apos;s an <strong style={{ color: "var(--ink)" }}>order of protection</strong>, a
                  conviction, or a pending matter anywhere in your past.
                </li>
                <li style={{ border: "1px solid var(--rule)", background: "var(--ivory)", padding: "14px 16px", fontSize: 15, color: "var(--ink-soft)" }}>
                  You&apos;ve <strong style={{ color: "var(--ink)" }}>already been denied</strong>, or you
                  want to challenge a decision. See{" "}
                  <Link href="/denied-appeal" style={linkStyle}>
                    what to do if you&apos;re denied
                  </Link>
                  .
                </li>
              </ul>
              <p style={{ marginTop: 18 }}>
                If that&apos;s you, tell us and we&apos;ll point you to{" "}
                <Link href="/partners" style={linkStyle}>
                  a New York-licensed attorney
                </Link>
                . We can still handle the paperwork beside them — but the legal judgment has to come from
                someone licensed to give it.
              </p>
            </>
          ),
        },
        {
          id: "article-rules",
          heading: "The rules that decide this",
          navLabel: "The rules",
          body: (
            <>
              <p>We didn&apos;t make these up, and you don&apos;t have to take our word for them:</p>
              <FactList facts={[FACTS.youFile, FACTS.disclosure, FACTS.discretion]} />
            </>
          ),
        },
      ]}
      faqs={FAQS}
      cta={{
        href: "/eligibility",
        label: "Check your eligibility",
        note: "Not sure which bucket you're in? Start here — it takes a couple of minutes.",
      }}
      related={[
        { label: "Attorneys we refer you to", href: "/partners" },
        { label: "If your NYC gun license is denied", href: "/denied-appeal" },
        { label: "What we charge", href: "/pricing" },
        { label: "How the process works", href: "/how-it-works" },
      ]}
    />
  )
}
