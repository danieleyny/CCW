import { notFound } from "next/navigation"
import { firearmMetadata } from "@/lib/firearm-license-site"
import { AsideCard, Handoff, PageHero, styles } from "../../components"

const boroughs = {
  manhattan: { name: "Manhattan", detail: "from Lower Manhattan to Inwood" },
  brooklyn: { name: "Brooklyn", detail: "from Bay Ridge to Williamsburg" },
  queens: { name: "Queens", detail: "from Astoria to the Rockaways" },
  bronx: { name: "The Bronx", detail: "from Riverdale to Throggs Neck" },
  "staten-island": { name: "Staten Island", detail: "from St. George to Tottenville" },
} as const

type BoroughKey = keyof typeof boroughs
export function generateStaticParams() { return Object.keys(boroughs).map((borough) => ({ borough })) }

export async function generateMetadata({ params }: { params: Promise<{ borough: string }> }) {
  const { borough } = await params
  const entry = boroughs[borough as BoroughKey]
  if (!entry) return {}
  return firearmMetadata({ title: `${entry.name} NYC Firearm License Application Help`, description: `Firearm license application guidance for ${entry.name} residents: NYC requirements, training, documents, fees, and the application process.`, path: `/boroughs/${borough}` })
}

export default async function BoroughPage({ params }: { params: Promise<{ borough: string }> }) {
  const { borough } = await params
  const entry = boroughs[borough as BoroughKey]
  if (!entry) notFound()
  return <><PageHero eyebrow={`${entry.name} applicant guide`} title={`Firearm license guidance for ${entry.name}.`} lead={`A local starting point for applicants ${entry.detail}—connected to the same citywide NYPD licensing process.`} />
    <section className={styles.section}><div className={`${styles.inner} ${styles.contentGrid}`}><article className={styles.prose}>
      <h2>One citywide authority, one organized path</h2><p>Wherever you live in {entry.name}, NYC firearm license applications are governed through the New York City licensing process. Your borough shapes your daily logistics, but not the need for a complete, candid, and carefully organized application.</p>
      <h2>What {entry.name} applicants should plan for</h2><ul><li>Choosing the correct license category before beginning.</li><li>Scheduling qualifying training when required.</li><li>Gathering identity, residence, household, and employment records.</li><li>Coordinating character references and notarization where applicable.</li><li>Preparing complete disclosures and supporting documents.</li><li>Reviewing and submitting the application through the official portal.</li></ul>
      <h2>Start before the bottlenecks</h2><p>Training schedules, reference turnaround, document retrieval, and personal-history records can take time. An early checklist helps surface these dependencies before they become last-minute problems.</p>
      <h2>Keep the promise realistic</h2><p>No consultant can represent you before the License Division, control the agency timeline, or promise approval. The useful work is preparation: a visible checklist, complete records, careful review, and an organized case you remain in control of.</p>
    </article><AsideCard /></div></section><Handoff /></>
}
