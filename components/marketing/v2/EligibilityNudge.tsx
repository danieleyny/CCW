"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"
import { ShieldCheck, Star, X } from "lucide-react"
import { useCallback, useEffect, useRef, useState } from "react"
import { trackEvent } from "@/lib/analytics"
import styles from "./EligibilityNudge.module.css"

const DISMISS_KEY = "gln_elig_nudge_dismissed"
const PHONE_QUERY = "(max-width: 767px)"
const HOVER_QUERY = "(hover: hover) and (pointer: fine)"
const PHONE_EXPANDED_DWELL_MS = 2400

const COPY = {
  en: {
    tab: "Am I eligible?",
    eyebrow: "2-minute check",
    title: "Find out if you qualify",
    body: "No account, no payment. Just an honest read on where you stand.",
    start: "Start the check",
    close: "Close and hide this eligibility check for this session",
    phoneLabel: "Am I eligible?",
    duration: "2 min",
    phoneAction: "Check now →",
    phoneAria: "Check if you're eligible. Takes about 2 minutes.",
  },
  es: {
    tab: "¿Soy elegible?",
    eyebrow: "Evaluación de 2 minutos",
    title: "Descubra si reúne los requisitos",
    body: "Sin cuenta ni pago. Solo una evaluación honesta de su situación.",
    start: "Comenzar la evaluación",
    close: "Cerrar y ocultar esta evaluación de elegibilidad durante esta sesión",
    phoneLabel: "¿Soy elegible?",
    duration: "2 min",
    phoneAction: "Comenzar →",
    phoneAria: "Compruebe si reúne los requisitos. Toma aproximadamente 2 minutos.",
  },
} as const

const EXCLUDED_PREFIXES = ["/portal", "/admin", "/instructor", "/sponsor", "/auth", "/r/", "/c/", "/invite"]

function isMarketingPath(pathname: string) {
  if (pathname === "/eligibility" || pathname.startsWith("/eligibility/")) return false
  if (/^\/V[134]\/?$/.test(pathname)) return false
  return !EXCLUDED_PREFIXES.some((prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`) || pathname.startsWith(prefix))
}

function isTextEntry(target: EventTarget | null) {
  if (!(target instanceof HTMLElement)) return false
  return target.matches("input:not([type='button']):not([type='submit']):not([type='checkbox']):not([type='radio']), textarea, select, [contenteditable='true']")
}

function device() {
  return window.matchMedia(PHONE_QUERY).matches ? "phone" as const : "desktop" as const
}

export function EligibilityNudge() {
  const pathname = usePathname()
  const copy = pathname === "/es" || pathname.startsWith("/es/") ? COPY.es : COPY.en
  const containerRef = useRef<HTMLDivElement>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const hoverOpenTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const hoverCloseTimer = useRef<ReturnType<typeof setTimeout> | null>(null)
  const shownTrackedPath = useRef<string | null>(null)
  const phoneExpandedUntil = useRef(0)
  const compactRef = useRef(false)
  const [passedState, setPassedState] = useState({ path: "", value: false })
  const [ctaState, setCtaState] = useState({ path: "", value: false })
  const [footerState, setFooterState] = useState({ path: "", value: false })
  const [overlayOpen, setOverlayOpen] = useState(false)
  const [typing, setTyping] = useState(false)
  const [blockedState, setBlockedState] = useState({ path: "", value: false })
  const [openPath, setOpenPath] = useState<string | null>(null)
  const [dismissed, setDismissed] = useState(() => {
    if (typeof window === "undefined") return false
    try {
      return sessionStorage.getItem(DISMISS_KEY) === "1"
    } catch {
      return false
    }
  })
  const [compact, setCompact] = useState(false)

  const allowed = isMarketingPath(pathname)
  const passedPrimaryCta = passedState.path === pathname && passedState.value
  const ctaVisible = ctaState.path === pathname && ctaState.value
  const footerVisible = footerState.path === pathname && footerState.value
  const blockedByControl = blockedState.path === pathname && blockedState.value
  const open = openPath === pathname

  const clearTimers = useCallback(() => {
    if (hoverOpenTimer.current) clearTimeout(hoverOpenTimer.current)
    if (hoverCloseTimer.current) clearTimeout(hoverCloseTimer.current)
    hoverOpenTimer.current = null
    hoverCloseTimer.current = null
  }, [])

  const closeCard = useCallback((restoreFocus = false) => {
    clearTimers()
    setOpenPath(null)
    if (restoreFocus) requestAnimationFrame(() => triggerRef.current?.focus())
  }, [clearTimers])

  const openCard = useCallback(() => {
    clearTimers()
    setOpenPath((wasOpenPath) => {
      if (wasOpenPath !== pathname) trackEvent("elig_nudge_opened", { device: "desktop", path: pathname })
      return pathname
    })
  }, [clearTimers, pathname])

  useEffect(() => {
    if (!allowed) return

    const primary = document.querySelector<HTMLElement>("main [data-eligibility-cta]")
    const ctaNodes = Array.from(new Set(document.querySelectorAll<HTMLElement>("main [data-eligibility-cta], main a[href='/eligibility']")))
    const visibility = new Map<HTMLElement, boolean>(ctaNodes.map((node) => [node, false]))
    let ctaReleaseTimer: ReturnType<typeof setTimeout> | null = null
    const ctaObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) visibility.set(entry.target as HTMLElement, entry.isIntersecting)
      const value = Array.from(visibility.values()).some(Boolean)
      if (ctaReleaseTimer) clearTimeout(ctaReleaseTimer)
      if (value) {
        setCtaState((current) => current.path === pathname && current.value ? current : { path: pathname, value: true })
      } else {
        // Mobile Safari can alternate intersection results while its browser chrome
        // collapses. Keep the nudge hidden until the CTA has been clear long enough
        // to avoid a show/hide loop at the edge of the viewport.
        ctaReleaseTimer = setTimeout(() => {
          setCtaState((current) => current.path === pathname && !current.value ? current : { path: pathname, value: false })
        }, 260)
      }
    }, { threshold: 0.08 })
    ctaNodes.forEach((node) => ctaObserver.observe(node))

    let primaryObserver: IntersectionObserver | null = null
    let fallbackScroll: (() => void) | null = null
    if (primary) {
      primaryObserver = new IntersectionObserver(([entry]) => {
        if (!entry.isIntersecting && entry.boundingClientRect.bottom <= 0) {
          setPassedState((current) => current.path === pathname && current.value ? current : { path: pathname, value: true })
        }
      }, { threshold: 0 })
      primaryObserver.observe(primary)
    } else {
      fallbackScroll = () => {
        const value = window.scrollY > 400
        setPassedState((current) => current.path === pathname && current.value === value ? current : { path: pathname, value })
      }
      fallbackScroll()
      window.addEventListener("scroll", fallbackScroll, { passive: true })
    }

    const footers = Array.from(document.querySelectorAll<HTMLElement>("footer"))
    const footerVisibility = new Map<HTMLElement, boolean>(footers.map((footer) => [footer, false]))
    const footerObserver = new IntersectionObserver((entries) => {
      for (const entry of entries) footerVisibility.set(entry.target as HTMLElement, entry.isIntersecting)
      const value = Array.from(footerVisibility.values()).some(Boolean)
      setFooterState((current) => current.path === pathname && current.value === value ? current : { path: pathname, value })
    }, { threshold: 0.02 })
    footers.forEach((footer) => footerObserver.observe(footer))

    return () => {
      if (ctaReleaseTimer) clearTimeout(ctaReleaseTimer)
      ctaObserver.disconnect()
      primaryObserver?.disconnect()
      footerObserver.disconnect()
      if (fallbackScroll) window.removeEventListener("scroll", fallbackScroll)
    }
  }, [allowed, pathname])

  useEffect(() => {
    if (!allowed) return
    const syncOverlay = () => {
      const bodyFlag = document.body.hasAttribute("data-overlay-open")
      const menuOpen = document.querySelector(".mobile-menu[open]") !== null
      const dialogOpen = document.querySelector("[role='dialog'][data-state='open'], [data-slot='sheet-overlay'][data-state='open']") !== null
      setOverlayOpen(bodyFlag || menuOpen || dialogOpen)
    }
    syncOverlay()
    const observer = new MutationObserver(syncOverlay)
    observer.observe(document.body, { attributes: true, attributeFilter: ["data-overlay-open", "class"], childList: true, subtree: true })
    return () => observer.disconnect()
  }, [allowed, pathname])

  useEffect(() => {
    if (!allowed) return
    const syncTyping = () => setTyping(window.matchMedia(PHONE_QUERY).matches && isTextEntry(document.activeElement))
    const onFocusIn = (event: FocusEvent) => setTyping(window.matchMedia(PHONE_QUERY).matches && isTextEntry(event.target))
    const onFocusOut = () => requestAnimationFrame(syncTyping)
    window.addEventListener("focusin", onFocusIn)
    window.addEventListener("focusout", onFocusOut)
    window.addEventListener("resize", syncTyping)
    return () => {
      window.removeEventListener("focusin", onFocusIn)
      window.removeEventListener("focusout", onFocusOut)
      window.removeEventListener("resize", syncTyping)
    }
  }, [allowed])

  useEffect(() => {
    if (!allowed) return
    let frame = 0
    let releaseTimer: ReturnType<typeof setTimeout> | null = null
    const checkControls = () => {
      cancelAnimationFrame(frame)
      frame = requestAnimationFrame(() => {
        const phone = window.matchMedia(PHONE_QUERY).matches
        const width = phone ? (compact ? 52 : Math.min(336, window.innerWidth - 24)) : 58
        const zone = phone
          ? compact
            ? { left: window.innerWidth - width - 12, right: window.innerWidth - 12, top: window.innerHeight - 90, bottom: window.innerHeight }
            : { left: (window.innerWidth - width) / 2, right: (window.innerWidth + width) / 2, top: window.innerHeight - 90, bottom: window.innerHeight }
          : { left: window.innerWidth - width, right: window.innerWidth, top: window.innerHeight / 2 - 112, bottom: window.innerHeight / 2 + 112 }
        const controls = document.querySelectorAll<HTMLElement>("main input, main textarea, main select, main button[type='submit'], main input[type='submit'], [data-chat-widget]")
        const value = Array.from(controls).some((control) => {
          const rect = control.getBoundingClientRect()
          if (rect.width === 0 || rect.height === 0) return false
          return rect.left < zone.right && rect.right > zone.left && rect.top < zone.bottom && rect.bottom > zone.top
        })
        if (releaseTimer) clearTimeout(releaseTimer)
        if (value) {
          setBlockedState((current) => current.path === pathname && current.value ? current : { path: pathname, value: true })
        } else {
          releaseTimer = setTimeout(() => {
            setBlockedState((current) => current.path === pathname && !current.value ? current : { path: pathname, value: false })
          }, 260)
        }
      })
    }
    checkControls()
    window.addEventListener("scroll", checkControls, { passive: true })
    window.addEventListener("resize", checkControls)
    return () => {
      cancelAnimationFrame(frame)
      if (releaseTimer) clearTimeout(releaseTimer)
      window.removeEventListener("scroll", checkControls)
      window.removeEventListener("resize", checkControls)
    }
  }, [allowed, compact, pathname])

  useEffect(() => {
    if (!allowed) return
    let lastY = Math.max(0, window.scrollY)
    let downwardTravel = 0
    let upwardTravel = 0
    const onScroll = () => {
      if (!window.matchMedia(PHONE_QUERY).matches) return
      const nextY = Math.max(0, window.scrollY)
      const delta = nextY - lastY
      lastY = nextY

      // Use accumulated travel instead of reacting to every scroll event. iOS
      // sends tiny opposing deltas while the address bar settles; treating those
      // as direction changes made the pill repeatedly open and close.
      if (delta > 2) {
        downwardTravel += delta
        upwardTravel = 0
        if (downwardTravel >= 48 && performance.now() >= phoneExpandedUntil.current) {
          compactRef.current = true
          setCompact(true)
          downwardTravel = 0
        }
      } else if (delta < -2) {
        upwardTravel += Math.abs(delta)
        downwardTravel = 0
        if (compactRef.current && upwardTravel >= 12) {
          compactRef.current = false
          phoneExpandedUntil.current = performance.now() + PHONE_EXPANDED_DWELL_MS
          setCompact(false)
          upwardTravel = 0
        }
      }
    }
    window.addEventListener("scroll", onScroll, { passive: true })
    return () => window.removeEventListener("scroll", onScroll)
  }, [allowed])

  const visible = allowed && passedPrimaryCta && !ctaVisible && !footerVisible && !overlayOpen && !typing && !blockedByControl && !dismissed

  useEffect(() => {
    if (!visible) return
    if (shownTrackedPath.current !== pathname) {
      shownTrackedPath.current = pathname
      compactRef.current = false
      phoneExpandedUntil.current = performance.now() + PHONE_EXPANDED_DWELL_MS
      setCompact(false)
      trackEvent("elig_nudge_shown", { device: device(), path: pathname })
    }
  }, [pathname, visible])

  useEffect(() => {
    if (visible || !open) return
    const frame = requestAnimationFrame(() => setOpenPath(null))
    return () => cancelAnimationFrame(frame)
  }, [open, visible])

  useEffect(() => {
    if (!open) return
    const onPointerDown = (event: PointerEvent) => {
      if (!containerRef.current?.contains(event.target as Node)) closeCard(true)
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") closeCard(true)
    }
    document.addEventListener("pointerdown", onPointerDown)
    document.addEventListener("keydown", onKeyDown)
    return () => {
      document.removeEventListener("pointerdown", onPointerDown)
      document.removeEventListener("keydown", onKeyDown)
    }
  }, [closeCard, open])

  useEffect(() => clearTimers, [clearTimers])

  // Keep the temporarily hidden nudge mounted. Repeatedly unmounting it at CTA
  // and footer boundaries replayed the entrance animation and looked like a
  // mobile glitch. Disallowed routes and a deliberate session dismissal still
  // remove it entirely.
  if (!allowed || dismissed) return null

  const dismiss = () => {
    try {
      sessionStorage.setItem(DISMISS_KEY, "1")
    } catch {
      // Storage can be unavailable in privacy-restricted browsers; local state still dismisses it.
    }
    trackEvent("elig_nudge_dismissed", { device: "desktop", path: pathname })
    setDismissed(true)
  }

  const trackClick = (targetDevice: "desktop" | "phone") => {
    trackEvent("elig_nudge_clicked", { device: targetDevice, path: pathname })
  }

  return (
    <>
      <div
        ref={containerRef}
        className={styles.desktopWrap}
        data-visible={visible ? "true" : "false"}
        aria-hidden={!visible}
        onPointerEnter={() => {
          if (!window.matchMedia(HOVER_QUERY).matches) return
          clearTimers()
          hoverOpenTimer.current = setTimeout(openCard, 150)
        }}
        onPointerLeave={() => {
          if (!window.matchMedia(HOVER_QUERY).matches) return
          clearTimers()
          hoverCloseTimer.current = setTimeout(() => closeCard(false), 300)
        }}
      >
        <button
          ref={triggerRef}
          type="button"
          className={styles.edgeTab}
          aria-expanded={open}
          aria-controls="eligibility-nudge-dialog"
          tabIndex={visible ? 0 : -1}
          onClick={() => open ? closeCard(false) : openCard()}
        >
          <span className={styles.edgeStrip} aria-hidden="true" />
          <ShieldCheck className={styles.tabIcon} aria-hidden="true" />
          <span className={styles.verticalLabel}>{copy.tab}</span>
        </button>

        {open ? (
          <div className={styles.card} id="eligibility-nudge-dialog" role="dialog" aria-labelledby="eligibility-nudge-title">
            <button type="button" className={styles.dismiss} aria-label={copy.close} onClick={dismiss}>
              <X aria-hidden="true" />
            </button>
            <p className={styles.eyebrow}>{copy.eyebrow}</p>
            <h2 id="eligibility-nudge-title" className={styles.title}>{copy.title}</h2>
            <p className={styles.body}>{copy.body}</p>
            <Link className={styles.startButton} href="/eligibility" onClick={() => trackClick("desktop")}>
              {copy.start}
            </Link>
          </div>
        ) : null}
      </div>

      <Link
        href="/eligibility"
        className={styles.phonePill}
        data-visible={visible ? "true" : "false"}
        data-compact={compact ? "true" : "false"}
        aria-hidden={!visible}
        aria-label={copy.phoneAria}
        tabIndex={visible ? 0 : -1}
        onClick={() => trackClick("phone")}
      >
        {compact ? (
          <Star className={styles.phoneIcon} data-symbol="star" aria-hidden="true" />
        ) : (
          <ShieldCheck className={styles.phoneIcon} data-symbol="shield-check" aria-hidden="true" />
        )}
        <span className={styles.phoneLabel}>{copy.phoneLabel}</span>
        <span className={styles.duration}>{copy.duration}</span>
        <span className={styles.phoneAction}>{copy.phoneAction}</span>
      </Link>
    </>
  )
}
