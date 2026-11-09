"use client"

import { useEffect, useRef } from "react"
import { usePalette } from "@/components/theme/usePalette"
import { usePrefersReducedMotion } from "../shared/usePrefersReducedMotion"
import { runCanvasLoop } from "../shared/canvasLoop"

type Particle = { x: number; y: number; r: number; speed: number; sway: number; phase: number; alpha: number; bokeh: boolean }

export function TrainingParticles({ className }: { className?: string }) {
  const canvasRef = useRef<HTMLCanvasElement>(null)
  const palette = usePalette()
  const reduced = usePrefersReducedMotion()

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const count = window.matchMedia("(max-width: 1023px)").matches ? 50 : 120
    const particles: Particle[] = Array.from({ length: count }, (_, index) => ({
      x: (index * 47 % 101) / 100, y: (index * 71 % 103) / 100, r: 0.7 + (index % 16) / 10,
      speed: 4 + (index % 11), sway: 6 + (index % 17), phase: index * 0.74,
      alpha: 0.2 + (index % 8) * 0.045, bokeh: index < (count === 50 ? 5 : 11),
    }))
    const loop = runCanvasLoop(canvas, (ctx, width, height, time) => {
      const colors = palette.phase.slice(1, 5)
      for (const particle of particles) {
        const y = ((particle.y * height - time * particle.speed) % (height + 60) + height + 60) % (height + 60) - 30
        const x = particle.x * width + Math.sin(time * 0.5 + particle.phase) * particle.sway
        const edge = Math.min(1, x / 60, (width - x) / 60, y / 60, (height - y) / 60)
        const alpha = Math.max(0, edge) * particle.alpha * (0.72 + Math.sin(time * 1.3 + particle.phase) * 0.28)
        ctx.globalAlpha = alpha
        ctx.fillStyle = colors[Math.floor(particle.phase) % colors.length]!
        if (particle.bokeh) {
          const radius = particle.r * 6
          const glow = ctx.createRadialGradient(x, y, 0, x, y, radius)
          glow.addColorStop(0, ctx.fillStyle); glow.addColorStop(1, "transparent")
          ctx.fillStyle = glow; ctx.beginPath(); ctx.arc(x, y, radius, 0, Math.PI * 2); ctx.fill()
        } else {
          ctx.beginPath(); ctx.arc(x, y, particle.r, 0, Math.PI * 2); ctx.fill()
        }
      }
      ctx.globalAlpha = 1
    }, { reducedMotion: reduced, stillTime: 2.4 })
    return () => loop.destroy()
  }, [palette, reduced])

  return <canvas ref={canvasRef} className={className} aria-hidden="true" />
}
