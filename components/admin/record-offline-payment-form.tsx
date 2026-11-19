"use client"

import { useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ArrowLeft, Loader2 } from "lucide-react"
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
  onSuccess,
}: {
  cases: { id: string; name: string; serviceMode?: string | null }[]
  onSuccess?: () => void
}) {
  const router = useRouter()
  const [pending, start] = useTransition()
  const [caseId, setCaseId] = useState("")
  const [amount, setAmount] = useState("")
  const [packageKey, setPackageKey] = useState("full_concierge")
  const [method, setMethod] = useState<"check" | "transfer" | "cash" | "other">("transfer")
  const [reference, setReference] = useState("")
  const [confirming, setConfirming] = useState(false)
  const [confirmed, setConfirmed] = useState(false)
  const [error, setError] = useState<string | null>(null)

  function pickCase(id: string) {
    setCaseId(id)
    setPackageKey(modeToPackage(cases.find((c) => c.id === id)?.serviceMode))
    setError(null)
  }

  function review() {
    const cents = Math.round(parseFloat(amount) * 100)
    if (!caseId) return setError("Pick a client.")
    if (!cents || cents < 50) return setError("Enter a valid amount.")
    setError(null)
    setConfirmed(false)
    setConfirming(true)
  }

  function submit() {
    const cents = Math.round(parseFloat(amount) * 100)
    if (!confirmed) return setError("Confirm that the payment is in hand or in the bank.")
    setError(null)
    start(async () => {
      const res = await recordOfflinePayment({
        caseId,
        amountCents: cents,
        packageKey,
        method,
        reference: reference.trim() || undefined,
      })
      if (res.error) {
        setError(res.error)
        return
      }
      setAmount("")
      setReference("")
      toast.success("Offline payment recorded — the case is unlocked.")
      router.refresh()
      onSuccess?.()
    })
  }

  const amountLabel = new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(Number.parseFloat(amount) || 0)
  const clientName = cases.find((item) => item.id === caseId)?.name ?? "Client"
  const packageLabel = packageKey === "self_guided" ? "Self-Guided" : "Full Concierge"
  const methodLabel = method === "transfer" ? "bank transfer" : method
  const receivedDate = new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", year: "numeric", timeZone: "America/New_York" }).format(new Date())

  if (confirming) return (
    <div>
      <button type="button" onClick={() => { setConfirming(false); setError(null) }} disabled={pending} className="mb-4 inline-flex min-h-10 items-center gap-2 text-sm font-semibold text-[#14254A]">
        <ArrowLeft className="size-4" /> Back to details
      </button>
      <h3 className="font-[family-name:var(--font-title)] text-2xl font-semibold text-[#101828]">Record {amountLabel} received?</h3>
      <p className="mt-3 text-sm leading-relaxed text-[#475467]">
        {clientName} · {packageLabel} · {methodLabel}{reference.trim() ? ` · ${reference.trim()}` : ""} · received {receivedDate}. This marks it <strong className="text-[#101828]">paid</strong> and unlocks {packageLabel}. Recorded under your name.
      </p>
      <label className="mt-5 flex cursor-pointer items-start gap-3 rounded-xl border border-black/10 bg-[#F8F9FB] p-4 text-sm font-medium text-[#344054]">
        <input type="checkbox" checked={confirmed} onChange={(event) => setConfirmed(event.target.checked)} className="mt-0.5 size-4 rounded border-black/30 accent-[#14254A]" required />
        <span>I have the payment in hand or in the bank.</span>
      </label>
      {error ? <p role="alert" className="mt-3 text-sm font-medium text-[#B42318]">{error}</p> : null}
      <Button onClick={submit} disabled={pending || !confirmed} aria-busy={pending} className="mt-5 w-full bg-[#14254A] text-white">
        {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
        {pending ? "Recording…" : "Record payment"}
      </Button>
    </div>
  )

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="op-client">Client</Label>
        <Select value={caseId} onValueChange={pickCase}>
          <SelectTrigger id="op-client" className="w-full">
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
        <Label htmlFor="op-package">Package</Label>
        <Select value={packageKey} onValueChange={setPackageKey}>
          <SelectTrigger id="op-package" className="w-full">
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
        <Label htmlFor="op-method">Method</Label>
        <Select value={method} onValueChange={(v) => setMethod(v as typeof method)}>
          <SelectTrigger id="op-method" className="w-full">
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
        {error ? <p role="alert" className="mb-3 text-sm font-medium text-[#B42318]">{error}</p> : null}
        <Button onClick={review} className="w-full bg-[#14254A] text-white">Review payment</Button>
      </div>
    </div>
  )
}
