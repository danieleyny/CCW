interface RelatedPostCandidate {
  slug: string
  tag: string
  date: string
  updated?: string
}

/**
 * Prefer guides in the same topic, then the freshest remaining guides. The
 * function is pure so public pages and tests use the exact same selection.
 */
export function selectRelatedPosts<T extends RelatedPostCandidate>(
  current: RelatedPostCandidate,
  posts: T[],
  limit = 3
) {
  return posts
    .filter((post) => post.slug !== current.slug)
    .toSorted((left, right) => {
      const leftTopic = left.tag === current.tag ? 1 : 0
      const rightTopic = right.tag === current.tag ? 1 : 0
      if (leftTopic !== rightTopic) return rightTopic - leftTopic
      return (right.updated ?? right.date).localeCompare(left.updated ?? left.date)
    })
    .slice(0, Math.max(0, limit))
}
