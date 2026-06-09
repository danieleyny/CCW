"use client"

import { useState, useTransition } from "react"
import { toast } from "sonner"
import { requestPayment } from "@/app/admin/actions"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Button } from "@/components/ui/button"

export function RequestPaymentForm({ cases }: { cases: { id: string; name: string }[] }) {
  const [pending, start] = useTransition()
  const [caseId, setCaseId] = useState("")
  const [amount, setAmount] = useState("")
  const [type, setType] = useState<"deposit" | "full" | "installment">("deposit")
  const [description, setDescription] = useState("")

  function submit() {
    const cents = Math.round(parseFloat(amount) * 100)
    if (!caseId) return toast.error("Pick a client")
    if (!cents || cents < 50) return toast.error("Enter a valid amount")
    start(async () => {
      try {
        await requestPayment({ caseId, amountCents: cents, type, description })
        toast.success("Payment requested")
        setAmount("")
        setDescription("")
      } catch (e) {
        toast.error(e instanceof Error ? e.message : "Failed")
      }
    })
  }

  const selectCls =
    "h-10 w-full rounded-md border border-hairline-strong bg-surface-3 px-3 text-sm text-foreground"

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label>Client</Label>
        <select className={selectCls} value={caseId} onChange={(e) => setCaseId(e.target.value)}>
          <option value="">Select…</option>
          {cases.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Type</Label>
        <select
          className={selectCls}
          value={type}
          onChange={(e) => setType(e.target.value as typeof type)}
        >
          <option value="deposit">Deposit</option>
          <option value="full">Full / balance</option>
          <option value="installment">Installment</option>
        </select>
      </div>
      <div className="space-y-1.5">
        <Label>Amount (USD)</Label>
        <Input
          type="number"
          min="1"
          step="0.01"
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="500.00"
        />
      </div>
      <div className="space-y-1.5">
        <Label>Description</Label>
        <Input
          value={description}
          onChange={(e) => setDescription(e.target.value)}
          placeholder="Full Concierge — balance"
        />
      </div>
      <div className="sm:col-span-2">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Requesting…" : "Request payment"}
        </Button>
      </div>
    </div>
  )
}
