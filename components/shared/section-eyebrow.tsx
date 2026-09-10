import { cn } from "@/lib/utils"

/**
 * Mono-caps section label. Restyled to the marketing v2 vocabulary — it now
 * renders the `.eyebrow` token (electric mono-caps on light, cyan on `.dark`).
 * The prop API is unchanged so every caller inherits the new look for free.
 */
export function SectionEyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("eyebrow", className)}>{children}</div>
}
