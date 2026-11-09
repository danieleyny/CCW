"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react"
import styles from "./eligibility.module.css"

type Burst = (element: Element | null, count?: number) => void

const ParticleContext = createContext<{ burst: Burst }>({ burst: () => undefined })

type Particle = {
  x: number
  y: number
  radius: number
  vx: number
  vy: number
  alpha: number
  color: "#14254A" | "#BF953A"
  life?: number
  burst?: boolean
}

export function useEligibilityParticles() {
  return useContext(ParticleContext)
}

export function EligibilityStage({
  children,
  hue,
}: {
  children: React.ReactNode
  hue: string
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const particlesRef = useRef<Particle[]>([])
  const frameRef = useRef<number | null>(null)
  const [reducedMotion, setReducedMotion] = useState(false)

  useEffect(() => {
    const media = window.matchMedia("(prefers-reduced-motion: reduce)")
    const update = () => setReducedMotion(media.matches)
    update()
    media.addEventListener("change", update)
    return () => media.removeEventListener("change", update)
  }, [])

  useEffect(() => {
    if (reducedMotion) return

    const canvas = canvasRef.current
    if (!canvas) return
    const context = canvas.getContext("2d")
    if (!context) return

    let width = 0
    let height = 0
    let dpr = 1

    const seed = () => {
      const count = Math.round(Math.min(70, (width * height) / 22_000))
      particlesRef.current = Array.from({ length: count }, () => ({
        x: Math.random() * width,
        y: Math.random() * height,
        radius: Math.random() * 1.5 + 0.6,
        vx: (Math.random() - 0.5) * 0.12,
        vy: -(Math.random() * 0.18 + 0.04),
        alpha: Math.random() * 0.35 + 0.15,
        color: Math.random() < 0.22 ? "#BF953A" : "#14254A",
      }))
    }

    const size = () => {
      const rect = canvas.getBoundingClientRect()
      width = rect.width
      height = rect.height
      dpr = Math.min(2, window.devicePixelRatio || 1)
      canvas.width = Math.round(width * dpr)
      canvas.height = Math.round(height * dpr)
      context.setTransform(dpr, 0, 0, dpr, 0, 0)
      seed()
    }

    const draw = () => {
      frameRef.current = null
      if (document.hidden) return

      context.clearRect(0, 0, width, height)
      const particles = particlesRef.current

      for (let index = particles.length - 1; index >= 0; index -= 1) {
        const particle = particles[index]
        particle.x += particle.vx
        particle.y += particle.vy

        if (particle.burst && particle.life !== undefined) {
          particle.vx *= 0.96
          particle.vy = particle.vy * 0.96 + 0.02
          particle.life -= 1
          particle.alpha = Math.max(0, particle.life / 120)
          if (particle.life <= 0) {
            particles.splice(index, 1)
            continue
          }
        } else {
          if (particle.y < -6) {
            particle.y = height + 6
            particle.x = Math.random() * width
          }
          if (particle.x < -6) particle.x = width + 6
          if (particle.x > width + 6) particle.x = -6
        }

        context.globalAlpha = particle.alpha
        context.fillStyle = particle.color
        context.beginPath()
        context.arc(particle.x, particle.y, particle.radius, 0, Math.PI * 2)
        context.fill()
      }

      context.globalAlpha = 1
      frameRef.current = window.requestAnimationFrame(draw)
    }

    const resume = () => {
      if (!document.hidden && frameRef.current === null) {
        frameRef.current = window.requestAnimationFrame(draw)
      }
    }

    size()
    resume()
    window.addEventListener("resize", size)
    document.addEventListener("visibilitychange", resume)

    return () => {
      window.removeEventListener("resize", size)
      document.removeEventListener("visibilitychange", resume)
      if (frameRef.current !== null) window.cancelAnimationFrame(frameRef.current)
      frameRef.current = null
    }
  }, [reducedMotion])

  const burst = useCallback<Burst>(
    (element, count = 22) => {
      if (reducedMotion || !element || !canvasRef.current) return
      const elementRect = element.getBoundingClientRect()
      const canvasRect = canvasRef.current.getBoundingClientRect()

      for (let index = 0; index < count; index += 1) {
        const angle = Math.random() * Math.PI * 2
        const speed = Math.random() * 2.2 + 0.5
        particlesRef.current.push({
          x: elementRect.left - canvasRect.left + elementRect.width * (0.2 + Math.random() * 0.6),
          y: elementRect.top - canvasRect.top + elementRect.height / 2,
          radius: Math.random() * 2 + 0.8,
          vx: Math.cos(angle) * speed,
          vy: Math.sin(angle) * speed - 0.6,
          alpha: 0.9,
          life: 70 + Math.random() * 50,
          color: Math.random() < 0.6 ? "#BF953A" : "#14254A",
          burst: true,
        })
      }
    },
    [reducedMotion]
  )

  const value = useMemo(() => ({ burst }), [burst])

  return (
    <ParticleContext.Provider value={value}>
      <section className={styles.stage} style={{ "--hue": hue } as React.CSSProperties}>
        <div className={styles.blobs} aria-hidden="true">
          <i />
          <i />
          <i />
        </div>
        <div className={styles.dotGrid} aria-hidden="true" />
        {reducedMotion ? null : (
          <canvas ref={canvasRef} className={styles.particles} aria-hidden="true" />
        )}
        {children}
      </section>
    </ParticleContext.Provider>
  )
}
