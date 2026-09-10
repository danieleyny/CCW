import Link from "next/link"

/**
 * A small fixed chip shown when a coming-soon page is being viewed through the preview
 * cookie, so a screenshot can't be mistaken for the published page. The exit link clears
 * the cookie and returns the coming-soon screen. `path` is the clean page URL.
 */
export function PartnerPreviewChip({ path }: { path: string }) {
  return (
    <div className="fixed bottom-4 right-4 z-50 flex items-center gap-2 rounded-full border border-[var(--electric)]/50 bg-[var(--paper)]/95 px-3 py-1.5 text-xs shadow-lg backdrop-blur">
      <span className="font-medium text-[var(--electric-deep)]">Preview — not live</span>
      <Link href={`${path}?preview=off`} className="text-[var(--ink-muted)] underline hover:text-[var(--ink)]">
        Exit
      </Link>
    </div>
  )
}
