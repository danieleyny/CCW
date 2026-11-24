import type { BrandKey } from "@/config/brands"
import { cn } from "@/lib/utils"

export function BrandChip({
  brand,
  origin = brand,
  className,
}: {
  brand: BrandKey
  origin?: BrandKey
  className?: string
}) {
  const upgraded = origin === "fl" && brand === "gln"
  const label = upgraded ? "FL → GLN" : brand === "fl" ? "FL" : "GLN"
  return (
    <span
      title={upgraded ? "Upgraded from Firearm License NYC" : brand === "fl" ? "Firearm License NYC" : "Gun License NYC"}
      className={cn(
        "inline-flex shrink-0 items-center rounded-full border px-1.5 py-0.5 font-mono text-[8px] font-bold uppercase tracking-wide",
        upgraded
          ? "border-[#7592C5] bg-gradient-to-r from-[#EAF1FF] to-[#FFF4D6] text-[#173F7A]"
          : brand === "fl"
            ? "border-[#9CB7E5] bg-[#EAF1FF] text-[#174A91]"
            : "border-[#C9B36D] bg-[#FFF4D6] text-[#14254A]",
        className
      )}
    >
      {label}
    </span>
  )
}
