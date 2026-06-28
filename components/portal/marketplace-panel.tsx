"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { GraduationCap, Handshake } from "lucide-react"
import { toast } from "sonner"
import { createOffer } from "@/app/portal/marketplace/actions"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"

export function MarketplacePanel({ hasOpenOffer }: { hasOpenOffer: boolean }) {
  const router = useRouter()
  const [pending, startTransition] = useTransition()
  const [busyType, setBusyType] = useState<string | null>(null)

  function request(type: "training" | "full_assist") {
    setBusyType(type)
    startTransition(async () => {
      try {
        const res = await createOffer(type)
        toast.success(
          res.matched > 0
            ? `Sent to ${res.matched} local instructor${res.matched === 1 ? "" : "s"}.`
            : "Broadcast created — we'll match you as instructors come online."
        )
        router.refresh()
      } catch {
        toast.error("Couldn't create the request. Try again.")
      } finally {
        setBusyType(null)
      }
    })
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <Card>
        <CardContent className="p-5">
          <GraduationCap className="size-5 text-signal" />
          <h3 className="mt-2 text-sm font-semibold">Schedule training</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Get matched with a verified local instructor for your 18-hour course.
          </p>
          <Button
            className="mt-3"
            size="sm"
            disabled={pending || hasOpenOffer}
            onClick={() => request("training")}
          >
            {busyType === "training" ? "Sending…" : "Find an instructor"}
          </Button>
        </CardContent>
      </Card>
      <Card>
        <CardContent className="p-5">
          <Handshake className="size-5 text-brass" />
          <h3 className="mt-2 text-sm font-semibold">Hire help with my application</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            A local pro helps assemble and review your full packet.
          </p>
          <Button
            className="mt-3"
            size="sm"
            variant="outline"
            disabled={pending || hasOpenOffer}
            onClick={() => request("full_assist")}
          >
            {busyType === "full_assist" ? "Sending…" : "Request help"}
          </Button>
        </CardContent>
      </Card>
      {hasOpenOffer && (
        <p className="sm:col-span-2 text-xs text-text-low">
          You have an open request. Cancel it below before creating another.
        </p>
      )}
    </div>
  )
}
