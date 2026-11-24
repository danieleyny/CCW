"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { Loader2 } from "lucide-react";
import { toast } from "sonner";
import { requestPayment } from "@/app/admin/actions";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { BrandChip } from "@/components/admin/brand-chip";
import type { BrandKey } from "@/config/brands";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

const modeToPackage = (m: string | null | undefined) =>
  m === "concierge" ? "full_concierge" : m === "self_guided" ? "self_guided" : "";

type CaseOption = {
  id: string;
  name: string;
  serviceMode?: string | null;
  brand: BrandKey;
};

function defaultPackage(item: CaseOption | undefined) {
  const fromMode = modeToPackage(item?.serviceMode);
  if (item?.brand === "fl") return fromMode === "self_guided" ? fromMode : "self_guided";
  return fromMode === "full_concierge" ? fromMode : "full_concierge";
}

function dollars(value: string) {
  const amount = Number.parseFloat(value);
  if (!Number.isFinite(amount)) return "$0";
  return new Intl.NumberFormat("en-US", { style: "currency", currency: "USD" }).format(amount);
}

export function RequestPaymentForm({
  cases,
  onSuccess,
  stripeEnabled = false,
  isAdmin = false,
}: {
  cases: CaseOption[];
  onSuccess?: () => void;
  stripeEnabled?: boolean;
  isAdmin?: boolean;
}) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [caseId, setCaseId] = useState("");
  const [amount, setAmount] = useState("");
  const [type, setType] = useState<"deposit" | "full" | "installment">("deposit");
  const [description, setDescription] = useState("");
  const [packageKey, setPackageKey] = useState("");
  const [allowOtherBrandPackage, setAllowOtherBrandPackage] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Default the package to the case's chosen path so an invoice, once paid,
  // unlocks the right thing.
  function pickCase(id: string) {
    const item = cases.find((c) => c.id === id);
    setCaseId(id);
    setPackageKey(defaultPackage(item));
    setAllowOtherBrandPackage(false);
    setError(null);
  }

  function submit() {
    const cents = Math.round(parseFloat(amount) * 100);
    if (!caseId) return setError("Pick a client.");
    if (!cents || cents < 50) return setError("Enter a valid amount.");
    setError(null);
    start(async () => {
      const res = await requestPayment({
        caseId,
        amountCents: cents,
        type,
        description,
        packageKey: packageKey || undefined,
        allowOtherBrandPackage,
      });
      if (!res.ok) {
        setError(res.error ?? "The payment request could not be sent.");
        return;
      }
      if (res.hostedInvoiceUrl !== undefined && !res.fallback) {
        toast.success("Invoice sent to the client");
      } else {
        toast.success("Payment request saved — a task was opened to send the invoice");
      }
      setAmount("");
      setDescription("");
      router.refresh();
      onSuccess?.();
    });
  }

  const selectedCase = cases.find((item) => item.id === caseId);
  const visiblePackages = allowOtherBrandPackage
    ? ["self_guided", "full_concierge"]
    : selectedCase?.brand === "fl"
      ? ["self_guided"]
      : ["full_concierge"];

  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div className="space-y-1.5">
        <Label htmlFor="rp-client">Client</Label>
        <Select value={caseId} onValueChange={pickCase}>
          <SelectTrigger id="rp-client" className="w-full">
            <SelectValue placeholder="Select…" />
          </SelectTrigger>
          <SelectContent>
            {cases.map((c) => (
              <SelectItem key={c.id} value={c.id}>
                {c.name} · {c.brand === "fl" ? "FL" : "GLN"}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-package">Package (unlocks on payment)</Label>
        <Select
          value={packageKey || "none"}
          onValueChange={(v) => setPackageKey(v === "none" ? "" : v)}
        >
          <SelectTrigger id="rp-package" className="w-full">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="none">None</SelectItem>
            {visiblePackages.includes("self_guided") ? (
              <SelectItem value="self_guided">Self-Guided</SelectItem>
            ) : null}
            {visiblePackages.includes("full_concierge") ? (
              <SelectItem value="full_concierge">Full Concierge</SelectItem>
            ) : null}
          </SelectContent>
        </Select>
        {isAdmin && selectedCase ? (
          <label className="flex items-start gap-2 pt-1 text-xs leading-relaxed text-[#667085]">
            <input
              type="checkbox"
              checked={allowOtherBrandPackage}
              onChange={(event) => {
                setAllowOtherBrandPackage(event.target.checked);
                setPackageKey(defaultPackage(selectedCase));
              }}
              className="mt-0.5 size-4 rounded border-black/30 accent-[#14254A]"
            />
            <span>Allow other brand&apos;s package (logged)</span>
          </label>
        ) : null}
      </div>
      <div className="space-y-1.5">
        <Label htmlFor="rp-type">Type</Label>
        <Select value={type} onValueChange={(v) => setType(v as typeof type)}>
          <SelectTrigger id="rp-type" className="w-full">
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
        <div className="mb-3 rounded-xl border border-black/10 bg-[#F8F9FB] p-3 text-sm leading-relaxed text-[#475467]">
          <span className="mr-2 inline-flex align-middle">
            {selectedCase ? <BrandChip brand={selectedCase.brand} /> : null}
          </span>
          {selectedCase?.name || "The client"} gets an email with a payment link for{" "}
          <strong className="text-[#101828]">{dollars(amount)}</strong>.{" "}
          {packageKey
            ? `${packageKey === "full_concierge" ? "Full Concierge" : "Self-Guided"} unlocks when it is paid.`
            : "No package unlock is attached."}
          {!stripeEnabled
            ? " This opens a task to send the invoice manually while Stripe is off."
            : null}
        </div>
        {error ? (
          <p role="alert" className="mb-3 text-sm font-medium text-[#B42318]">
            {error}
          </p>
        ) : null}
        <Button
          onClick={submit}
          disabled={pending}
          aria-busy={pending}
          className="w-full bg-[#14254A] text-white"
        >
          {pending && <Loader2 className="mr-1.5 size-4 animate-spin" />}
          {pending ? "Sending…" : `Send ${dollars(amount)} request`}
        </Button>
      </div>
    </div>
  );
}
