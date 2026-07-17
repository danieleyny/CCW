import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "Do I Need a Lawyer for a NYC Gun License?",
  description:
    "An honest comparison of doing it yourself, hiring a document-prep service, and hiring a New York attorney for a NYC gun license — including when we're the wrong choice.",
  path: "/do-i-need-a-lawyer",
})

/**
 * The honest-comparison page. It exists to talk some readers OUT of hiring us —
 * a straightforward case genuinely doesn't need help, and an arrest history or a
 * denial genuinely needs an attorney, which we are not (FACTS.youFile). Every
 * legal claim renders from content/facts.ts; nothing here is asserted freehand.
 */

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
    a: "No. Gun License NYC is a document-preparation and case-management service. We are not attorneys, we don't represent you before the NYPD License Division, and we can't advise you on your specific legal situation. You review and submit your own application.",
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

export default function DoINeedALawyerPage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Do I need a lawyer?", path: "/do-i-need-a-lawyer" },
        ]}
      />
      <PageHero
        eyebrow="Choosing help"
        title="Do I need a lawyer for a NYC gun license?"
        subtitle="An honest answer, including the parts where the honest answer is “not us.”"
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          For most people, <strong>no</strong>. If you&apos;re over 21 with a clean record, a NYC gun
          license application is long and fussy but not a legal fight — plenty of people do it
          themselves. You need a New York-licensed attorney if you have an{" "}
          <strong>arrest history, an order of protection, a prior denial, or an appeal</strong>,
          because those call for legal advice and representation. A service like ours sits in the
          middle: we prepare your documents and manage the case, but we aren&apos;t attorneys, and
          you always review and submit your own application.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-5xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          Three ways to do this, side by side
        </h2>
        <p className="mt-3 text-text-mid">
          We&apos;d rather you pick right than pick us. Here&apos;s the real comparison.
        </p>

        <div className="mt-6 overflow-x-auto rounded-xl border border-hairline bg-card">
          <table className="w-full min-w-[46rem] caption-bottom text-left text-sm">
            <caption className="px-5 py-3 text-left text-xs text-text-low">
              Doing it yourself is a legitimate option. So is skipping us for an attorney.
            </caption>
            <thead>
              <tr className="border-b border-hairline">
                <th scope="col" className="w-40 px-5 py-3 font-display font-semibold text-text-hi">
                  <span className="sr-only">Compared on</span>
                </th>
                <th scope="col" className="px-5 py-3 font-display font-semibold text-text-hi">
                  Doing it yourself
                </th>
                <th scope="col" className="px-5 py-3 font-display font-semibold text-brass">
                  Gun License NYC
                </th>
                <th scope="col" className="px-5 py-3 font-display font-semibold text-text-hi">
                  A New York attorney
                </th>
              </tr>
            </thead>
            <tbody>
              {ROWS.map((r) => (
                <tr key={r.label} className="border-b border-hairline last:border-0 align-top">
                  <th scope="row" className="px-5 py-4 font-medium text-text-hi">
                    {r.label}
                  </th>
                  <td className="px-5 py-4 text-text-mid">{r.diy}</td>
                  <td className="px-5 py-4 text-text-mid">{r.us}</td>
                  <td className="px-5 py-4 text-text-mid">{r.attorney}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          When you should do it yourself
        </h2>
        <p className="mt-3 text-text-mid">
          If your record is clean, you&apos;re organized, and you have the evenings to spend on it,
          you can absolutely do this alone. The rules are published — we link every one of them on
          our <Link href="/resources" className="text-signal hover:underline">resources page</Link>,
          for free, whether or not you ever pay us a dollar. What you&apos;re buying from us is time
          and fewer mistakes, not access. There is no access to buy.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-6 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          When you should call an attorney instead
        </h2>
        <p className="mt-3 text-text-mid">
          Call a New York-licensed attorney — not us — if any of this is true:
        </p>
        <ul className="mt-4 space-y-2 text-text-mid">
          <li className="rounded-lg border border-hairline bg-card p-4">
            You have an <strong className="text-text-hi">arrest history</strong>, including one that
            was sealed or dismissed. It still gets disclosed, and how you present it is a legal
            question.
          </li>
          <li className="rounded-lg border border-hairline bg-card p-4">
            There&apos;s an <strong className="text-text-hi">order of protection</strong>, a
            conviction, or a pending matter anywhere in your past.
          </li>
          <li className="rounded-lg border border-hairline bg-card p-4">
            You&apos;ve <strong className="text-text-hi">already been denied</strong>, or you want to
            challenge a decision. See{" "}
            <Link href="/denied-appeal" className="text-signal hover:underline">
              what to do if you&apos;re denied
            </Link>
            .
          </li>
        </ul>
        <p className="mt-4 text-text-mid">
          If that&apos;s you, tell us and we&apos;ll point you to a New York-licensed attorney. We
          can still handle the paperwork beside them — but the legal judgment has to come from
          someone licensed to give it.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          The rules that decide this
        </h2>
        <p className="mt-3 text-text-mid">
          We didn&apos;t make these up, and you don&apos;t have to take our word for them:
        </p>
        <FactList facts={[FACTS.youFile, FACTS.disclosure, FACTS.discretion]} />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">
            Not sure which bucket you&apos;re in? Start here — it takes a couple of minutes.
          </p>
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "If your NYC gun license is denied", href: "/denied-appeal" },
          { label: "What we charge", href: "/pricing" },
          { label: "How the process works", href: "/how-it-works" },
          { label: "Common questions", href: "/faq" },
        ]}
      />
    </>
  )
}
