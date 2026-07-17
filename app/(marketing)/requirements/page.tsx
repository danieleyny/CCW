import Link from "next/link"
import { createClient } from "@/lib/supabase/server"
import { getFees } from "@/lib/fees"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "NYC Gun License Requirements",
  description:
    "What a NYC gun license actually requires — be 21, 18 hours of training, about 24 documents, and you file it yourself. In plain English, with sources.",
  path: "/requirements",
})

/**
 * The requirements OVERVIEW. Deliberately not the citation wall — the full
 * 24-document list with citations lives on /how-it-works, and the personalized
 * version lives behind /checklist. This page's job is to make the shape of the
 * thing legible in five minutes, then hand off. Every rule renders from
 * content/facts.ts.
 */

const DOCS = [
  {
    title: "Four character references",
    body: "Four people who'll vouch for you, each on a form they have to sign in front of a notary. They can't be relatives. This is the piece that depends most on other people, so it's the piece to start first.",
  },
  {
    title: "A statement from every adult at home",
    body: "Everybody 21 or older living in your home signs a notarized statement about you having a handgun there. Roommates count. Adult kids count. In-laws visiting for six months count.",
  },
  {
    title: "Three years of social media",
    body: "A list of the accounts you've had over the past three years. Not your passwords, not your posts — the accounts.",
  },
  {
    title: "Photos of your safe",
    body: "Two pictures of the safe you'll store the handgun in: one with the door open, one with it closed.",
  },
  {
    title: "Your full history, told straight",
    body: "Arrests, orders of protection, license denials, certain job separations. Sealed and dismissed arrests still get disclosed here — the instinct to leave those off is the single most dangerous instinct in this process. An omission is its own problem, separate from whatever happened.",
  },
  {
    title: "The ordinary paperwork",
    body: "Proof of who you are and where you live, your training certificate, passport photos, the application itself, and the fees. Tedious, not hard.",
  },
]

export default async function RequirementsPage() {
  const supabase = await createClient()
  const fees = await getFees(supabase)

  const FAQS = [
    {
      q: "What are the requirements for a NYC gun license?",
      a: "Four things, at the top level: you must be at least 21, you must complete 18 hours of state-approved training, you must assemble roughly 24 documents — including four notarized character references, a notarized statement from every adult in your home, a three-year social media list, and photos of your safe — and you must file the application yourself with the NYPD License Division.",
    },
    {
      q: "How old do I have to be?",
      a: "21. There's no version of this for someone younger.",
    },
    {
      q: "How much training is required?",
      a: "18 hours — 16 hours of classroom instruction plus 2 hours of live fire — with a state-approved instructor, and a written test you have to pass at 80% or better. Your certificate has to be dated within six months of when you file, so don't take the course a year ahead of everything else.",
    },
    {
      q: "Do I have to tell them about an arrest that was sealed or dismissed?",
      a: "Yes. Sealed and dismissed arrests are still disclosed on a New York firearms application. We'll never help you leave something off — the whole point of a careful application is that it's complete and true. If your history is complicated, that's a conversation for an attorney, and we'll point you to one.",
    },
    {
      q: "Do my roommates really have to sign something?",
      a: "Yes. Every adult living in your home signs a notarized statement. It surprises people, and it's a common reason applications stall — so find out who needs to sign before you start collecting anything else.",
    },
    {
      q: "What does all of this cost?",
      a: `The two government fees are the ${fees.applicationFee} NYPD application fee and the ${fees.fingerprintFee} State fingerprint fee, both paid directly to the government. Training and notarization are billed by those providers. The full breakdown is on our cost page.`,
    },
  ]

  return (
    <>
      <Breadcrumbs
        items={[{ name: "Home", path: "/" }, { name: "Requirements", path: "/requirements" }]}
      />
      <PageHero
        eyebrow="What it takes"
        title="NYC gun license requirements"
        subtitle="It's a long list, but it isn't a mystery. Here's the whole shape of it, in plain English."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          A NYC gun license comes down to four things: you must be <strong>at least 21</strong>, you
          must complete <strong>18 hours of state-approved training</strong>, you must assemble{" "}
          <strong>about 24 documents</strong> — including four notarized character references, a
          notarized statement from every adult in your home, a three-year social media list, and
          photos of your safe — and you must <strong>file the application yourself</strong> with the
          NYPD License Division. None of it is hard on its own. All of it together is why people
          stall.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          First: are you eligible?
        </h2>
        <p className="mt-3 text-text-mid">
          Before you spend a dollar on training, find out whether you can apply at all. The age rule
          is absolute. Everything else — your history, your household, your address — is worth
          understanding early, because it changes what your file looks like.
        </p>
        <FactList facts={[FACTS.age, FACTS.disclosure]} />
        <p className="mt-4 text-sm text-text-low">
          We can explain a rule. We can&apos;t tell you what your specific arrest means for your
          specific application — that&apos;s legal advice, and it takes a lawyer. If your history is
          complicated, we&apos;ll say so and point you to one.
        </p>
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">The training</h2>
        <p className="mt-3 text-text-mid">
          18 hours, a state-approved instructor, and a test. The part people miss is the clock on it:
          your certificate goes stale. Take the course too early and you take it twice.
        </p>
        <FactList facts={[FACTS.training, FACTS.trainingClock]} />
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">The documents</h2>
        <p className="mt-3 text-text-mid">
          Roughly two dozen of them. Here&apos;s what they actually are, without the form numbers:
        </p>
        <div className="mt-6 space-y-3">
          {DOCS.map((d) => (
            <div key={d.title} className="rounded-xl border border-hairline bg-card p-5">
              <h3 className="font-display font-semibold text-text-hi">{d.title}</h3>
              <p className="mt-2 text-text-mid">{d.body}</p>
            </div>
          ))}
        </div>
        <p className="mt-6 text-text-mid">
          Not every item applies to everyone — the list changes depending on your track, your
          household, and your history.{" "}
          <Link href="/checklist" className="text-signal hover:underline">
            Build your free personalized checklist
          </Link>{" "}
          to see just your list, or read{" "}
          <Link href="/how-it-works" className="text-signal hover:underline">
            how it works
          </Link>{" "}
          for the full document list with citations.
        </p>
        <FactList
          facts={[FACTS.references, FACTS.cohabitants, FACTS.socialMedia, FACTS.safe]}
        />
      </section>

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          And then you file it — you, personally
        </h2>
        <p className="mt-3 text-text-mid">
          This one isn&apos;t a technicality. The application is yours; you submit it and you sign it.
          Nobody can stand in for you at the License Division except a New York-licensed attorney.
          What we do is get the file right before it leaves your hands.
        </p>
        <FactList facts={[FACTS.youFile]} />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">
            Start where it&apos;s cheapest to start: finding out where you stand.
          </p>
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "Build your free personalized checklist", href: "/checklist" },
          { label: "What a NYC gun license costs", href: "/cost" },
          { label: "How long a NYC gun license takes", href: "/timeline" },
          { label: "How the process works, step by step", href: "/how-it-works" },
        ]}
      />
    </>
  )
}
