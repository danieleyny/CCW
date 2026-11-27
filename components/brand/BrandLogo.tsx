"use client"

import Link from "next/link"
import BrandMark from "./BrandMark"
import s from "./BrandLogo.module.css"
import { usePlayOncePerLoad } from "@/components/marketing/shared/usePlayOncePerLoad"
import { useBrand } from "@/components/brand/brand-provider"

type Props = {
  tone?: "ink" | "light"
  size?: "md" | "sm"
  href?: string | null
  motion?: "live" | "none"
  responsiveHeader?: boolean
  className?: string
  accessibleLabel?: string | null
}

export default function BrandLogo({ tone = "ink", size = "md", href = "/", motion = "none", responsiveHeader = false, className, accessibleLabel }: Props) {
  const { brand } = useBrand()
  const withIntro = usePlayOncePerLoad("logo", motion === "live")
  const motionClass = motion === "live" ? `${s.live} ${withIntro ? s.withIntro : s.noIntro}` : ""
  const inner = (
    <>
      <BrandMark size={size === "md" ? 34 : 28} />
      <span className={s.word}>
        <span className={s.wordMain}>{brand.key === "fl" ? "Firearm License" : "Gun License"}</span>
        <span className={s.wordNyc}>NYC</span>
      </span>
    </>
  )
  const cls = `${s.logo} ${s[tone]} ${s[size]} ${motionClass} ${responsiveHeader ? s.responsiveHeader : ""} ${className ?? ""}`
  return href === null
    ? <span className={cls}>{inner}</span>
    : <Link href={href} className={cls} aria-label={accessibleLabel ?? undefined}>{inner}</Link>
}
