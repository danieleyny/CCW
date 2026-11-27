export interface JourneyLink {
  href: string
  title: string
  description: string
}

interface JourneyLinkCandidate extends JourneyLink {
  keywords: readonly string[]
}

const JOURNEY_LINKS: readonly JourneyLinkCandidate[] = [
  {
    href: "/requirements",
    title: "See the current requirements",
    description: "Review the documents and conditions that apply before filing.",
    keywords: ["requirement", "document", "identity", "residence", "address", "reference", "affidavit", "disclosure", "storage", "safe"],
  },
  {
    href: "/checklist",
    title: "Build your free checklist",
    description: "Turn the general requirements into a checklist for your situation.",
    keywords: ["document", "checklist", "prepare", "upload", "proof", "reference", "affidavit", "disclosure", "certificate", "record"],
  },
  {
    href: "/how-it-works",
    title: "See how the process works",
    description: "Understand the stages from eligibility through the applicant's own filing.",
    keywords: ["process", "apply", "application", "filing", "submit", "portal", "interview", "investigation"],
  },
  {
    href: "/premises-vs-carry",
    title: "Compare license paths",
    description: "Compare premises and concealed-carry paths before choosing one.",
    keywords: ["premises", "carry", "concealed", "license type", "which license", "path"],
  },
  {
    href: "/non-resident-business",
    title: "Review the non-resident path",
    description: "See how the published process differs for non-NYC residents.",
    keywords: ["nonresident", "non-resident", "out of state", "out-of-state", "special carry", "business nexus"],
  },
  {
    href: "/instructors",
    title: "Find a training instructor",
    description: "Browse instructors for the required concealed-carry course.",
    keywords: ["training", "course", "ccia", "classroom", "live-fire", "instructor", "certificate"],
  },
  {
    href: "/timeline",
    title: "Understand the timeline",
    description: "See the major stages and where waiting periods can occur.",
    keywords: ["timeline", "timing", "how long", "waiting", "delay", "interview", "investigation", "appointment"],
  },
  {
    href: "/do-i-need-a-lawyer",
    title: "Know when legal help matters",
    description: "Understand the line between document preparation and legal representation.",
    keywords: ["attorney", "lawyer", "legal", "arrest", "sealed", "dismissed", "denial", "appeal", "disqualifier"],
  },
  {
    href: "/pricing",
    title: "Compare service options",
    description: "See what each service level includes before you choose.",
    keywords: ["service", "pricing", "price", "cost", "diy", "concierge", "membership"],
  },
  {
    href: "/renewal",
    title: "Review renewal requirements",
    description: "See the current renewal path and the records to keep current.",
    keywords: ["renew", "renewal", "recertification", "expires", "expiration"],
  },
]

const DEFAULT_LINKS = ["/requirements", "/checklist", "/how-it-works"] as const

function normalize(value: string) {
  return value
    .toLowerCase()
    .replace(/[’']/g, "")
    .replace(/[^a-z0-9-]+/g, " ")
    .replace(/\s+/g, " ")
    .trim()
}

/**
 * Select useful service pages from the article's actual subject. This keeps the
 * public guide network contextual rather than attaching the same commercial
 * links to every article solely for search engines.
 */
export function selectJourneyLinks(input: {
  title: string
  description: string
  sectionTitles?: readonly string[]
}, limit = 3): JourneyLink[] {
  const haystack = normalize([input.title, input.description, ...(input.sectionTitles ?? [])].join(" "))
  const scored = JOURNEY_LINKS.map((candidate, index) => ({
    candidate,
    index,
    score: candidate.keywords.reduce((total, keyword) => total + (haystack.includes(normalize(keyword)) ? 1 : 0), 0),
  }))
    .filter(({ score }) => score > 0)
    .toSorted((left, right) => right.score - left.score || left.index - right.index)

  const selected = scored.map(({ candidate }) => candidate)
  for (const href of DEFAULT_LINKS) {
    if (selected.length >= limit) break
    const fallback = JOURNEY_LINKS.find((candidate) => candidate.href === href)
    if (fallback && !selected.some((candidate) => candidate.href === href)) selected.push(fallback)
  }

  return selected.slice(0, Math.max(0, limit)).map(({ href, title, description }) => ({ href, title, description }))
}
