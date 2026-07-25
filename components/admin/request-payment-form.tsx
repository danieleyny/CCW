"use client"

import { useState, useTransition } from "react"
import { CheckCircle2, Copy, ExternalLink, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { requestPayment } from "@/app/admin/actions"
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

type Result =
  | { kind: "invoiced"; url: string | null }
  | { kind: "fallback" }
  | null

export function RequestPaymentForm({ cases }: { cases: { id: string; name: string }[] }) {
  const [pending, start] = useTransition()
  const [caseId, setCaseId] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"deposit" | "full" | "installment">("deposit")
  const [description, setDescription] = useState("")
  const [result, setResult] = useState<Result>(null)

  function submit() {
    const cents = Math.round(parseFloat(amount) * 100)
    if (!caseId) return toast.error("Pick a client")
    if (!cents || cents < 50) return toast.error("Enter a valid amount")
    start(async () => {
      const res = await requestPayment({ caseId, amountCents: cents, type, description })
      if (!res.ok) {
        toast.error(res.error ?? "Failed")
        return
      }
      if (res.hostedInvoiceUrl !== undefined && !res.fallback) {
        setResult({ kind: "invoiced", url: res.hostedInvoiceUrl ?? null })
        toast.success("Invoice sent to the client")
      } else {
        setResult({ kind: "fallback" })
        toast.success("Payment recorded — a task was opened to send the invoice")
      }
      setAmount("")
      setDescription("")
    })
  }

  if (result) {
    return (
      <div className="rounded-lg border border-ok/30 bg-ok/8 p-4">
        <div className="flex items-center gap-2 text-sm font-medium text-ok">
          <CheckCircle2 className="size-4" />
          {result.kind === "invoiced" ? "Invoice created and emailed to the client." : "Payment requested."}
        </div>
        {result.kind === "fallback" && (
          <p className="mt-1.5 text-xs text-text-mid">
            Stripe is off — a &ldquo;send invoice&rdquo; task was opened for this case.
          </p>
        )}
        {result.kind === "invoiced" && result.url && (
          <div className="mt-3 flex flex-wrap items-center gap-2">
            <Button asChild size="sm" variant="outline">
              <a href={result.url} target="_blank" rel="noreferrer">
                <ExternalLink className="mr-1.5 size-3.5" /> Open invoice
              </a>
            </Button>
            <Button
              size="sm"
              variant="ghost"
              onClick={() => {
                navigator.clipboard.writeText(result.url!)
                toast.success("Invoice link copied")
              }}
            >
              <Copy className="mr-1.5 size-3.5" /> Copy link
            </Button>
          </div>
        )}
        <Button className="mt-3" size="sm" variant="outline" onClick={() => setResult(null)}>
          Request another
        </Button>
      </div>
    )
  }

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Client</Label>
        <Select value={caseId} onValueChange={setCaseId}>
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
        <Label>Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="deposit">Deposit</SelectItem>
            <SelectItem value="full">Full / balance</SelectItem>
            <SelectItem value="installment">Installment</SelectItem>
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-amount">Amount (USD)</Label>
        <Input
          id="rp-amount"
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="500.00"
        />
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-desc">Description</Label>
        <Input
          id="rp-desc"
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Full Concierge — balance"
        />
      </div>
      <div className="sm:col-span-2">
        <Button onClick={submit} disabled={pending} aria-busy={pending}>
          {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          {pending ? "Requesting…" : "Request payment"}
        </Button>
        <p className="mt-2 text-xs text-text-low">
          With Stripe on, this emails the client a hosted invoice. Otherwise it opens a task to send
          one manually.
        </p>
      </div>
    </div>
  )
}
