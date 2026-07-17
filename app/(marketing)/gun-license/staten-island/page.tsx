import Link from "next/link"
import { FACTS } from "@/content/facts"
import { buildMetadata } from "@/lib/seo"
import { Button } from "@/components/ui/button"
import { PageHero } from "@/components/marketing/page-hero"
import { Breadcrumbs } from "@/components/marketing/breadcrumbs"
import { DirectAnswer, FactList, FaqBlock, RelatedLinks } from "@/components/marketing/page-blocks"

export const metadata = buildMetadata({
  title: "Gun License in Staten Island",
  description:
    "Applying for a gun license from Staten Island: the same citywide NYPD rules, and an honest look at which steps actually require you to travel and which don't.",
  path: "/gun-license/staten-island",
})

/** Staten Island's angle: distance. Which steps genuinely need a trip, and which don't. */

const FAQS = [
  {
    q: "Is the gun license process different on Staten Island?",
    a: "No. Handgun licensing is centralized at the NYPD License Division and the rules are identical across all five boroughs. Staten Island applicants complete the same 18 hours of training, the same four notarized references, the same household affidavits, and the same disclosures, and are held to the same standard as applicants anywhere else in the city.",
  },
  {
    q: "Am I at a disadvantage applying from Staten Island?",
    a: "Not on the merits. Because the process is centralized, there is one standard and one set of rules for the whole city — being further from the middle of it doesn't change what's asked of you or how your file is judged. Distance is a travel question, not a licensing question, and no borough gets a faster queue.",
  },
  {
    q: "Which parts of this actually require me to leave Staten Island?",
    a: "Fewer than people expect. The live-fire portion of your training happens wherever your state-approved instructor runs it. Notarization means getting each signer in front of a notary — but a notary is a notary anywhere, and your references can use their own. The NYPD schedules your interview and fingerprinting, so that appointment is on their calendar, not yours.",
  },
  {
    q: "Can I do the whole thing without ever going in person?",
    a: "No, and be skeptical of anyone who says otherwise. Two hours of live-fire cannot happen over a laptop, notarization requires the signer to appear before a notary, and the License Division brings you in for an interview and takes your fingerprints. What you can do from your kitchen table is the assembly — the forms, the disclosures, the social media list, the safe photographs, and the chasing.",
  },
]

export default function StatenIslandGunLicensePage() {
  return (
    <>
      <Breadcrumbs
        items={[
          { name: "Home", path: "/" },
          { name: "Gun license by borough", path: "/gun-license/manhattan" },
          { name: "Staten Island", path: "/gun-license/staten-island" },
        ]}
      />
      <PageHero
        eyebrow="Staten Island"
        title="Gun license in Staten Island"
        subtitle="The furthest borough from the middle of everything — and the rules don't care even slightly."
      />

      <section className="mx-auto max-w-3xl px-4 pb-4 sm:px-6">
        <DirectAnswer>
          Staten Island applicants apply under the same NYPD rules as the rest of New York City, and
          the distance from Staten Island to the rest of the city changes{" "}
          <strong>none of them</strong>. Handgun licensing is centralized: one License Division, one
          standard, one roughly six-month wait from a complete submission, no matter which borough
          your address is in. So the honest Staten Island question isn&apos;t whether you&apos;re at a
          disadvantage — you aren&apos;t — it&apos;s which steps genuinely require you to be somewhere
          in person. The answer is fewer than most people assume, and none of them are negotiable.
        </DirectAnswer>
      </section>

      <section className="mx-auto max-w-3xl px-4 py-10 sm:px-6">
        <h2 className="font-display text-2xl font-semibold tracking-tight">
          What actually requires a trip
        </h2>
        <p className="mt-3 text-text-mid">
          Three things in this process put a body in a room, and it&apos;s worth knowing which three
          before you plan around them. The first is training: 16 classroom hours plus 2 hours of
          live-fire with a state-approved instructor. Live-fire is exactly what it sounds like and no
          amount of internet makes it happen at home — so pick your instructor on their approval and
          their schedule, and ask early where the range portion actually takes place. The second is
          notarization. Your four character references and the affidavit from every adult in your home
          all need a notary, which sounds like a logistics nightmare from here and mostly isn&apos;t:
          each signer can use a notary near them, so this is their errand, not your ferry ride.
        </p>
        <p className="mt-3 text-text-mid">
          The third is the NYPD&apos;s own step. The License Division brings you in for an interview
          and takes your fingerprints on a schedule they set. That appointment is going to be wherever
          and whenever they say, and there is nothing on this page or any other that changes it.
        </p>
        <p className="mt-3 text-text-mid">
          Everything else — the forms, the disclosures, the three-year social media list, the safe
          photographs, the endless polite chasing of people who said they&apos;d get to it — is desk
          work you do from home. That&apos;s the bulk of the effort, and geography has no opinion about
          it. The rules, with sources:
        </p>
        <FactList
          facts={[FACTS.training, FACTS.references, FACTS.socialMedia, FACTS.timeline, FACTS.youFile]}
        />
      </section>

      <FaqBlock faqs={FAQS} />

      <section className="border-t border-hairline">
        <div className="mx-auto max-w-3xl px-4 py-12 text-center sm:px-6">
          <p className="mb-5 text-text-mid">
            No travel required for this part. See where you stand first.
          </p>
          <Button asChild size="lg">
            <Link href="/eligibility">Check your eligibility</Link>
          </Button>
        </div>
      </section>

      <RelatedLinks
        links={[
          { label: "What a NYC gun license costs", href: "/cost" },
          { label: "Everything a NYC gun license requires", href: "/requirements" },
          { label: "How long a NYC gun license takes", href: "/timeline" },
          { label: "Gun license in Brooklyn", href: "/gun-license/brooklyn" },
          { label: "Gun license in Manhattan", href: "/gun-license/manhattan" },
        ]}
      />
    </>
  )
}
