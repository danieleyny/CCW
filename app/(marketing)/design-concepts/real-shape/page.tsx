import styles from "./real-shape.module.css"

export const metadata = {
  title: "Design concepts — The real shape of it",
  robots: { index: false, follow: false },
}

const realities = [
  ["~6", "months", "Typical planning horizon from start to decision."],
  ["18", "hours", "Required training for a concealed-carry application."],
  ["4", "references", "For the standard NYC carry track."],
  ["1×", "each adult", "A cohabitant statement for every adult at home."],
  ["1", "interview", "Prepare for the investigator’s questions and requests."],
] as const

function HorizonBoard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.horizonBoard} ${compact ? styles.compact : ""}`}>
      <div className={styles.horizonGlow} aria-hidden="true" />
      <div className={styles.boardHeader}>
        <span>Planning realities</span>
        <strong>One case. Five things to plan around.</strong>
      </div>
      <div className={styles.horizonFacts}>
        {realities.map(([value, label, detail], index) => (
          <article className={styles.horizonFact} key={label}>
            <span className={styles.factNumber}>0{index + 1}</span>
            <p>{value}</p>
            <strong>{label}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>
    </div>
  )
}

function RealityBoard({ compact = false }: { compact?: boolean }) {
  return (
    <div className={`${styles.realityBoard} ${compact ? styles.compact : ""}`}>
      <div className={styles.boardLight} aria-hidden="true" />
      <div className={styles.realityHero}>
        <span>Plan with the whole picture</span>
        <strong>What the process asks of you.</strong>
        <p>Each item is a practical part of preparing an accurate application.</p>
      </div>
      <div className={styles.realityTiles}>
        {realities.map(([value, label, detail]) => (
          <article className={styles.realityTile} key={label}>
            <p>{value}</p>
            <strong>{label}</strong>
            <small>{detail}</small>
          </article>
        ))}
      </div>
    </div>
  )
}

function PhoneFrame({ children }: { children: React.ReactNode }) {
  return <div className={styles.phoneFrame}><div className={styles.phoneNotch} aria-hidden="true" />{children}</div>
}

export default function RealShapeConceptsPage() {
  return (
    <section className={styles.page}>
      <header className={styles.intro}>
        <p>Design study · preview only</p>
        <h1>What it actually takes.</h1>
        <span>Two code-native directions. Both are responsive, animated with CSS, and use only live site facts.</span>
      </header>

      <article className={styles.concept}>
        <div className={styles.conceptCopy}>
          <p>Concept 01</p>
          <h2>The planning horizon.</h2>
          <span>
            A quiet field of light passes behind five planning realities. On desktop it reads as one
            panoramic view; on a phone, the same facts become a swipeable sequence.
          </span>
        </div>
        <div className={styles.mockPair}>
          <figure>
            <figcaption>Desktop</figcaption>
            <HorizonBoard />
          </figure>
          <figure className={styles.phoneConcept}>
            <figcaption>Mobile</figcaption>
            <PhoneFrame><HorizonBoard compact /></PhoneFrame>
          </figure>
        </div>
      </article>

      <article className={styles.concept}>
        <div className={styles.conceptCopy}>
          <p>Concept 02</p>
          <h2>The case reality board.</h2>
          <span>
            A more editorial bento layout. The center explains the service reality; each fact is a
            tactile tile that comes forward on hover or touch. It is less sequential and more like a
            polished product overview.
          </span>
        </div>
        <div className={styles.mockPair}>
          <figure>
            <figcaption>Desktop</figcaption>
            <RealityBoard />
          </figure>
          <figure className={styles.phoneConcept}>
            <figcaption>Mobile</figcaption>
            <PhoneFrame><RealityBoard compact /></PhoneFrame>
          </figure>
        </div>
      </article>
    </section>
  )
}
