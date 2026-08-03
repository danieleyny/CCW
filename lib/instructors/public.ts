/**
 * Presentation helpers for the PUBLIC instructor directory (no `server-only` so
 * both server pages and any client bit can share them). Pure formatting — no PII,
 * no data access.
 */

/** Human label for the `class_format` enum shown on public cards. */
export function classFormatLabel(format: string | null): string | null {
  switch (format) {
    case "private_1on1":
      return "Private one-on-one"
    case "small_group":
      return "Small-group classes"
    case "both":
      return "Private or small-group"
    default:
      return null
  }
}
