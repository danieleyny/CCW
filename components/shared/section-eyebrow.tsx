import { cn } from "@/lib/utils"

/**
 * Shared mono-caps section label. Marketing owns `.mkt2 .eyebrow`; authenticated
 * surfaces layer their quieter case-workspace treatment through
 * `.portal-v2 .section-eyebrow` without changing the component contract.
 */
export function SectionEyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return <div className={cn("section-eyebrow eyebrow", className)}>{children}</div>
}
