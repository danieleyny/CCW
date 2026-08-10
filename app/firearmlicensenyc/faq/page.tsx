import { firearmMetadata } from "@/lib/firearm-license-site"
import { Handoff, PageHero, styles } from "../components"

export const metadata = firearmMetadata({ title: "NYC Firearm License Questions & Answers", description: "Clear answers about NYC firearm license timing, costs, training, references, disclosures, legal help, and application submission.", path: "/faq" })

const faqs = [
  ["How long does a NYC firearm license application take?", "Timing varies by case and agency workload. No private service can control or accelerate the NYPD process. Plan for a long process and keep all time-sensitive records organized."],
  ["Can a consultant submit my application for me?", "You should review and submit your own application and keep control of your official portal credentials. A private service may help prepare and organize documents, but cannot represent you before the NYPD License Division."],
  ["How much are the government fees?", "The current main website lists a $340 NYPD application fee and an $88.25 fingerprint fee. These charges are separate from support, training, and notarization costs and may change."],
  ["Do I need firearm training before I apply?", "Carry applicants generally need qualifying training. The exact requirement depends on the application type and current rules, so confirm the official instructions for your track."],
  ["How many character references are required?", "New carry applications commonly require four references. Premises and renewal tracks can differ. A personalized checklist should follow your actual license type."],
  ["Do sealed or dismissed arrests need to be disclosed?", "They may still need to be disclosed in the licensing process. Candor is essential. If you need advice about how the law applies to your specific history, consult a New York-licensed attorney."],
  ["Can anyone promise that I will be approved?", "No. NYPD retains full investigative discretion. Be wary of any promise of approval, special access, or accelerated treatment."],
  ["What happens when I continue to the main website?", "You can check eligibility, compare the same support options, and create a secure client workspace. Your pricing and service options are the same as those shown here."],
] as const

export default function FaqPage() {
  const schema = { "@context": "https://schema.org", "@type": "FAQPage", mainEntity: faqs.map(([q, a]) => ({ "@type": "Question", name: q, acceptedAnswer: { "@type": "Answer", text: a } })) }
  return <><script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }} /><PageHero eyebrow="Common questions" title="Answers without false promises." lead="Clear information is part of a better application experience. These answers describe the process—not legal advice or an outcome prediction." /><section className={`${styles.section} ${styles.sectionWhite}`}><div className={styles.inner}><div className={styles.faq}>{faqs.map(([q, a]) => <details key={q}><summary>{q}</summary><p>{a}</p></details>)}</div></div></section><Handoff /></>
}
