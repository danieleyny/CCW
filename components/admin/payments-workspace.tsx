"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import {
  CheckCircle2,
  CircleHelp,
  Clock3,
  Download,
  ExternalLink,
  Gift,
  Loader2,
  Plus,
  ReceiptText,
  RotateCcw,
  Search,
  TestTube2,
  Trash2,
  TriangleAlert,
  XCircle,
} from "lucide-react";
import { toast } from "sonner";
import { deleteDemoCases, markCasesAsTest } from "@/app/admin/actions";
import { RequestPaymentForm } from "@/components/admin/request-payment-form";
import { RecordOfflinePaymentForm } from "@/components/admin/record-offline-payment-form";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { trackEvent } from "@/lib/analytics";
import type {
  AdminPaymentFilter,
  AdminPaymentRow,
  AdminPaymentState,
  AdminPaymentsData,
} from "@/lib/admin/payments";
import { cn } from "@/lib/utils";
import { BrandChip } from "@/components/admin/brand-chip";
import { persistAdminBrandFilter } from "@/lib/admin/brand-filter-client";

const FILTERS: Array<{ key: AdminPaymentFilter; label: string }> = [
  { key: "all", label: "All" },
  { key: "requested", label: "Requested" },
  { key: "paid", label: "Paid" },
  { key: "comped", label: "Comped" },
  { key: "failed", label: "Failed & refunded" },
];

function money(cents: number, currency = "usd") {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: currency.toUpperCase(),
    maximumFractionDigits: 0,
  }).format(cents / 100);
}

function date(value: string) {
  return new Intl.DateTimeFormat("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "America/New_York",
  }).format(new Date(value));
}

function csvCell(value: string | number | null) {
  const text = String(value ?? "");
  return `"${text.replaceAll('"', '""')}"`;
}

function StatusChip({ state, ageDays }: { state: AdminPaymentState; ageDays: number }) {
  if (state === "comped")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[var(--comp-border)] bg-[var(--comp-tint)] px-2.5 py-1 text-[11px] font-semibold text-[var(--comp)]">
        <Gift className="size-3.5" aria-hidden />
        Comped
      </span>
    );
  if (state === "paid")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#B7E2CA] bg-[#E8F6EE] px-2.5 py-1 text-[11px] font-semibold text-[#16734A]">
        <CheckCircle2 className="size-3.5" aria-hidden />
        Paid
      </span>
    );
  if (state === "requested")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F2D59A] bg-[#FFF7E6] px-2.5 py-1 text-[11px] font-semibold text-[#805B00]">
        <Clock3 className="size-3.5" aria-hidden />
        Requested · {ageDays} days
      </span>
    );
  if (state === "failed")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#F4B8B2] bg-[#FFF3F2] px-2.5 py-1 text-[11px] font-semibold text-[#B42318]">
        <XCircle className="size-3.5" aria-hidden />
        Failed
      </span>
    );
  if (state === "refunded")
    return (
      <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D0D5DD] bg-[#F2F4F7] px-2.5 py-1 text-[11px] font-semibold text-[#475467]">
        <RotateCcw className="size-3.5" aria-hidden />
        Refunded
      </span>
    );
  return (
    <span className="inline-flex items-center gap-1.5 rounded-full border border-[#D0D5DD] bg-[#F2F4F7] px-2.5 py-1 text-[11px] font-semibold text-[#475467]">
      <CircleHelp className="size-3.5" aria-hidden />
      Status unknown — check Stripe
    </span>
  );
}

function NumberCard({
  label,
  value,
  note,
  tone = "default",
  className,
}: {
  label: string;
  value: string;
  note: string;
  tone?: "default" | "amber" | "comp";
  className?: string;
}) {
  return (
    <section
      className={cn(
        "rounded-2xl border bg-white p-4 shadow-[0_1px_2px_rgba(16,24,40,.04)] sm:p-5",
        tone === "default" && "border-black/[.08]",
        tone === "amber" && "border-[#E7C46F] bg-gradient-to-br from-[#FFFDF7] to-[#FFF5D9]",
        tone === "comp" &&
          "border-[var(--comp-border)] bg-gradient-to-br from-[var(--comp-tint)] to-white",
        className,
      )}
    >
      <p
        className={cn(
          "font-mono text-[10px] font-semibold uppercase tracking-[.13em]",
          tone === "comp"
            ? "text-[var(--comp)]"
            : tone === "amber"
              ? "text-[#805B00]"
              : "text-[#667085]",
        )}
      >
        {label}
      </p>
      <p className="mt-2 font-[family-name:var(--font-title)] text-[29px] font-semibold leading-none tracking-[-.02em] text-[#101828] sm:text-[34px]">
        {value}
      </p>
      <p className="mt-2 text-[11px] leading-relaxed text-[#667085]">{note}</p>
    </section>
  );
}

function Chart({ data }: { data: AdminPaymentsData }) {
  const max = Math.max(1, ...data.months.map((month) => month.collectedCents));
  return (
    <section
      className="rounded-2xl border border-black/[.08] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]"
      role="img"
      aria-label={data.chartSummary}
    >
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-[#667085]">
            Last 12 calendar months
          </p>
          <h2 className="mt-1 font-[family-name:var(--font-title)] text-2xl font-semibold text-[#101828]">
            Collected by month
          </h2>
        </div>
        <div className="flex gap-4 text-[10px] font-medium text-[#667085]">
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-[#14254A]" />
            Collected
          </span>
          <span className="flex items-center gap-1.5">
            <span className="size-2 rounded-sm bg-[var(--comp)]" />
            Comps (count)
          </span>
        </div>
      </div>
      <div className="mt-8 grid h-[245px] grid-cols-12 items-end gap-2 sm:gap-3">
        {data.months.map((month) => {
          const height =
            month.collectedCents > 0 ? Math.max(6, (month.collectedCents / max) * 160) : 2;
          return (
            <div key={month.key} className="flex h-full min-w-0 flex-col items-center justify-end">
              <div className="mb-1 flex min-h-[38px] flex-col items-center justify-end gap-1">
                {month.compCount > 0 ? (
                  <span className="whitespace-nowrap rounded-full bg-[var(--comp-tint)] px-1.5 py-0.5 text-[8px] font-semibold text-[var(--comp)]">
                    {month.compCount} comp{month.compCount === 1 ? "" : "s"}
                  </span>
                ) : null}
                <span className="whitespace-nowrap font-mono text-[8px] font-semibold text-[#475467] sm:text-[9px]">
                  {money(month.collectedCents)}
                </span>
              </div>
              <div
                className={cn(
                  "w-full max-w-9 rounded-t-md",
                  month.current
                    ? "bg-[#D9B25F]"
                    : month.collectedCents
                      ? "bg-[#14254A]"
                      : "bg-[#D0D5DD]",
                )}
                style={{ height }}
              />
              <span
                className={cn(
                  "mt-2 font-mono text-[8px] uppercase sm:text-[9px]",
                  month.current ? "font-bold text-[#805B00]" : "text-[#667085]",
                )}
              >
                {month.label}
              </span>
            </div>
          );
        })}
      </div>
      <table className="sr-only">
        <caption>{data.chartSummary}</caption>
        <thead>
          <tr>
            <th>Month</th>
            <th>Collected</th>
            <th>Comps</th>
          </tr>
        </thead>
        <tbody>
          {data.months.map((month) => (
            <tr key={month.key}>
              <th>
                {month.label} {month.key.slice(0, 4)}
              </th>
              <td>{money(month.collectedCents)}</td>
              <td>{month.compCount}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </section>
  );
}

function Aging({ data }: { data: AdminPaymentsData }) {
  const buckets = [
    { label: "0–14 days", amount: data.aging.under15Cents, color: "bg-[#D9B25F]" },
    { label: "15–30 days", amount: data.aging.days15To30Cents, color: "bg-[#E09B3D]" },
    { label: "30+ days", amount: data.aging.over30Cents, color: "bg-[#B54708]" },
  ];
  const total = Math.max(1, data.stats.requestedCents);
  return (
    <section className="rounded-2xl border border-black/[.08] bg-white p-5 shadow-[0_1px_2px_rgba(16,24,40,.04)]">
      <p className="font-mono text-[10px] font-semibold uppercase tracking-[.13em] text-[#667085]">
        Open invoices
      </p>
      <h2 className="mt-1 font-[family-name:var(--font-title)] text-2xl font-semibold text-[#101828]">
        Unpaid by age
      </h2>
      <div className="mt-5 flex h-3 overflow-hidden rounded-full bg-[#EAECF0]">
        {buckets.map((bucket) =>
          bucket.amount > 0 ? (
            <span
              key={bucket.label}
              className={bucket.color}
              style={{ width: `${(bucket.amount / total) * 100}%` }}
            />
          ) : null,
        )}
      </div>
      <dl className="mt-5 divide-y divide-black/[.07]">
        {buckets.map((bucket) => (
          <div key={bucket.label} className="flex items-center justify-between gap-4 py-3 text-sm">
            <dt className="flex items-center gap-2 text-[#475467]">
              <span className={cn("size-2 rounded-full", bucket.color)} />
              {bucket.label}
            </dt>
            <dd className="font-mono font-semibold text-[#101828]">{money(bucket.amount)}</dd>
          </div>
        ))}
        <div className="flex items-center justify-between gap-4 py-3 text-sm">
          <dt className="flex items-center gap-2 font-medium text-[var(--comp)]">
            <Gift className="size-4" />
            Comped this year · {data.aging.compedThisYear}
          </dt>
          <dd className="font-mono font-semibold text-[var(--comp)]">$0</dd>
        </div>
      </dl>
    </section>
  );
}

function MobileLedgerRow({ row }: { row: AdminPaymentRow }) {
  return (
    <article
      className={cn(
        "rounded-xl border border-black/[.08] bg-white p-4 shadow-sm",
        row.state === "comped" &&
          "border-l-[3px] border-l-[var(--comp)] bg-gradient-to-r from-[var(--comp-tint)] to-white",
        row.state === "requested" && row.ageDays > 30 && "border-l-[3px] border-l-[#B54708]",
      )}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <div className="flex items-center gap-1.5">
            <h3 className="truncate text-sm font-semibold text-[#101828]">{row.clientName}</h3>
            <BrandChip brand={row.brand} />
          </div>
          <p className="mt-1 truncate font-mono text-[9px] uppercase tracking-[.08em] text-[#667085]">
            {date(row.paidAt ?? row.createdAt)} · {row.packageLabel} · {row.type}
          </p>
        </div>
        <p
          className={cn(
            "shrink-0 font-mono text-base font-semibold text-[#101828]",
            row.state === "comped" && "text-[var(--comp)]",
            ["failed", "refunded"].includes(row.state) && "text-[#667085] line-through",
          )}
        >
          {row.state === "comped" ? "$0" : money(row.amountCents, row.currency)}
        </p>
      </div>
      <div className="mt-3 flex min-w-0 items-center gap-2">
        <StatusChip state={row.state} ageDays={row.ageDays} />
        <span className="min-w-0 truncate text-[10.5px] text-[#667085]">{row.detail}</span>
        {row.caseId ? (
          <Link
            href={`/admin/cases/${row.caseId}`}
            className="ml-auto shrink-0 text-[10.5px] font-semibold text-[#14254A] underline underline-offset-2"
          >
            Open case
          </Link>
        ) : null}
      </div>
    </article>
  );
}

function PaymentDialog({
  kind,
  open,
  onOpenChange,
  data,
  stripeEnabled,
}: {
  kind: "request" | "offline";
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AdminPaymentsData;
  stripeEnabled: boolean;
}) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[92svh] overflow-y-auto bg-white text-[#101828] max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl sm:max-w-2xl">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-title)] text-2xl font-semibold">
            {kind === "request" ? "Request a payment" : "Record offline payment"}
          </DialogTitle>
          <DialogDescription>
            {kind === "request"
              ? "Send a clear payment request without changing the case until it is paid."
              : "Record money already received outside Stripe. This unlocks the selected package."}
          </DialogDescription>
        </DialogHeader>
        <div className="px-4 pb-6 sm:px-6">
          {kind === "request" ? (
            <RequestPaymentForm
              cases={data.caseOptions}
              stripeEnabled={stripeEnabled}
              isAdmin={data.isAdmin}
              onSuccess={() => {
                trackEvent("admin_payment_request_sent");
                onOpenChange(false);
              }}
            />
          ) : (
            <RecordOfflinePaymentForm
              cases={data.caseOptions}
              onSuccess={() => {
                trackEvent("admin_offline_payment_recorded");
                onOpenChange(false);
              }}
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

function TestDataDialog({
  open,
  onOpenChange,
  data,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  data: AdminPaymentsData;
}) {
  const router = useRouter();
  const review = data.testReview;
  const [selected, setSelected] = useState<string[]>([]);
  const [confirmMark, setConfirmMark] = useState(false);
  const [confirmation, setConfirmation] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  if (!review) return null;
  const selectedClients = review.suggestions.filter((client) => selected.includes(client.clientId));
  const selectedCaseIds = selectedClients.flatMap((client) => client.caseIds);
  const deletableCaseIds = review.deletableCaseIds;
  const expected = `DELETE ${review.deletableClientCount}`;

  function mark() {
    setError(null);
    startTransition(async () => {
      const response = await markCasesAsTest(selectedCaseIds);
      if (response.error) return setError(response.error);
      trackEvent("admin_test_data_marked", { count: selectedClients.length });
      toast.success(
        `Marked ${selectedClients.length} client${selectedClients.length === 1 ? "" : "s"} as test.`,
      );
      setSelected([]);
      setConfirmMark(false);
      router.refresh();
    });
  }

  function remove() {
    if (confirmation !== expected) return;
    setError(null);
    startTransition(async () => {
      const response = await deleteDemoCases(deletableCaseIds);
      if (response.error) return setError(response.error);
      const deleted = response.deletedClients ?? 0;
      trackEvent("admin_test_data_deleted", { count: deleted, excluded: response.excluded ?? 0 });
      setResult(`Deleted ${deleted} test client${deleted === 1 ? "" : "s"}.`);
      router.refresh();
    });
  }

  function changeOpen(next: boolean) {
    if (pending) return;
    if (!next) {
      setSelected([]);
      setConfirmMark(false);
      setConfirmation("");
      setError(null);
      setResult(null);
    }
    onOpenChange(next);
  }

  return (
    <Dialog open={open} onOpenChange={changeOpen}>
      <DialogContent className="max-h-[92svh] overflow-y-auto bg-white text-[#101828] max-sm:inset-x-0 max-sm:bottom-0 max-sm:top-auto max-sm:w-full max-sm:max-w-none max-sm:translate-x-0 max-sm:translate-y-0 max-sm:rounded-b-none max-sm:rounded-t-2xl sm:max-w-3xl">
        <DialogHeader>
          <DialogTitle className="font-[family-name:var(--font-title)] text-2xl font-semibold">
            Review test data
          </DialogTitle>
          <DialogDescription>
            Test clients are hidden from Payments and every total. Nothing is deleted here unless
            you confirm below.
          </DialogDescription>
        </DialogHeader>
        <div className="space-y-6 px-4 pb-7 sm:px-6">
          <section>
            <h3 className="text-sm font-semibold text-[#101828]">Marked as test</h3>
            <p className="mt-1 text-xs text-[#667085]">
              {review.marked.length} clients ·{" "}
              {review.marked.reduce((sum, client) => sum + client.paymentCount, 0)} payments
            </p>
            {review.marked.length ? (
              <details className="mt-3 rounded-xl border border-black/10 bg-[#F8F9FB] p-3">
                <summary className="cursor-pointer text-sm font-semibold text-[#14254A]">
                  View marked clients
                </summary>
                <ul className="mt-3 divide-y divide-black/[.07]">
                  {review.marked.map((client) => (
                    <li
                      key={client.clientId}
                      className="flex items-center justify-between gap-3 py-2 text-sm"
                    >
                      <span>{client.name}</span>
                      <span className="text-xs text-[#667085]">
                        {date(client.createdAt)} · {client.paymentCount} payment
                        {client.paymentCount === 1 ? "" : "s"}
                      </span>
                    </li>
                  ))}
                </ul>
              </details>
            ) : (
              <p className="mt-3 text-sm text-[#667085]">No clients are marked as test.</p>
            )}
          </section>
          <section className="border-t border-black/10 pt-5">
            <h3 className="text-sm font-semibold text-[#101828]">Look like tests</h3>
            <p className="mt-1 text-xs leading-relaxed text-[#667085]">
              Suggestions only. Nothing changes until you select people and confirm.
            </p>
            {review.suggestions.length ? (
              <ul className="mt-3 divide-y divide-black/[.07] rounded-xl border border-black/10">
                {review.suggestions.map((client) => (
                  <li key={client.clientId}>
                    <label className="flex cursor-pointer items-center gap-3 p-3 text-sm">
                      <input
                        type="checkbox"
                        checked={selected.includes(client.clientId)}
                        onChange={(event) =>
                          setSelected((current) =>
                            event.target.checked
                              ? [...current, client.clientId]
                              : current.filter((id) => id !== client.clientId),
                          )
                        }
                        className="size-4 rounded border-black/30 accent-[#14254A]"
                      />
                      <span className="min-w-0 flex-1">
                        <strong className="block truncate">{client.name}</strong>
                        <span className="block truncate text-xs text-[#667085]">
                          {client.email ?? "No email"}
                        </span>
                      </span>
                    </label>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="mt-3 text-sm text-[#667085]">
                No additional clients match the test heuristics.
              </p>
            )}
            {confirmMark ? (
              <div className="mt-3 rounded-xl border border-[#E7C46F] bg-[#FFF8E7] p-3">
                <p className="text-sm font-semibold text-[#805B00]">
                  Mark {selectedClients.length} client{selectedClients.length === 1 ? "" : "s"} as
                  test?
                </p>
                <p className="mt-1 text-xs text-[#805B00]">
                  They&apos;ll be hidden everywhere and can be deleted later.
                </p>
                <div className="mt-3 flex gap-2">
                  <Button
                    size="sm"
                    variant="outline"
                    disabled={pending}
                    onClick={() => setConfirmMark(false)}
                  >
                    Cancel
                  </Button>
                  <Button
                    size="sm"
                    disabled={pending}
                    onClick={mark}
                    className="bg-[#14254A] text-white"
                  >
                    {pending ? <Loader2 className="size-4 animate-spin" /> : null}Mark selected as
                    test
                  </Button>
                </div>
              </div>
            ) : (
              <Button
                type="button"
                variant="outline"
                className="mt-3"
                disabled={!selected.length}
                onClick={() => setConfirmMark(true)}
              >
                <TestTube2 className="size-4" />
                Mark selected as test
              </Button>
            )}
          </section>
          <section className="border-t border-black/10 pt-5">
            <h3 className="text-sm font-semibold text-[#101828]">Delete test clients</h3>
            <div className="mt-3 rounded-xl border border-[#F4B8B2] bg-[#FFF3F2] p-4 text-sm text-[#912018]">
              <p className="flex items-center gap-2 font-semibold">
                <TriangleAlert className="size-4" />
                Deleting is permanent
              </p>
              <p className="mt-1 text-xs">
                It removes their cases, payments, documents and messages.
              </p>
            </div>
            {review.excluded.length ? (
              <div className="mt-3 rounded-xl border border-[#E7C46F] bg-[#FFF8E7] p-3 text-sm text-[#805B00]">
                <strong>
                  {review.excluded.length} test client{review.excluded.length === 1 ? "" : "s"} have
                  real Stripe payments and will not be deleted.
                </strong>
                <p className="mt-1 text-xs">
                  Review manually: {review.excluded.map((client) => client.name).join(", ")}
                </p>
              </div>
            ) : null}
            {review.deletableClientCount > 0 ? (
              <div className="mt-4 space-y-2">
                <Label htmlFor="payments-delete-test">
                  Type <strong>{expected}</strong> to confirm
                </Label>
                <Input
                  id="payments-delete-test"
                  value={confirmation}
                  onChange={(event) => setConfirmation(event.target.value)}
                  autoComplete="off"
                />
                <Button
                  variant="destructive"
                  disabled={pending || confirmation !== expected}
                  onClick={remove}
                >
                  {pending ? (
                    <Loader2 className="size-4 animate-spin" />
                  ) : (
                    <Trash2 className="size-4" />
                  )}
                  Delete test clients
                </Button>
              </div>
            ) : (
              <p className="mt-3 text-sm text-[#667085]">There are no deletable test clients.</p>
            )}
          </section>
          {error ? (
            <p
              role="alert"
              className="rounded-xl bg-[#FFF3F2] p-3 text-sm font-medium text-[#B42318]"
            >
              {error}
            </p>
          ) : null}
          {result ? (
            <p
              role="status"
              className="rounded-xl bg-[#E8F6EE] p-3 text-sm font-medium text-[#16734A]"
            >
              {result}
            </p>
          ) : null}
        </div>
      </DialogContent>
    </Dialog>
  );
}

export function PaymentsWorkspace({
  data,
  stripeEnabled,
}: {
  data: AdminPaymentsData;
  stripeEnabled: boolean;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const params = useSearchParams();
  const [q, setQ] = useState(data.q);
  const [requestOpen, setRequestOpen] = useState(false);
  const [offlineOpen, setOfflineOpen] = useState(false);
  const [testOpen, setTestOpen] = useState(false);
  function href(updates: Record<string, string | null>) {
    const next = new URLSearchParams(params.toString());
    for (const [key, value] of Object.entries(updates)) {
      if (!value || value === "all" || (value === "1" && key === "page")) next.delete(key);
      else next.set(key, value);
    }
    const query = next.toString();
    return `${pathname}${query ? `?${query}` : ""}`;
  }

  const clearHref = href({ filter: null, q: null, brand: null, page: null });
  function exportCsv() {
    const header = ["Date", "Client", "Package", "Type", "How / details", "Amount", "Status"];
    const rows = data.exportRows.map((row) => [
      date(row.paidAt ?? row.createdAt),
      row.clientName,
      row.packageLabel,
      row.type,
      row.detail,
      row.state === "comped" ? "$0 · comp" : money(row.amountCents, row.currency),
      row.state,
    ]);
    const csv = [header, ...rows].map((row) => row.map(csvCell).join(",")).join("\n");
    const url = URL.createObjectURL(new Blob([csv], { type: "text/csv;charset=utf-8" }));
    const link = document.createElement("a");
    link.href = url;
    link.download = `payments-${new Date().toISOString().slice(0, 10)}.csv`;
    link.click();
    URL.revokeObjectURL(url);
  }

  const noFilters = data.filter === "all" && data.brand === "all" && !data.q;
  return (
    <div className="admin-payments mx-auto max-w-[1520px] pb-16 md:pb-0">
      <header className="mb-5 flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <h1 className="font-[family-name:var(--font-title)] text-[34px] font-semibold leading-none tracking-[-.02em] text-[#101828]">
            Payments
          </h1>
          <p className="mt-2 max-w-2xl text-[13px] leading-relaxed text-[#667085]">
            Revenue, what&apos;s owed and how old it is — with the full ledger below.
          </p>
        </div>
        <div className="hidden flex-wrap gap-2 md:flex">
          <Button type="button" variant="outline" onClick={exportCsv}>
            <Download className="size-4" />
            Export CSV
          </Button>
          {data.isAdmin ? (
            <Button type="button" variant="outline" onClick={() => setOfflineOpen(true)}>
              <ReceiptText className="size-4" />
              Record offline payment
            </Button>
          ) : null}
          <Button
            type="button"
            onClick={() => setRequestOpen(true)}
            className="bg-[#14254A] text-white"
          >
            <Plus className="size-4" />
            Request payment
          </Button>
        </div>
      </header>

      <nav aria-label="Payment brand" className="mb-4 flex gap-2">
        {(
          [
            ["all", "All brands"],
            ["gln", "GLN"],
            ["fl", "FL"],
          ] as const
        ).map(([key, label]) => (
          <Link
            key={key}
            href={href({ brand: key === "all" ? null : key, page: null })}
            onClick={() => persistAdminBrandFilter(key)}
            aria-current={data.brand === key ? "page" : undefined}
            className={cn(
              "rounded-full border px-3 py-1.5 text-xs font-semibold",
              data.brand === key
                ? "border-[#14254A] bg-[#14254A] text-white"
                : "border-black/10 bg-white text-[#475467]",
            )}
          >
            {label}
          </Link>
        ))}
      </nav>

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <NumberCard
          label="Collected · last 12 months"
          value={money(data.stats.collectedCents)}
          note="Real payments only"
        />
        <NumberCard
          label="Requested, unpaid"
          value={money(data.stats.requestedCents)}
          note={`${data.stats.requestedCount} invoices · oldest ${data.stats.oldestRequestedDays} days`}
          tone="amber"
        />
        <NumberCard
          label="Comped"
          value={`${data.stats.compedClients} clients`}
          note="Access codes · $0 collected · not revenue"
          tone="comp"
          className="col-span-2 lg:col-span-1"
        />
        <NumberCard
          label="This month"
          value={money(data.stats.thisMonthCents)}
          note={`${data.stats.thisMonthPayments} payments · ${data.stats.thisMonthComps} comps`}
          className="hidden lg:block"
        />
      </div>
      <p className="mt-3 text-center text-xs text-[#667085] md:hidden">See charts on desktop</p>

      <div className="mt-5 hidden gap-4 md:grid xl:grid-cols-[minmax(0,1fr)_340px]">
        <Chart data={data} />
        <Aging data={data} />
      </div>

      <section className="mt-5 overflow-hidden rounded-2xl border border-black/[.08] bg-white shadow-[0_1px_2px_rgba(16,24,40,.04)]">
        <div className="border-b border-black/[.08] p-3 sm:p-4">
          <div className="admin-filter-scroll -mx-1 flex items-center gap-2 overflow-x-auto px-1 pb-1">
            {FILTERS.map((item) => (
              <Link
                key={item.key}
                href={href({ filter: item.key === "all" ? null : item.key, page: null })}
                aria-current={data.filter === item.key ? "page" : undefined}
                className={cn(
                  "flex min-h-9 shrink-0 items-center gap-1.5 rounded-full border px-3 text-xs font-semibold",
                  data.filter === item.key
                    ? "border-[#14254A] bg-[#14254A] text-white"
                    : item.key === "comped"
                      ? "border-[var(--comp-border)] bg-[var(--comp-tint)] text-[var(--comp)]"
                      : "border-black/10 bg-white text-[#475467]",
                )}
              >
                {item.label}
                <span
                  className={cn(
                    "rounded-full px-1.5 py-0.5 text-[9px]",
                    data.filter === item.key ? "bg-white/15" : "bg-black/[.05]",
                  )}
                >
                  {data.counts[item.key]}
                </span>
              </Link>
            ))}
            <form
              onSubmit={(event) => {
                event.preventDefault();
                router.push(href({ q: q.trim() || null, page: null }));
              }}
              className="ml-auto hidden min-w-[240px] items-center gap-2 lg:flex"
            >
              <Label htmlFor="payment-search" className="sr-only">
                Search by client name
              </Label>
              <div className="relative flex-1">
                <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98A2B3]" />
                <Input
                  id="payment-search"
                  value={q}
                  onChange={(event) => setQ(event.target.value)}
                  placeholder="Search client"
                  className="h-9 pl-9"
                />
              </div>
            </form>
          </div>
          <form
            onSubmit={(event) => {
              event.preventDefault();
              router.push(href({ q: q.trim() || null, page: null }));
            }}
            className="mt-3 flex gap-2 lg:hidden"
          >
            <Label htmlFor="payment-search-mobile" className="sr-only">
              Search by client name
            </Label>
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-[#98A2B3]" />
              <Input
                id="payment-search-mobile"
                value={q}
                onChange={(event) => setQ(event.target.value)}
                placeholder="Search client"
                className="pl-9"
              />
            </div>
            <Button type="submit" variant="outline">
              Search
            </Button>
          </form>
        </div>

        {data.rows.length === 0 ? (
          <div className="px-5 py-16 text-center">
            <h2 className="font-[family-name:var(--font-title)] text-2xl font-semibold text-[#101828]">
              {noFilters ? "No payments yet." : "No payments match these filters"}
            </h2>
            {!noFilters ? (
              <Button asChild variant="outline" className="mt-4">
                <Link href={clearHref} onClick={() => persistAdminBrandFilter("all")}>Clear filters</Link>
              </Button>
            ) : null}
          </div>
        ) : (
          <>
            <div className="space-y-3 bg-[#F8F9FB] p-3 lg:hidden">
              {data.rows.map((row) => (
                <MobileLedgerRow key={row.id} row={row} />
              ))}
            </div>
            <div className="hidden overflow-x-auto lg:block">
              <table className="w-full border-collapse text-left">
                <thead>
                  <tr className="border-b border-black/[.08] bg-[#F8F9FB] font-mono text-[9px] uppercase tracking-[.1em] text-[#667085]">
                    <th className="px-4 py-3 font-semibold">Date</th>
                    <th className="px-4 py-3 font-semibold">Client + package</th>
                    <th className="px-4 py-3 font-semibold">How / details</th>
                    <th className="px-4 py-3 text-right font-semibold">Amount</th>
                    <th className="px-4 py-3 font-semibold">Status</th>
                    <th className="hidden px-4 py-3 font-semibold xl:table-cell">Docs</th>
                    <th className="px-4 py-3 font-semibold">Case</th>
                  </tr>
                </thead>
                <tbody>
                  {data.rows.map((row) => (
                    <tr
                      key={row.id}
                      className={cn(
                        "border-b border-black/[.07] last:border-b-0",
                        row.state === "comped" &&
                          "border-l-[3px] border-l-[var(--comp)] bg-gradient-to-r from-[var(--comp-tint)] to-white",
                        row.state === "requested" &&
                          row.ageDays > 30 &&
                          "border-l-[3px] border-l-[#B54708]",
                      )}
                    >
                      <td className="whitespace-nowrap px-4 py-4 font-mono text-[10px] text-[#667085]">
                        {date(row.paidAt ?? row.createdAt)}
                      </td>
                      <td className="min-w-[190px] px-4 py-4">
                        <strong className="flex items-center gap-1.5 text-sm text-[#101828]">
                          {row.clientName}
                          <BrandChip brand={row.brand} />
                          {row.isTest ? (
                            <span className="ml-2 rounded-full bg-[#FFF3D6] px-1.5 py-0.5 font-mono text-[8px] uppercase text-[#805B00]">
                              Test
                            </span>
                          ) : null}
                        </strong>
                        <span className="mt-1 block font-mono text-[9px] uppercase tracking-[.08em] text-[#667085]">
                          {row.packageLabel} · {row.type}
                        </span>
                      </td>
                      <td className="max-w-[300px] px-4 py-4 text-xs text-[#475467]">
                        <span className="line-clamp-2">{row.detail}</span>
                        {row.documentUrl ? (
                          <a
                            href={row.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="mt-1 inline-flex items-center gap-1 font-semibold text-[#14254A] underline underline-offset-2 xl:hidden"
                          >
                            {row.documentLabel}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : null}
                      </td>
                      <td
                        className={cn(
                          "whitespace-nowrap px-4 py-4 text-right font-mono text-sm font-semibold text-[#101828]",
                          row.state === "comped" && "text-[var(--comp)]",
                          ["failed", "refunded"].includes(row.state) &&
                            "text-[#667085] line-through",
                        )}
                      >
                        {row.state === "comped"
                          ? "$0 · comp"
                          : money(row.amountCents, row.currency)}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4">
                        <StatusChip state={row.state} ageDays={row.ageDays} />
                      </td>
                      <td className="hidden px-4 py-4 text-xs xl:table-cell">
                        {row.documentUrl ? (
                          <a
                            href={row.documentUrl}
                            target="_blank"
                            rel="noreferrer"
                            className="inline-flex items-center gap-1 font-semibold text-[#14254A] underline underline-offset-2"
                          >
                            {row.documentLabel}
                            <ExternalLink className="size-3" />
                          </a>
                        ) : (
                          <span className="text-[#98A2B3]">—</span>
                        )}
                      </td>
                      <td className="whitespace-nowrap px-4 py-4 text-xs">
                        {row.caseId ? (
                          <Link
                            href={`/admin/cases/${row.caseId}`}
                            className="font-semibold text-[#14254A] underline underline-offset-2"
                          >
                            Open case
                          </Link>
                        ) : (
                          <span className="text-[#98A2B3]">—</span>
                        )}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </>
        )}
        {data.hasMore ? (
          <div className="border-t border-black/[.08] p-4 text-center">
            <Button asChild variant="outline">
              <Link href={href({ page: String(data.page + 1) })}>Load more</Link>
            </Button>
          </div>
        ) : null}
      </section>

      {data.hiddenTests.clients > 0 || data.isAdmin ? (
        <p className="mt-3 text-xs leading-relaxed text-[#667085]">
          <TestTube2 className="mr-1 inline size-3.5" />
          {data.hiddenTests.clients} test clients and their {data.hiddenTests.payments} payments are{" "}
          {data.showTests ? "shown" : "hidden and left out of every total"}.{" "}
          {data.isAdmin ? (
            <>
              <Link
                href={href({ test: data.showTests ? null : "1", page: null })}
                className="font-semibold text-[#14254A] underline underline-offset-2"
              >
                {data.showTests ? "Hide" : "Show"}
              </Link>
              <span aria-hidden> · </span>
              <button
                type="button"
                onClick={() => setTestOpen(true)}
                className="font-semibold text-[#14254A] underline underline-offset-2"
              >
                Review test data…
              </button>
            </>
          ) : null}
        </p>
      ) : null}

      <div className="fixed inset-x-3 bottom-[calc(72px+env(safe-area-inset-bottom))] z-20 grid grid-cols-2 gap-2 rounded-2xl border border-black/10 bg-white/96 p-2 shadow-[0_12px_40px_rgba(16,24,40,.18)] backdrop-blur md:hidden">
        {data.isAdmin ? (
          <Button
            type="button"
            variant="outline"
            onClick={() => setOfflineOpen(true)}
            className="min-w-0 px-2 text-xs"
          >
            Record offline
          </Button>
        ) : null}
        <Button
          type="button"
          onClick={() => setRequestOpen(true)}
          className={cn(
            "min-w-0 bg-[#14254A] px-2 text-xs text-white",
            !data.isAdmin && "col-span-2",
          )}
        >
          Request payment
        </Button>
      </div>
      <PaymentDialog
        kind="request"
        open={requestOpen}
        onOpenChange={setRequestOpen}
        data={data}
        stripeEnabled={stripeEnabled}
      />
      {data.isAdmin ? (
        <PaymentDialog
          kind="offline"
          open={offlineOpen}
          onOpenChange={setOfflineOpen}
          data={data}
          stripeEnabled={stripeEnabled}
        />
      ) : null}
      {data.isAdmin ? (
        <TestDataDialog open={testOpen} onOpenChange={setTestOpen} data={data} />
      ) : null}
    </div>
  );
}
