"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { recordOfflinePayment } from "@/app/admin/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const modeToPackage = (m: string | null | undefined) =>
  m === "concierge" ? "full_concierge" : m === "self_guided" ? "self_guided" : "full_concierge"

/**
 * CONCIERGE QA Phase 3 — record money that arrived outside Stripe so a client
 * sold on a call or pre-staged by email is unlocked without paying again.
 * Admin-only (the action re-checks requireAdmin).
 */
export function RecordOfflinePaymentForm({
  cases,
}: {
  cases: { id: string; name: string; serviceMode?: string | null }[]
}) {
  const [pending, start] = useTransition()
  const [caseId, setCaseId] = useState("")
  const [amount, setAmount] = useState("")
  const [packageKey, setPackageKey] = useState("full_concierge")
  const [method, setMethod] = useState<"check" | "transfer" | "cash" | "other">("transfer")
  const [reference, setReference] = useState("")
  const [done, setDone] = useState(false)

  function pickCase(id: string) {
    setCaseId(id)
    setPackageKey(modeToPackage(cases.find((c) => c.id === id)?.serviceMode))
  }

  function submit() {
    const cents = Math.round(parseFloat(amount) * 100)
    if (!caseId) return toast.error("Pick a client")
    if (!cents || cents < 50) return toast.error("Enter a valid amount")
    start(async () => {
      const res = await recordOfflinePayment({
        caseId,
        amountCents: cents,
        packageKey,
        method,
        reference: reference.trim() || undefined,
      })
      if (res.error) {
        toast.error(res.error)
        return
      }
      setDone(true)
      setAmount("")
      setReference("")
      toast.success("Offline payment recorded — the case is unlocked.")
    })
  }

  if (done) {
    return (
      <div className="rounded-lg border border-ok/30 bg-ok/8 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-ok">
          <CheckCircle2 className="size-4" /> Payment recorded and the package unlocked.
        </div>
        <Button className="mt-3" size="sm" variant="outline" onClick={() => setDone(false)}>
          Record another
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Client</Label>
        <Select value={caseId} onValueChange={pickCase}>
          <SelectTrigger className="w-full">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {cases.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label>Package</Label>
        <Select value={packageKey} onValueChange={setPackageKey}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="self_guided">Self-Guided</SelectItem>
            <SelectItem value="full_concierge">Full Concierge</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="op-amount">Amount (USD)</Label>
        <Input
          id="op-amount"
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="1000.00"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Method</Label>
        <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="check">Check</SelectItem>
            <SelectItem value="transfer">Bank transfer</SelectItem>
            <SelectItem value="cash">Cash</SelectItem>
            <SelectItem value="other">Other</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5 sm:col-span-2">
        <Label htmlFor="op-ref">Reference (optional)</Label>
        <Input
          id="op-ref"
          value={reference}
          onChange={(e) => setReference(e.target.value)}
          placeholder="Check #1042 / wire confirmation / note"
        />
      </div>
      <div className="sm:col-span-2">
        <Button onClick={submit} disabled={pending} aria-busy={pending}>
          {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          {pending ? "Recording…" : "Record payment"}
        </Button>
      </div>
    </div>
  )
}
