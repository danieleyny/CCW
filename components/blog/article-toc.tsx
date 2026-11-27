"use client"

import { useEffect, useRef, useState } from "react"

export interface ArticleTocItem {
  id: string
  title: string
}

export function ArticleToc({ items, readingId }: { items: ArticleTocItem[]; readingId: string }) {
  const [activeId, setActiveId] = useState(items[0]?.id ?? "")
  const [progress, setProgress] = useState(0)
  const frame = useRef<number | null>(null)

  useEffect(() => {
    const sections = items
      .map((item) => document.getElementById(item.id))
      .filter((section): section is HTMLElement => Boolean(section))
    const observer = new IntersectionObserver((entries) => {
      const visible = entries
        .filter((entry) => entry.isIntersecting)
        .toSorted((left, right) => left.boundingClientRect.top - right.boundingClientRect.top)[0]
      if (visible?.target.id) setActiveId(visible.target.id)
    }, { rootMargin: "-12% 0px -72% 0px", threshold: [0, 1] })
    sections.forEach((section) => observer.observe(section))

    const updateProgress = () => {
      frame.current = null
      const reading = document.getElementById(readingId)
      if (!reading) return
      const rect = reading.getBoundingClientRect()
      const start = window.scrollY + rect.top
      const distance = Math.max(1, reading.offsetHeight - window.innerHeight * 0.55)
      const next = Math.max(0, Math.min(100, Math.round(((window.scrollY - start + 120) / distance) * 100)))
      setProgress((current) => current === next ? current : next)
    }
    const onScroll = () => {
      if (frame.current === null) frame.current = window.requestAnimationFrame(updateProgress)
    }
    updateProgress()
    window.addEventListener("scroll", onScroll, { passive: true })
    window.addEventListener("resize", onScroll)
    return () => {
      observer.disconnect()
      window.removeEventListener("scroll", onScroll)
      window.removeEventListener("resize", onScroll)
      if (frame.current !== null) window.cancelAnimationFrame(frame.current)
    }
  }, [items, readingId])

  return (
    <nav aria-label="Article sections">
      <p className="mb-3.5 font-mono text-[11.5px] font-semibold uppercase tracking-[.12em] text-[#5F687B]">In this guide</p>
      {items.map((item) => {
        const active = activeId === item.id
        return (
          <a
            key={item.id}
            href={`#${item.id}`}
            aria-current={active ? "location" : undefined}
            className={`block border-l-2 py-2.5 pl-3.5 text-[14.5px] leading-[1.35] transition-colors focus-visible:rounded-r focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#14254A]/30 ${active ? "border-[#D3B36B] font-bold text-[#14254A]" : "border-[rgba(20,37,74,.13)] text-[#46526D] hover:border-[#D3B36B]/60 hover:text-[#14254A]"}`}
          >
            {item.title}
          </a>
        )
      })}
      <div className="mt-[18px] font-mono text-[11.5px] text-[#5F687B]">
        <span>{progress}% read</span>
        <span
          role="progressbar"
          aria-label="Article reading progress"
          aria-valuemin={0}
          aria-valuemax={100}
          aria-valuenow={progress}
          className="mt-2 block h-[3px] overflow-hidden rounded-full bg-[rgba(20,37,74,.13)]"
        >
          <span className="block h-full bg-[#D3B36B] transition-[width] duration-200 motion-reduce:transition-none" style={{ width: `${progress}%` }} />
        </span>
      </div>
    </nav>
  )
}
