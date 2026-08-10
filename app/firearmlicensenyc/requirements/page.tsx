import { firearmMetadata } from "@/lib/firearm-license-site"
import { AsideCard, Handoff, PageHero, styles } from "../components"

export const metadata = firearmMetadata({ title: "NYC Firearm License Requirements & Documents", description: "Understand common NYC firearm license requirements: training, references, affidavits, fees, records, disclosures, and applicant submission.", path: "/requirements" })

const groups = [
  ["Identity and residence", "Government-issued identification, proof of citizenship or lawful status, Social Security documentation where required, and proof connecting you to your NYC residence."],
  ["Training", "Applicants pursuing a carry license generally need qualifying firearms-safety training. Renewal and other tracks may differ, so confirm the current official rule for your path."],
  ["Character references", "New carry applications commonly require four character references; premises applications and renewals can differ. References should have enough lead time to complete and notarize their statements."],
  ["Household information", "Adults living with an applicant may need to complete a cohabitant acknowledgment or affidavit. Collect accurate household details early."],
  ["History and disclosures", "Arrests, summonses, protective orders, license history, military records, employment, and other facts may require documents and explanations. Candor is essential."],
  ["Government fees", "The current main website lists a $340 NYPD application fee and an $88.25 fingerprint fee. Government charges are separate from service fees and are paid directly."],
] as const

export default function RequirementsPage() {
  return <><PageHero eyebrow="Document map" title="Know the requirements before they become delays." lead="Your exact checklist depends on license type and personal history. These are the major categories most applicants should expect to manage." />
    <section className={styles.section}><div className={`${styles.inner} ${styles.contentGrid}`}><article className={styles.prose}>
      {groups.map(([title, copy], i) => <section key={title}><h2>{String(i + 1).padStart(2, "0")}. {title}</h2><p>{copy}</p></section>)}
      <h2>Use official instructions as the authority</h2><p>Requirements can change, and NYPD retains investigative discretion. Use the official application portal and published instructions as the controlling source. This website explains the process; it does not replace official instructions or legal advice.</p>
    </article><AsideCard /></div></section><Handoff /></>
}
