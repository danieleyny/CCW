"use client"

import Link from "next/link"
import { useState } from "react"
import styles from "./ColorwaySwitcher.module.css"
import type { ThemeKey } from "./ThemeScope"

const entries: { label: string; href: string; key: ThemeKey }[] = [
  { label: "Current", href: "/", key: "v0" },
  { label: "V1", href: "/V1", key: "v1" },
  { label: "V2", href: "/V2", key: "v2" },
  { label: "V3", href: "/V3", key: "v3" },
  { label: "V4", href: "/V4", key: "v4" },
]

export default function ColorwaySwitcher({ active }: { active: ThemeKey }) {
  const [expanded, setExpanded] = useState(false)
  const current = entries.find((entry) => entry.key === active)?.label ?? "Current"
  return <nav className={`${styles.switcher} colorway-switcher`} data-expanded={expanded} aria-label="Compare colorways">
    <button type="button" className={styles.toggle} aria-expanded={expanded} aria-label={`Choose colorway. Current: ${current}`} onClick={() => setExpanded((value) => !value)}>{current === "Current" ? "●" : current}</button>
    <div className={styles.links}>
      {entries.map((entry) => <Link key={entry.key} href={entry.href} className={`${styles.link} ${entry.key === active ? styles.active : ""}`} aria-current={entry.key === active ? "page" : undefined} onClick={() => setExpanded(false)}>{entry.label}</Link>)}
    </div>
  </nav>
}
