"use client"

import { useState } from "react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { SkylineArt } from "@/components/marketing/media-frame"

/**
 * Drop a real 60-second product-tour URL here (an .mp4 or HLS manifest) and the
 * modal plays it instead of the animated placeholder. Left null so we ship a
 * polished code-generated placeholder today with a single, obvious swap point.
 */
const TOUR_VIDEO_SRC: string | null = null

/**
 * "Watch how it works" modal. The trigger is whatever you pass as children
 * (asChild), so callers control the button styling. The dialog itself carries
 * `.dark` because it renders in a portal at the document root — OUTSIDE the
 * home's pathname-scoped `.dark` wrapper — so this re-themes its own subtree to
 * the obsidian palette and stays cinematic.
 */
export function VideoModal({ children }: { children: React.ReactNode }) {
  const [open, setOpen] = useState(false)

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>{children}</DialogTrigger>
      <DialogContent className="dark overflow-hidden border-hairline bg-surface-1 p-0 text-text-hi sm:max-w-2xl">
        <DialogTitle className="sr-only">How Gun License NYC works</DialogTitle>
        <DialogDescription className="sr-only">
          A short tour of how Gun License NYC runs your NYC concealed-carry
          application as one tracked case, from eligibility to interview.
        </DialogDescription>
        {open && TOUR_VIDEO_SRC ? (
          <video
            src={TOUR_VIDEO_SRC}
            controls
            playsInline
            className="aspect-video w-full bg-black"
          />
        ) : (
          <TourPlaceholder />
        )}
      </DialogContent>
    </Dialog>
  )
}

/**
 * Code-generated stand-in for the tour video: the skyline over an obsidian
 * gradient with a slow brass sweep. The sweep is pure CSS (see `.tour-sweep` in
 * globals.css) and freezes under prefers-reduced-motion.
 */
function TourPlaceholder() {
  return (
    <div className="relative aspect-video w-full overflow-hidden bg-gradient-to-br from-surface-2 to-bg">
      <SkylineArt className="h-1/2 opacity-70" />
      <div aria-hidden className="tour-sweep pointer-events-none absolute inset-0" />
      <div className="absolute inset-0 flex flex-col items-center justify-center gap-3 text-center">
        <span className="flex size-14 items-center justify-center rounded-full border border-brass/50 bg-black/30 text-brass backdrop-blur-sm">
          <svg viewBox="0 0 24 24" className="ml-0.5 size-6" fill="currentColor" aria-hidden>
            <path d="M8 5v14l11-7z" />
          </svg>
        </span>
        <p className="font-display text-lg font-semibold tracking-tight text-text-hi">
          The 60-second tour
        </p>
        <p className="max-w-xs text-sm text-text-mid">
          One case, from eligibility check to interview — a short walkthrough is
          on the way.
        </p>
      </div>
    </div>
  )
}
