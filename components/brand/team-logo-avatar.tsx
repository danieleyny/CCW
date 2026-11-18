import BrandMark from "@/components/brand/BrandMark"
import { cn } from "@/lib/utils"

import styles from "./team-logo-avatar.module.css"

export function TeamLogoAvatar({
  size = "md",
  className,
}: {
  size?: "md" | "sm"
  className?: string
}) {
  return (
    <span
      className={cn(styles.root, styles[size], className)}
      data-team-logo-avatar
      data-size={size}
      aria-hidden="true"
    >
      <BrandMark />
    </span>
  )
}
