"use client"

import { useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { CalendarClock, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"

/**
 * The real intro-call length, in ONE place — the card copy, the modal title and
 * the confirmation all read from this so they can never disagree.
 */
export const INTRO_CALL_MINUTES = 30

/**
 * The intro-call scheduler in a modal. NOTHING loads until "Choose a time" is
 * clicked: Radix keeps the dialog content unmounted while closed, so the iframe
 * doesn't exist on the dashboard's every-visit home screen — which is exactly the
 * gap/flash/jump we were seeing from the old inline embed. Fixed modal height, so
 * there is no page_height handshake at all; Calendly scrolls internally.
 *
 * `url` arrives fully built (utm_content + hide params) from book-call.tsx — the
 * one place those params live. We add only `embed_domain` here, client-side,
 * because it must match the live host (and can't be known on the server).
 */
export function BookCallModal({ url }: { url: string }) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [src, setSrc] = useState<string | null>(null)
  const [loaded, setLoaded] = useState(false)
  // Guard router.refresh() to one fire even if Calendly posts the event twice.
  const scheduled = useRef(false)

  // Build the src (with embed_domain) only once the dialog is open — this is what
  // mounts the iframe. Reset on close so each open gets a fresh scheduler.
  useEffect(() => {
    if (!open) {
      setSrc(null)
      setLoaded(false)
      scheduled.current = false
      return
    }
    const u = new URL(url)
    u.searchParams.set("embed_domain", window.location.hostname)
    setSrc(u.toString())
  }, [open, url])

  // Close on a real booking. Calendly posts `calendly.event_scheduled` from its
  // own origin; the webhook remains the source of truth — this only lets the UI
  // react promptly (close, toast, refresh so the booked line appears).
  useEffect(() => {
    if (!open) return
    function onMessage(e: MessageEvent) {
      if (typeof e.origin !== "string" || !e.origin.includes("calendly.com")) return
      const data = e.data as { event?: string }
      if (data?.event === "calendly.event_scheduled" && !scheduled.current) {
        scheduled.current = true
        setOpen(false)
        toast.success("Your intro call is booked — we'll confirm the details shortly.")
        router.refresh()
      }
    }
    window.addEventListener("message", onMessage)
    return () => window.removeEventListener("message", onMessage)
  }, [open, router])

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="min-h-[44px]">
          <CalendarClock className="size-4" /> Choose a time
        </Button>
      </DialogTrigger>
      <DialogContent className="grid h-[min(760px,85vh)] w-full max-w-[440px] grid-rows-[auto_1fr_auto] gap-0 overflow-hidden p-0">
        <div className="border-b px-4 py-3 pr-10">
          <DialogTitle>Book your intro call</DialogTitle>
          <DialogDescription className="sr-only">
            Pick a time for your {INTRO_CALL_MINUTES}-minute concierge intro call.
          </DialogDescription>
        </div>

        <div className="relative min-h-0 bg-white">
          {!loaded && (
            <div className="absolute inset-0 flex items-center justify-center" aria-hidden>
              <Loader2 className="size-6 animate-spin text-neutral-400" />
            </div>
          )}
          {src && (
            <iframe
              title="Schedule your concierge intro call"
              src={src}
              className="relative h-full w-full border-0"
              onLoad={() => setLoaded(true)}
            />
          )}
        </div>

        <div className="flex items-center justify-between gap-3 border-t bg-muted/50 px-4 py-2.5 text-xs text-text-mid">
          <span>Having trouble?</span>
          <a
            href={url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 font-medium text-signal underline underline-offset-2"
          >
            Open in a new tab <ExternalLink className="size-3" />
          </a>
        </div>
      </DialogContent>
    </Dialog>
  )
}
