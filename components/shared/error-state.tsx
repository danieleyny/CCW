"use client"

import { RotateCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

/** V3-P4.3 — shared friendly error boundary body (no default Next crash page). */
export function ErrorState({ reset, home }: { reset: () => void; home: string }) {
  return (
    <div className="mx-auto max-w-md py-16 text-center">
      <h2 className="font-display text-xl font-semibold">Something went wrong</h2>
      <p className="mt-2 text-sm text-muted-foreground">
        That page hit an error on our side — nothing you did, and nothing was lost. Try again, and if
        it keeps happening, message us from your portal.
      </p>
      <div className="mt-5 flex justify-center gap-2">
        <Button onClick={reset} size="sm">
          <RotateCcw className="size-4" /> Try again
        </Button>
        <Button asChild size="sm" variant="outline">
          <a href={home}>Go home</a>
        </Button>
      </div>
    </div>
  )
}
