import { cn } from "@/lib/utils"

/** Engraved mono-caps label with machined bracket marks: [ SECTION ]. */
export function SectionEyebrow({
  children,
  className,
}: {
  children: React.ReactNode
  className?: string
}) {
  return (
    <div className={cn("engraved flex items-center gap-1.5 text-brass", className)}>
      <span className="text-brass/50">[</span>
      <span>{children}</span>
      <span className="text-brass/50">]</span>
    </div>
  )
}
