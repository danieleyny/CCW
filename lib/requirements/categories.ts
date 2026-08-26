/**
 * Checklist categories — now a thin adapter over the ONE registry taxonomy
 * (lib/requirements/sections), so the self-guided checklist groups by the SAME
 * sections the concierge vault and "Your application" review use. Grouping is
 * presentation, not data: the registry stays flat and `sectionFor` is the single
 * source. A req_code with no section falls into "conditional" rather than
 * vanishing — but the sections validator makes that unreachable in practice.
 *
 * Categories render as lightweight LABEL ROWS (mono label + hairline rule +
 * count), never as container boxes — the elevated cards do the separating.
 */
import { SECTIONS, sectionFor } from "@/lib/requirements/sections"

export interface RequirementCategory {
  key: string
  label: string
  /** Journey order (the fixed section order). */
  order: number
}

/** The visible checklist categories, in the fixed registry section order. */
export const CATEGORIES: RequirementCategory[] = SECTIONS.map((s, i) => ({ key: s.key, label: s.title, order: i }))

export function categoryKeyFor(reqCode: string): string {
  return sectionFor(reqCode) ?? "conditional"
}

/** Group items by section, in fixed order, skipping empty sections. */
export function groupByCategory<T extends { reqCode: string }>(
  items: T[]
): { category: RequirementCategory; items: T[] }[] {
  const buckets = new Map<string, T[]>()
  for (const item of items) {
    const key = categoryKeyFor(item.reqCode)
    ;(buckets.get(key) ?? buckets.set(key, []).get(key)!).push(item)
  }
  return CATEGORIES.filter((c) => buckets.has(c.key)).map((category) => ({
    category,
    items: buckets.get(category.key)!,
  }))
}
