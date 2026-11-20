import "server-only"

export interface DuplicateCandidate {
  id: string
  clientId: string
  clientEmail: string | null
  updatedAt: string
}

export interface DuplicateCaseMeta {
  duplicate: boolean
  hidden: boolean
  label: string | null
}

/**
 * Shared duplicate visibility used by Pipeline and every cross-case worklist.
 * The newest case remains visible; older cases for the same email/client are
 * hidden unless staff explicitly asks to see hidden rows.
 */
export function duplicateCaseMetadata(cases: DuplicateCandidate[]): Map<string, DuplicateCaseMeta> {
  const clusters = new Map<string, DuplicateCandidate[]>()
  for (const c of cases) {
    const email = c.clientEmail?.trim().toLowerCase()
    const key = email ? `email:${email}` : `client:${c.clientId}`
    const rows = clusters.get(key) ?? []
    rows.push(c)
    clusters.set(key, rows)
  }

  const result = new Map<string, DuplicateCaseMeta>()
  for (const rows of clusters.values()) {
    rows.sort((a, b) => b.updatedAt.localeCompare(a.updatedAt))
    rows.forEach((c, index) => result.set(c.id, {
      duplicate: rows.length > 1,
      hidden: rows.length > 1 && index > 0,
      label: rows.length > 1 ? `${index + 1} of ${rows.length} cases for this client` : null,
    }))
  }
  return result
}
