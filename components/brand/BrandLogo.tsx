import Link from "next/link"
import BrandMark from "./BrandMark"
import s from "./BrandLogo.module.css"

type Props = {
  tone?: "ink" | "light"
  size?: "md" | "sm"
  href?: string | null
  intro?: boolean
  responsiveHeader?: boolean
  className?: string
}

export default function BrandLogo({ tone = "ink", size = "md", href = "/", intro = false, responsiveHeader = false, className }: Props) {
  const inner = (
    <>
      <BrandMark size={size === "md" ? 34 : 28} />
      <span className={s.word}>
        <span className={s.wordMain}>Gun License</span>
        <span className={s.wordNyc}>NYC</span>
      </span>
    </>
  )
  const cls = `${s.logo} ${s[tone]} ${s[size]} ${intro ? s.intro : ""} ${responsiveHeader ? s.responsiveHeader : ""} ${className ?? ""}`
  return href === null
    ? <span className={cls}>{inner}</span>
    : <Link href={href} className={cls} aria-label="Gun License NYC home">{inner}</Link>
}
