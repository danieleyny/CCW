export type FilingPackGroupKey = "details" | "documents" | "forms" | "people" | "history"
export type FilingPackServiceMode = "self_guided" | "concierge"

export type FilingPackOutstandingItem = {
  label: string
  sub: string
  href: string
  destination: string
}

export type FilingPackOutstandingGroup = {
  key: FilingPackGroupKey
  label: string
  icon: "user" | "upload" | "file-signature" | "users" | "history"
  href: string
  items: FilingPackOutstandingItem[]
}

export type FilingPackReadiness = {
  ready: boolean
  groups: FilingPackOutstandingGroup[]
  percentReady: number
}

export type ReadinessUnit = FilingPackOutstandingItem & { complete: boolean }

export type FilingPackReadinessInput = {
  details: ReadinessUnit[]
  documents: ReadinessUnit[]
  forms: ReadinessUnit[]
  people: ReadinessUnit[]
  history: ReadinessUnit[]
}

const GROUPS: Array<{
  key: FilingPackGroupKey
  label: string
  icon: FilingPackOutstandingGroup["icon"]
  href: string
}> = [
  { key: "details", label: "Your details", icon: "user", href: "/portal/details" },
  { key: "documents", label: "Documents to upload", icon: "upload", href: "/portal/checklist" },
  { key: "forms", label: "Forms to sign", icon: "file-signature", href: "/portal/forms" },
  { key: "people", label: "People we contact", icon: "users", href: "/portal/people" },
  { key: "history", label: "Your history", icon: "history", href: "/portal/details#history" },
]

/** Pure calculation kept separate from database loading so edge cases stay testable. */
export function computeFilingPackReadiness(input: FilingPackReadinessInput): FilingPackReadiness {
  const units = GROUPS.flatMap((group) => input[group.key])
  const complete = units.filter((unit) => unit.complete).length
  const percentReady = units.length === 0 ? 100 : Math.round((complete / units.length) * 100)
  const groups = GROUPS.map((group) => ({
    ...group,
    items: input[group.key]
      .filter((unit) => !unit.complete)
      .map((unit) => ({
        label: unit.label,
        sub: unit.sub,
        href: unit.href,
        destination: unit.destination,
      })),
  })).filter((group) => group.items.length > 0)

  return { ready: groups.length === 0, groups, percentReady }
}

export function requirementDestination(serviceMode: FilingPackServiceMode, reqCode: string): string {
  const base = serviceMode === "concierge" ? "/portal/concierge" : "/portal/checklist"
  return `${base}#${reqCode}`
}
