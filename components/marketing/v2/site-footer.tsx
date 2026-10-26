"use client"

import Image from "next/image"
import Link from "next/link"
import { usePathname } from "next/navigation"
import styles from "./site-footer.module.css"

export const FOOTER_DISCLAIMER = "Document preparation and case management. Not a law firm, and not affiliated with the NYPD."

const COLUMNS = [
  { title: "Get started", links: [["Check eligibility", "/eligibility"], ["How it works", "/how-it-works"], ["Pricing", "/pricing"]] },
  { title: "Resources", links: [["Free checklist", "/checklist"], ["Official sources", "/resources"], ["FAQ", "/faq"]] },
  { title: "Account", links: [["Sign in", "/auth/login"], ["Contact", "/contact"]] },
] as const

export function SiteFooter({ embedded = false }: { embedded?: boolean }) {
  const pathname = usePathname()
  if (!embedded && pathname === "/") return null

  return (
    <footer className={styles.footer} data-embedded={embedded} id="portal">
      <div className={styles.grid}>
        <div className={styles.brandCol}>
          <Link href="/" className={styles.brand} aria-label="Gun License NYC home">
            <Image src="/logo-dark.png" alt="" width={22} height={26} className={styles.logo} />
            <span>Gun License NYC</span>
          </Link>
          <p className={styles.disclaimer}>{FOOTER_DISCLAIMER}</p>
        </div>
        <nav aria-label="Footer" className={styles.columns}>
          {COLUMNS.map((column) => (
            <div key={column.title} className={styles.column} data-column={column.title}>
              <p className={styles.columnTitle}>{column.title}</p>
              {column.links.map(([label, href]) => <Link key={label} href={href} className={styles.link}>{label}</Link>)}
            </div>
          ))}
        </nav>
      </div>
      <div className={styles.bottom}>
        <span>© {new Date().getFullYear()} Gun License NYC</span>
        <span className={styles.legal}>
          <Link href="/auth/login" className={`${styles.link} ${styles.mobileOnly}`}>Sign in</Link>
          <Link href="/privacy" className={styles.link}>Privacy</Link>
          <Link href="/privacy#terms" className={styles.link}>Terms</Link>
        </span>
      </div>
    </footer>
  )
}
