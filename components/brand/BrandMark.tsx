"use client"

import s from "./BrandLogo.module.css"
import { useBrand } from "@/components/brand/brand-provider"

type Props = { size?: number; className?: string; title?: string }

/**
 * The Gun License NYC mark: a solid frame (two brackets), five gold ring arcs and
 * a scope sight. Inline so the frame and sight inherit the surrounding ink while
 * the ring and dot stay brand gold (#D3B36B). Class names are the animation hooks
 * in BrandLogo.module.css: edge, arcs, ping, sight, ring, ticksHover, ticks,
 * dotHover, dot. Do not rename them.
 */
export default function BrandMark({ size = 32, className, title }: Props) {
  const { key } = useBrand()

  if (key === "fl") {
    return (
      // The Firearm mark is a generated production asset shared with the
      // standalone marketing site. A plain image avoids route-dependent image
      // optimization URLs in email previews and public token flows.
      // eslint-disable-next-line @next/next/no-img-element
      <img
        src="/brand/firearm-license-nyc-mark-192.png"
        width={size}
        height={size}
        className={`${s.mark} ${s.firearmMark} ${className ?? ""}`}
        alt={title ?? ""}
        aria-hidden={title ? undefined : true}
      />
    )
  }

  return (
    <svg
      viewBox="0 0 48 48"
      width={size}
      height={size}
      fill="none"
      className={`${s.mark} ${className ?? ""}`}
      role={title ? "img" : undefined}
      aria-hidden={title ? undefined : true}
      aria-label={title}
      focusable="false"
    >
      <g className={s.edge} fill="currentColor">
        <path d="M 5.64,25.92 L 7.8,25.92 Q 8.16,25.92 8.16,26.28 L 8.16,31.2 Q 8.16,39.84 16.8,39.84 L 31.2,39.84 Q 39.84,39.84 39.84,31.2 L 39.84,26.28 Q 39.84,25.92 40.2,25.92 L 42.36,25.92 Q 42.72,25.92 42.72,26.28 L 42.72,31.2 Q 42.72,42.72 31.2,42.72 L 16.8,42.72 Q 5.28,42.72 5.28,31.2 L 5.28,26.28 Q 5.28,25.92 5.64,25.92Z" />
        <path d="M 5.64,22.08 L 7.8,22.08 Q 8.16,22.08 8.16,21.72 L 8.16,16.8 Q 8.16,8.16 16.8,8.16 L 31.2,8.16 Q 39.84,8.16 39.84,16.8 L 39.84,21.72 Q 39.84,22.08 40.2,22.08 L 42.36,22.08 Q 42.72,22.08 42.72,21.72 L 42.72,16.8 Q 42.72,5.28 31.2,5.28 L 16.8,5.28 Q 5.28,5.28 5.28,16.8 L 5.28,21.72 Q 5.28,22.08 5.64,22.08Z" />
      </g>
      <g className={s.arcs}>
        <path d="M26.15 12.93 A11.28 11.28 0 0 1 33.87 18.53" stroke="var(--logo-arc-1, #D3B36B)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M35.2 22.62 A11.28 11.28 0 0 1 32.25 31.69" stroke="var(--logo-arc-2, #D3B36B)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M28.77 34.22 A11.28 11.28 0 0 1 19.23 34.22" stroke="var(--logo-arc-3, #D3B36B)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M15.75 31.69 A11.28 11.28 0 0 1 12.8 22.62" stroke="var(--logo-arc-4, #D3B36B)" strokeWidth="2.4" strokeLinecap="round" />
        <path d="M14.13 18.53 A11.28 11.28 0 0 1 21.85 12.93" stroke="var(--logo-arc-5, #D3B36B)" strokeWidth="2.4" strokeLinecap="round" />
      </g>
      <circle className={s.ping} cx="24" cy="24" r="3.4" stroke="var(--logo-dot, var(--logo-arc-5, #D3B36B))" strokeWidth="1" />
      <g className={s.sight}>
        <circle className={s.ring} cx="24" cy="24" r="4.8" stroke="currentColor" strokeWidth="1.34" />
        <g className={s.ticksHover}>
          <g className={s.ticks} stroke="currentColor" strokeWidth="1.34" strokeLinecap="round">
            <line x1="24" y1="15.84" x2="24" y2="21.36" />
            <line x1="32.16" y1="24" x2="26.64" y2="24" />
            <line x1="24" y1="32.16" x2="24" y2="26.64" />
            <line x1="15.84" y1="24" x2="21.36" y2="24" />
          </g>
        </g>
        <g className={s.dotHover}>
          <circle className={s.dot} cx="24" cy="24" r="1.1" fill="var(--logo-dot, var(--logo-arc-5, #D3B36B))" />
        </g>
      </g>
    </svg>
  )
}
