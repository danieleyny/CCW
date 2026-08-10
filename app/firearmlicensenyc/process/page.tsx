import { firearmMetadata } from "@/lib/firearm-license-site"
import { AsideCard, Handoff, PageHero, styles } from "../components"

export const metadata = firearmMetadata({ title: "NYC Firearm License Application Process", description: "A step-by-step guide to the NYC firearm license application process, from eligibility and training through applicant submission and follow-up.", path: "/process" })

export default function ProcessPage() {
  return <><PageHero eyebrow="The application journey" title="The NYC firearm license process, made legible." lead="There is no responsible shortcut through a discretionary licensing process. There is, however, a much better way to organize it." />
    <section className={`${styles.section} ${styles.sectionWhite}`}><div className={`${styles.inner} ${styles.contentGrid}`}><article className={styles.prose}>
      <h2>1. Define the correct application path</h2><p>Begin by identifying the license category that fits your circumstances. NYC applicants may be looking at concealed carry, premises residence, renewal, retired-law-enforcement, or special-carry considerations. The requirements are not identical.</p>
      <h2>2. Review eligibility before spending</h2><p>Age, residence, criminal and court history, protective orders, mental-health history, driving history, and other facts can affect the application. A screening is not a legal opinion or an outcome prediction; it is a way to identify what deserves attention early.</p>
      <h2>3. Sequence training and documents</h2><p>For a new carry application, training is a major workstream. References, cohabitant affidavits, identity and residence records, photographs, and other supporting documents need their own lead time. Organizing them as a coordinated case reduces avoidable rework.</p>
      <h2>4. Complete the application candidly</h2><p>Accuracy and completeness matter. Sealed or dismissed arrests may still need to be disclosed in the licensing process. Never shape an application around hiding a fact. If a personal history question requires legal judgment, consult a New York-licensed attorney.</p>
      <h2>5. Review, submit, and retain control</h2><p>You remain the applicant. You review and submit your own application through the official NYPD system and retain control of your credentials. A preparation service can help organize the work, but cannot represent you before the License Division.</p>
      <h2>6. Stay ready after submission</h2><p>Fingerprinting, interview preparation, supplemental requests, decision communications, and eventual renewal all benefit from the same organized record. Keep every submitted version and every official communication.</p>
    </article><AsideCard /></div></section><Handoff /></>
}
