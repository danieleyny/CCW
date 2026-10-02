import Link from "next/link"

type Borough = {
  id: "manhattan" | "brooklyn" | "queens" | "bronx" | "staten-island"
  name: string
  shortName: string
  href: string
  labelX: number
  labelY: number
  path: string
}

/**
 * Borough outlines are simplified from NYC Department of City Planning's
 * Borough Boundaries dataset (water excluded), release 26b. They are inlined
 * so the map needs no runtime request, map SDK, cookie, or API key.
 * Source: https://data.cityofnewyork.us/d/gthc-hcne
 */
const BOROUGHS: Borough[] = [
  {
    id: "manhattan",
    name: "Manhattan",
    shortName: "Manhattan",
    href: "/gun-license/manhattan",
    labelX: 375,
    labelY: 202,
    path: "M423.7,186.6L429.9,197L410,207.6L423.1,185.8ZM418.6,96.5L434.6,103.7L410.1,146.3L415.7,192.5L373.6,253.5L368.3,291.5L329.9,304.6L338,235.5L418.6,96.5Z",
  },
  {
    id: "brooklyn",
    name: "Brooklyn",
    shortName: "Brooklyn",
    href: "/gun-license/brooklyn",
    labelX: 385,
    labelY: 374,
    path: "M476.3,402L465.3,400.2L478.5,389.2L476.8,401.9ZM390.6,259.1L415.8,272.8L420.4,282.5L411.7,292.1L421.4,284.7L448.5,325.7L476.6,311.2L487.8,371.1L477.7,375.6L465.7,358.3L477,377.6L454,364.5L467.9,380.2L461.3,390L449.5,396L427.5,385.5L455.3,408.9L444.9,415.8L436.2,401.9L443.4,415.6L431.3,417.7L430.8,404.9L425.5,413.3L436,420.5L461,415.9L465.3,445.7L449.5,449.7L446,436.9L433.5,438.7L429.3,423.3L414,417.8L430.5,435.4L420.1,439.2L412.4,428.3L413.7,437.8L433.5,443.7L391.5,442.4L413.9,450.4L342.9,458.1L333.5,445.8L359,443.8L344.8,442.3L346.6,430L309,411.5L306.2,375.9L329.5,351.1L345.5,346.8L346.2,338.3L328.1,346.3L325.7,338.3L328.5,346.2L334.7,341.3L325.7,328.9L350.4,299.9L375.5,304.4L370.4,296L377.5,301L390.6,259.1Z",
  },
  {
    id: "queens",
    name: "Queens",
    shortName: "Queens",
    href: "/gun-license/queens",
    labelX: 542,
    labelY: 292,
    path: "M578.3,405.7L599.2,408.3L607,428.8L531.5,441.8L404.3,490.7L405.7,475.2L418.8,467.5L467.4,458.9L558.5,418.6L555.2,428.6L566.4,411.1L563.7,425L576.9,424.9L570.8,408.5L578.3,405.7ZM521.6,376.6L530.2,412.5L523.8,428.6L511.8,429.2L523.5,422.4L524.4,408L511,405.5L511.6,377.2L520.8,375.5ZM524.5,186.4L552.2,200.8L568.1,191.8L600.3,238.6L589.9,225.7L593.9,208L643.7,245.4L637.3,272.3L614.7,279L619.8,361.3L603.6,367.3L603.3,381.4L590.2,366.3L596.4,380.8L574.8,399.2L565.5,390.3L564.1,406.4L553.6,413.5L544.2,408.4L561.5,387L546.9,386L554.2,382.1L523.8,364.9L523.3,351.8L533.7,351.2L521.5,351.9L521.9,366L514.8,352.2L510.5,366L505.3,349.3L509.1,369L495.5,370.6L481.8,354L489.3,347.4L476.6,311.2L448.5,325.7L423.1,294L424.6,277.2L399.1,261L406.4,254.6L382.4,259.5L408.6,214.7L435.1,198.2L455.5,218.7L477.1,202.4L472.4,210.1L489.9,220.2L482.2,226.6L494.3,235.2L505.9,227.5L485.7,205.2L491.3,194.6L507.1,189.4L512.1,201.1L524.5,186.4Z",
  },
  {
    id: "bronx",
    name: "The Bronx",
    shortName: "Bronx",
    href: "/gun-license/bronx",
    labelX: 487,
    labelY: 126,
    path: "M456.1,189.1L473.4,203.1L455.9,202.4L456.2,189.1ZM555.8,118.7L562.2,145L555.7,118.6ZM472.1,65L485.5,69.6L493.9,58L506.6,77.2L552,89.8L542,106.9L535.8,104L542.3,110.5L552.1,94.2L560.8,95.7L544.7,131.1L540.2,115.4L529.9,113.6L533.3,132.8L526.8,135.6L531,159.2L554.3,182.3L528.8,171.4L507.6,180.3L505.3,141.2L505,164.2L498.8,175.1L489.6,170.8L496.9,181.8L468.5,168.7L476.9,179.7L471.4,186.6L449.9,179.6L433.3,191.6L417.4,184.4L411.9,146.3L438.3,98.7L420.1,95L433.5,54.1L470.8,64.6Z",
  },
  {
    id: "staten-island",
    name: "Staten Island",
    shortName: "Staten I.",
    href: "/gun-license/staten-island",
    labelX: 186,
    labelY: 450,
    path: "M262.8,365.7L273.3,369.5L271.5,390.9L292.8,422.6L271.6,447.9L208.1,505.4L204.6,498.3L217.5,490.8L212.3,484.9L149.8,528.1L95.3,543.4L89.5,530.6L105.2,516.2L97,489.2L133,471.3L150.4,378.5L165,369.3L192.2,378.8L262.4,365.7Z",
  },
]

const APPLICANT_PATHS = [
  {
    eyebrow: "FIRST NYC APPLICATION",
    title: "Start with eligibility",
    description: "See the first questions that shape a new concealed-carry case.",
    href: "/eligibility",
  },
  {
    eyebrow: "NON-RESIDENT OR NYC BUSINESS",
    title: "Find the correct NYC track",
    description: "Review the distinct New York City paths that may apply to your situation.",
    href: "/non-resident-business",
  },
  {
    eyebrow: "CHOOSING A LICENSE TYPE",
    title: "Premises or concealed carry",
    description: "Compare the practical differences before you organize the case.",
    href: "/premises-vs-carry",
  },
  {
    eyebrow: "RETURNING LICENSE HOLDER",
    title: "Plan a renewal",
    description: "See the workflow and timing checkpoints for a returning license holder.",
    href: "/renewal",
  },
  {
    eyebrow: "RETIRED LAW ENFORCEMENT",
    title: "Review the separate route",
    description: "Start with the distinct questions for former law-enforcement applicants.",
    href: "/retired-leo",
  },
]

const NYPD_LICENSING_URL =
  "https://www.nyc.gov/site/nypd/services/vehicles-property/firearms-licensing.page"
const NYS_CARRY_RULES_URL =
  "https://gunsafety.ny.gov/frequently-asked-questions-new-concealed-carry-law"

export function NycServiceMap() {
  return (
    <div className="nyc-map-console">
      <div className="nyc-map-toolbar">
        <span>CONCIERGE COVERAGE / NEW YORK CITY</span>
        <span className="nyc-map-status"><i aria-hidden="true" /> SERVICE AREA · 05 BOROUGHS</span>
      </div>

      <div className="nyc-map-layout">
        <div className="nyc-map-stage">
          <div className="nyc-map-grid" aria-hidden="true" />
          <div className="nyc-map-sight" aria-hidden="true"><i /><i /></div>
          <div className="nyc-map-readout" aria-hidden="true">
            <span>40.7128° N</span><span>74.0060° W</span>
          </div>

          <svg className="nyc-borough-map" viewBox="0 0 700 600" role="img" aria-labelledby="nyc-map-title nyc-map-desc">
            <title id="nyc-map-title">Gun License NYC service area across New York City&apos;s five boroughs</title>
            <desc id="nyc-map-desc">A precise map showing service coverage in Manhattan, Brooklyn, Queens, the Bronx, and Staten Island.</desc>
            <defs>
              <linearGradient id="borough-manhattan" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--cyan)" /><stop offset="1" stopColor="var(--blue)" />
              </linearGradient>
              <linearGradient id="borough-brooklyn" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--blue)" /><stop offset="1" stopColor="var(--violet)" />
              </linearGradient>
              <linearGradient id="borough-queens" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--violet)" /><stop offset="1" stopColor="var(--magenta)" />
              </linearGradient>
              <linearGradient id="borough-bronx" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--magenta)" /><stop offset="1" stopColor="var(--tangerine)" />
              </linearGradient>
              <linearGradient id="borough-staten-island" x1="0" y1="0" x2="1" y2="1">
                <stop offset="0" stopColor="var(--cyan)" /><stop offset="1" stopColor="var(--violet)" />
              </linearGradient>
            </defs>

            <path className="nyc-map-waterline" d="M64 345C176 319 246 319 331 339C421 360 527 347 666 286" />
            <path className="nyc-map-waterline nyc-map-waterline-two" d="M96 184C207 205 294 186 377 137C449 94 530 92 640 126" />

            {BOROUGHS.map((borough, index) => (
              <g className={`nyc-borough borough--${borough.id}`} key={borough.id}>
                <path className="nyc-borough-shape" d={borough.path} />
                <g className="nyc-borough-label" aria-hidden="true" transform={`translate(${borough.labelX} ${borough.labelY})`}>
                  <circle r="17" />
                  <text y="3">{String(index + 1).padStart(2, "0")}</text>
                </g>
              </g>
            ))}

            <g className="nyc-map-origin" aria-hidden="true" transform="translate(405 246)">
              <circle r="30" /><circle r="17" /><circle r="3" />
              <path d="M0-40V-23M0 23V40M-40 0H-23M23 0H40" />
            </g>
          </svg>

          <div className="nyc-borough-guides" aria-label="New York City borough licensing guides">
            {BOROUGHS.map((borough, index) => (
              <Link
                className={`nyc-borough-guide borough-guide--${borough.id}`}
                href={borough.href}
                key={borough.id}
              >
                <span>{String(index + 1).padStart(2, "0")}</span>
                <strong>{borough.shortName}</strong>
                <small>Guide <b aria-hidden="true">↗</b></small>
              </Link>
            ))}
          </div>
        </div>

        <article className="nyc-map-detail nyc-path-panel">
          <div className="nyc-map-detail-head">
            <div>
              <p className="nyc-map-kicker">APPLICANT PATH NAVIGATOR</p>
              <h3>What changes is your case—not your borough.</h3>
            </div>
            <span className="nyc-service-badge"><i aria-hidden="true" /> NYC only</span>
          </div>

          <p className="nyc-map-focus">
            The licensing authority and citywide standard remain the same. Choose the situation
            that actually changes the route, requirements, or next step.
          </p>

          <dl className="nyc-map-facts">
            <div><dt>Service area</dt><dd>All five boroughs</dd></div>
            <div><dt>Licensing authority</dt><dd>NYPD License Division</dd></div>
            <div><dt>Final submission</dt><dd>Completed by you</dd></div>
          </dl>

          <nav className="nyc-path-list" aria-label="Choose the applicant situation that fits you">
            {APPLICANT_PATHS.map((path, index) => (
              <Link href={path.href} key={path.href}>
                <span>{String(index + 1).padStart(2, "0")}</span>
                <p>
                  <small>{path.eyebrow}</small>
                  <strong>{path.title}</strong>
                  <em>{path.description}</em>
                </p>
                <b aria-hidden="true">→</b>
              </Link>
            ))}
          </nav>

          <aside className="nyc-carry-note">
            <span className="nyc-carry-mark" aria-hidden="true"><i /><i /></span>
            <div>
              <strong>Travel and carry rules require a separate check.</strong>
              <p>
                New York&apos;s location restrictions and another state&apos;s recognition rules can
                change. Use current official sources before carrying or traveling.
              </p>
              <div className="nyc-carry-links">
                <Link href="/reciprocity">Open our reciprocity guide <span aria-hidden="true">→</span></Link>
                <a href={NYS_CARRY_RULES_URL} target="_blank" rel="noreferrer">
                  Current New York guidance <span aria-hidden="true">↗</span>
                </a>
              </div>
            </div>
          </aside>

          <div className="nyc-map-actions">
            <Link className="button button-light" href="/eligibility">
              Check your path <span className="button-arrow" aria-hidden="true">→</span>
            </Link>
            <a className="nyc-official-link" href={NYPD_LICENSING_URL} target="_blank" rel="noreferrer">
              Official NYPD licensing <span aria-hidden="true">↗</span>
            </a>
          </div>
        </article>
      </div>

      <div className="nyc-map-boundary">
        <span>FIVE BOROUGHS · ONE ORGANIZED CASE</span><i aria-hidden="true" /><strong>NYPD DECIDES · YOU SUBMIT</strong>
      </div>
    </div>
  )
}
