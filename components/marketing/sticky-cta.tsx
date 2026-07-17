"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { ArrowRight } from "lucide-react"
import { cn } from "@/lib/utils"

/**
 * V5 — the highest-leverage mobile conversion element: a bottom bar that fades
 * in once the hero scrolls out of view and hides again when the closing CTA is
 * on screen (so it never double-stacks with it). Mobile only, safe-area aware.
 *
 * Pass the ids of the hero and closing sections to watch.
 */
export function StickyCta({
  watchOutId,
  hideNearId,
  href = "/eligibility",
  label = "Check your eligibility",
}: {
  watchOutId: string
  hideNearId: string
  href?: string
  label?: string
}) {
  const [show, setShow] = useState(false)

  useEffect(() => {
    const hero = document.getElementById(watchOutId)
    const closing = document.getElementById(hideNearId)
    let heroVisible = true
    let closingVisible = false
    const update = () => setShow(!heroVisible && !closingVisible)

    const ios: IntersectionObserver[] = []
    if (hero) {
      const io = new IntersectionObserver(
        ([e]) => {
          heroVisible = e.isIntersecting
          update()
        },
        { threshold: 0 }
      )
      io.observe(hero)
      ios.push(io)
    }
    if (closing) {
      const io = new IntersectionObserver(
        ([e]) => {
          closingVisible = e.isIntersecting
          update()
        },
        { threshold: 0 }
      )
      io.observe(closing)
      ios.push(io)
    }
    return () => ios.forEach((io) => io.disconnect())
  }, [watchOutId, hideNearId])

  return (
    <div
      className={cn(
        "glass-premium fixed inset-x-0 bottom-0 z-40 border-t border-hairline p-3 transition-all duration-300 md:hidden motion-reduce:transition-none",
        show ? "translate-y-0 opacity-100" : "pointer-events-none translate-y-full opacity-0"
      )}
      style={{ paddingBottom: "calc(0.75rem + env(safe-area-inset-bottom))" }}
    >
      <Link
        href={href}
        className="flex min-h-12 w-full items-center justify-center gap-2 rounded-lg bg-brass px-4 font-semibold text-brand-foreground"
      >
        {label} <ArrowRight className="size-4" />
      </Link>
    </div>
  )
}
