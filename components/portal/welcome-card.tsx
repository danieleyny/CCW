"use client"

import { useState, useSyncExternalStore } from "react"
import Link from "next/link"
import { X, GraduationCap, ClipboardList, Users } from "lucide-react"
import { Button } from "@/components/ui/button"

const KEY = "carry_welcome_dismissed"
const noopSubscribe = () => () => {}
function readDismissed(): boolean {
  try {
    return !!window.localStorage.getItem(KEY)
  } catch {
    return true
  }
}

/**
 * V3-P4.4 — the 60-second orientation a new client actually needs, led by the
 * product's core thesis: training is the long pole and it expires — start it
 * on day one, in parallel with everything else.
 */
export function WelcomeCard({ firstName }: { firstName: string }) {
  // localStorage read via useSyncExternalStore (server snapshot: hidden) — the
  // sanctioned pattern; no setState inside an effect.
  const storedDismissed = useSyncExternalStore(noopSubscribe, readDismissed, () => true)
  const [hidden, setHidden] = useState(false)
  if (storedDismissed || hidden) return null

  function dismiss() {
    try {
      window.localStorage.setItem(KEY, "1")
    } catch {
      /* ignore */
    }
    setHidden(true)
  }

  return (
    <div className="relative rounded-lg border border-brass/40 bg-brass/8 p-5">
      <button
        type="button"
        onClick={dismiss}
        aria-label="Dismiss welcome"
        className="absolute right-3 top-3 text-text-low transition-colors hover:text-foreground"
      >
        <X className="size-4" />
      </button>
      <h2 className="font-display text-lg font-semibold">Welcome, {firstName} — here&apos;s the whole game.</h2>
      <p className="mt-1 text-sm text-text-mid">
        A NYC carry application typically runs <b>~6 months</b>. It isn&apos;t a form — it&apos;s an
        investigation you assemble evidence for. Three things, started in parallel, keep you on schedule:
      </p>
      <ol className="mt-3 space-y-2 text-sm">
        <li className="flex gap-2">
          <GraduationCap className="mt-0.5 size-4 shrink-0 text-brass" />
          <span>
            <b>Book training first.</b> The 16+2-hour course is the longest step and the certificate
            expires 6 months after completion —{" "}
            <Link href="/portal/marketplace" className="text-signal underline">
              find a verified instructor now
            </Link>
            .
          </span>
        </li>
        <li className="flex gap-2">
          <ClipboardList className="mt-0.5 size-4 shrink-0 text-brass" />
          <span>
            <b>Do the intake interview</b> (~15 minutes) — it builds your exact personalized checklist:{" "}
            <Link href="/portal/intake" className="text-signal underline">
              start the intake
            </Link>
            .
          </span>
        </li>
        <li className="flex gap-2">
          <Users className="mt-0.5 size-4 shrink-0 text-brass" />
          <span>
            <b>Add your references &amp; household</b> — each person gets a self-serve link, so their
            part runs while you do yours:{" "}
            <Link href="/portal/people" className="text-signal underline">
              add people
            </Link>
            .
          </span>
        </li>
      </ol>
      <Button size="sm" variant="ghost" className="mt-3 text-text-low" onClick={dismiss}>
        Got it — don&apos;t show this again
      </Button>
    </div>
  )
}
