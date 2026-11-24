"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowRight, Check, ChevronDown, Download, FileCheck2, PenLine } from "lucide-react";
import { QueueSignOff } from "@/components/admin/queue-sign-off";
import { Button } from "@/components/ui/button";
import { stageMeta } from "@/config/stages";
import type { QueueCheck, QueueOwner, QueueRow } from "@/lib/admin/queue";
import { cn } from "@/lib/utils";
import { BrandChip } from "@/components/admin/brand-chip";
import { persistAdminBrandFilter } from "@/lib/admin/brand-filter-client";

const CHECK_LABELS = [
  "Checklist",
  "Disclosures",
  "Training",
  "References",
  "Reference mix",
  "Photo",
  "Track",
  "Sign-off",
];

const OWNER_META: Record<QueueOwner, { label: string; dot: string; pill: string }> = {
  staff: {
    label: "Staff",
    dot: "bg-[#D9B25F]",
    pill: "border-[#D9B25F]/35 bg-[#FBF3DF] text-[#694A00]",
  },
  applicant: {
    label: "Applicant",
    dot: "bg-[#2E90FA]",
    pill: "border-[#2E90FA]/25 bg-[#EFF8FF] text-[#175CD3]",
  },
  third_party: {
    label: "Third party",
    dot: "bg-[#7F56D9]",
    pill: "border-[#7F56D9]/25 bg-[#F4F0FF] text-[#6941C6]",
  },
};

function hiddenHref(view: "desk" | "matrix", show: boolean, brand: "all" | "gln" | "fl") {
  const params = new URLSearchParams();
  if (view === "matrix") params.set("view", "matrix");
  if (show) params.set("hidden", "1");
  if (brand !== "all") params.set("brand", brand);
  return `/admin/queue${params.size ? `?${params.toString()}` : ""}`;
}

function caseChecklistHref(row: QueueRow, staffItem = false) {
  const req = staffItem ? row.firstStaffRequirementId : null;
  return `/admin/cases/${row.caseId}?tab=checklist${req ? `&req=${req}#requirement-${req}` : ""}`;
}

function formatSignoffDate(value: string | null) {
  if (!value) return "date unavailable";
  return new Date(value).toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
  });
}

function nextStep(row: QueueRow) {
  return row.serviceMode === "self_guided"
    ? "Next: applicant files on the NYPD portal"
    : "Next: our team assembles and quality-checks; the applicant files with our guidance";
}

function Avatar({ row }: { row: QueueRow }) {
  return (
    <span className="grid size-10 shrink-0 place-items-center rounded-full border border-[#D9B25F]/35 bg-[#14254A] text-xs font-bold text-white">
      {row.initials}
    </span>
  );
}

function CheckMark({ check }: { check: QueueCheck }) {
  const state = check.state;
  return (
    <span
      aria-label={`${check.label}: ${state === "fail" ? "fails" : state === "watch" ? "passes, watch" : state === "na" ? "does not apply" : "passes"}`}
      className={cn(
        "grid size-5 shrink-0 place-items-center rounded-full text-[11px] font-bold",
        state === "pass" && "bg-[#E6F4EC] text-[#16734A]",
        state === "fail" && "bg-[#FEE4E2] text-[#B42318]",
        state === "watch" && "bg-[#FBF3DF] text-[#805B00]",
        state === "na" && "bg-[#EAECF0] text-[#667085]",
      )}
    >
      {state === "pass" ? (
        <Check className="size-3" />
      ) : state === "fail" ? (
        "×"
      ) : state === "watch" ? (
        "!"
      ) : (
        "–"
      )}
    </span>
  );
}

function HelpPanel({ storageKey }: { storageKey: string }) {
  const [open, setOpen] = useState(true);
  useEffect(() => {
    const storedOpen = window.localStorage.getItem(storageKey) !== "closed";
    queueMicrotask(() => setOpen(storedOpen));
  }, [storageKey]);
  return (
    <section className="overflow-hidden rounded-2xl border border-[#D9B25F]/30 bg-[#FBF8EF]">
      <button
        type="button"
        aria-expanded={open}
        onClick={() => {
          const next = !open;
          setOpen(next);
          window.localStorage.setItem(storageKey, next ? "open" : "closed");
        }}
        className="flex min-h-14 w-full items-center justify-between gap-4 px-4 py-3 text-left sm:px-5"
      >
        <span>
          <strong className="block text-sm text-[#14254A]">The last check before filing</strong>
          <span className="text-xs text-[#667085]">One gate, shared with every case page.</span>
        </span>
        <ChevronDown
          className={cn(
            "size-4 shrink-0 text-[#667085] transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open && (
        <div className="border-t border-[#D9B25F]/20 px-4 py-4 sm:px-5">
          <p className="max-w-3xl text-sm leading-6 text-[#475467]">
            A case can only move to{" "}
            <strong className="text-[#101828]">Assembled &amp; QA&apos;d</strong> or{" "}
            <strong className="text-[#101828]">Filed</strong> when all 7 checks pass{" "}
            <strong className="text-[#101828]">and</strong> a staff member signs off. This is the
            same check the case page enforces.
          </p>
          <div className="mt-3 flex flex-wrap gap-1.5">
            {CHECK_LABELS.map((label, index) => (
              <span
                key={label}
                className={cn(
                  "rounded-full border px-2 py-1 text-[10px] font-semibold",
                  index === 7
                    ? "border-[#14254A] bg-[#14254A] text-white"
                    : "border-[#D9B25F]/35 bg-white text-[#475467]",
                )}
              >
                {index + 1}. {label}
              </span>
            ))}
          </div>
        </div>
      )}
    </section>
  );
}

function SectionTitle({
  id,
  title,
  subline,
  count,
  right,
}: {
  id: string;
  title: string;
  subline: string;
  count: number;
  right?: React.ReactNode;
}) {
  return (
    <div className="mb-3 flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
      <div>
        <div className="flex items-center gap-2">
          <h2
            id={id}
            className="font-[family-name:var(--font-title)] text-[25px] leading-tight text-[#101828]"
          >
            {title}
          </h2>
          <span className="rounded-full bg-[#F2F4F7] px-2 py-0.5 text-xs font-semibold text-[#475467]">
            {count}
          </span>
        </div>
        <p className="mt-1 text-sm text-[#667085]">{subline}</p>
      </div>
      {right}
    </div>
  );
}

function ReadyCard({ row, staffName }: { row: QueueRow; staffName: string }) {
  const checks = row.checks.slice(0, 7);
  return (
    <article
      id={`case-${row.caseId}`}
      className="scroll-mt-24 overflow-hidden rounded-2xl border border-[#21845A]/35 bg-white shadow-[0_8px_28px_rgba(16,24,40,.06)]"
    >
      <div className="flex items-start gap-3 border-b border-black/[.07] p-4 sm:p-5">
        <Avatar row={row} />
        <div className="min-w-0 flex-1">
          <h3
            title={row.applicant}
            className="truncate font-[family-name:var(--font-title)] text-[22px] leading-tight text-[#101828]"
          >
            {row.applicant}
          </h3>
          <BrandChip brand={row.brand} origin={row.brandOrigin} className="mt-1" />
          <p className="mt-1 truncate font-mono text-[9.5px] uppercase tracking-[.12em] text-[#667085]">
            {row.trackLabel} · {row.serviceLabel} · Owner {row.ownerName ?? "Unassigned"}
          </p>
        </div>
        <span className="shrink-0 rounded-full bg-[#E6F4EC] px-2.5 py-1 text-[10px] font-bold text-[#16734A]">
          7 of 7 pass
        </span>
      </div>
      <div className="grid gap-px bg-black/[.06] sm:grid-cols-2">
        {checks.map((check, index) => (
          <div
            key={check.key}
            title={check.tooltip}
            className={cn("flex min-w-0 gap-2 bg-white px-4 py-3", index >= 4 && "hidden sm:flex")}
          >
            <CheckMark check={check} />
            <div className="min-w-0">
              <p className="text-[11px] font-semibold text-[#344054]">
                {check.number}. {check.label}
              </p>
              <p className="mt-0.5 text-[11px] leading-4 text-[#667085]">{check.evidence}</p>
            </div>
          </div>
        ))}
        <div className="flex gap-2 bg-[#FBF7EC] px-4 py-3">
          <span className="grid size-5 shrink-0 place-items-center rounded-full bg-[#F2D58A] text-[11px] font-bold text-[#694A00]">
            8
          </span>
          <div>
            <p className="text-[11px] font-semibold text-[#344054]">Sign-off</p>
            <p className="mt-0.5 text-[11px] text-[#805B00]">Waiting for a staff member</p>
          </div>
        </div>
      </div>
      <p className="px-4 pt-3 text-xs text-[#667085] sm:hidden">+ 3 more checks pass</p>
      <footer className="flex flex-col gap-2 p-4 sm:flex-row sm:items-center sm:p-5">
        <Button asChild variant="ghost" size="sm">
          <Link href={`/admin/cases/${row.caseId}`}>Open case</Link>
        </Button>
        <Button asChild variant="outline" size="sm">
          <a href={`/admin/cases/${row.caseId}/filing-pack`} target="_blank" rel="noreferrer">
            <Download className="size-3.5" /> Filing pack
          </a>
        </Button>
        <QueueSignOff
          caseId={row.caseId}
          applicant={row.applicant}
          staffName={staffName}
          serviceMode={row.serviceMode}
          className="w-full sm:ml-auto sm:w-auto"
        />
      </footer>
    </article>
  );
}

function SignedRow({ row }: { row: QueueRow }) {
  return (
    <article
      id={`case-${row.caseId}`}
      className="grid gap-3 rounded-xl border border-black/[.08] bg-white p-4 shadow-sm md:grid-cols-[minmax(0,1fr)_auto] md:items-center"
    >
      <div className="flex min-w-0 items-start gap-3">
        <Avatar row={row} />
        <div className="min-w-0">
          <h3 title={row.applicant} className="truncate text-sm font-semibold text-[#101828]">
            {row.applicant}
          </h3>
          <BrandChip brand={row.brand} origin={row.brandOrigin} className="mt-1" />
          <p className="mt-0.5 truncate font-mono text-[9.5px] uppercase tracking-[.1em] text-[#667085]">
            {row.trackLabel} · {row.serviceLabel}
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <span className="inline-flex items-center gap-1 rounded-full bg-[#E6F4EC] px-2 py-1 text-[10px] font-semibold text-[#16734A]">
              <PenLine className="size-3" /> Signed by {row.signedOffBy ?? "Staff member"} ·{" "}
              {formatSignoffDate(row.signedOffAt)}
            </span>
            <span className="text-xs text-[#475467]">{nextStep(row)}</span>
          </div>
        </div>
      </div>
      <Button asChild variant="outline" size="sm">
        <Link href={`/admin/cases/${row.caseId}`}>
          Open case <ArrowRight className="size-3.5" />
        </Link>
      </Button>
    </article>
  );
}

function OwnerLegend() {
  return (
    <div className="flex flex-wrap gap-3 text-[10px] text-[#667085]">
      {Object.entries(OWNER_META).map(([key, value]) => (
        <span key={key} className="inline-flex items-center gap-1.5">
          <span className={cn("size-2 rounded-full", value.dot)} />
          {value.label}
        </span>
      ))}
    </div>
  );
}

function CloseRow({ row }: { row: QueueRow }) {
  const staffOwned = row.thingsLeft.some((thing) => thing.owner === "staff");
  const href = caseChecklistHref(row, staffOwned);
  return (
    <article
      id={`case-${row.caseId}`}
      className="rounded-xl border border-black/[.08] bg-white p-4 shadow-sm"
    >
      <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
        <Link href={href} className="flex min-w-0 items-center gap-3 lg:w-[260px]">
          <Avatar row={row} />
          <span className="min-w-0">
            <strong title={row.applicant} className="block truncate text-sm text-[#101828]">
              {row.applicant}
            </strong>
            <BrandChip brand={row.brand} origin={row.brandOrigin} className="mt-1" />
            <span className="block truncate font-mono text-[9.5px] uppercase tracking-[.1em] text-[#667085]">
              {row.trackLabel} · {row.serviceLabel}
            </span>
          </span>
        </Link>
        <div className="flex min-w-0 flex-1 flex-wrap gap-1.5">
          {row.thingsLeft.map((thing, index) => (
            <span
              key={`${thing.owner}-${index}`}
              title={thing.titles.join(", ")}
              aria-label={`${OWNER_META[thing.owner].label}: ${thing.label}`}
              className={cn(
                "inline-flex max-w-full items-center gap-1.5 rounded-full border px-2.5 py-1 text-[10.5px]",
                OWNER_META[thing.owner].pill,
              )}
            >
              <span className={cn("size-1.5 shrink-0 rounded-full", OWNER_META[thing.owner].dot)} />
              <span className="truncate">{thing.label}</span>
            </span>
          ))}
        </div>
        <Button asChild size="sm" variant={staffOwned ? "default" : "outline"}>
          <Link href={href}>
            {staffOwned ? "Do staff part" : "Open checklist"} <ArrowRight className="size-3.5" />
          </Link>
        </Button>
      </div>
    </article>
  );
}

function EmptyQueue() {
  return (
    <div className="rounded-2xl border border-dashed border-[#D0D5DD] bg-white px-6 py-12 text-center">
      <FileCheck2 className="mx-auto size-8 text-[#98A2B3]" />
      <h2 className="mt-3 font-[family-name:var(--font-title)] text-2xl text-[#101828]">
        No paid cases are near filing yet.
      </h2>
      <p className="mx-auto mt-2 max-w-xl text-sm text-[#667085]">
        Cases appear here after training begins and the filing gate has meaningful evidence to
        review.
      </p>
    </div>
  );
}

function Desk({ rows, staffName }: { rows: QueueRow[]; staffName: string }) {
  const ready = rows.filter((row) => row.bucket === "ready");
  const signed = rows.filter((row) => row.bucket === "signed");
  const close = rows.filter((row) => row.bucket === "near");
  const waiting = rows.filter((row) => row.bucket === "waiting");
  const filed = rows.filter((row) => row.bucket === "filed");
  const working = ready.length + signed.length + close.length + waiting.length;
  if (!working && !filed.length) return <EmptyQueue />;
  return (
    <div className="space-y-9">
      <section aria-labelledby="ready-heading">
        <SectionTitle
          id="ready-heading"
          title="Ready to sign off"
          subline="All 7 checks pass. Review the evidence and sign — your name is recorded."
          count={ready.length}
        />
        {ready.length ? (
          <div className="grid gap-4 xl:grid-cols-2">
            {ready.map((row) => (
              <ReadyCard key={row.caseId} row={row} staffName={staffName} />
            ))}
          </div>
        ) : (
          <div className="rounded-xl border border-dashed border-[#D0D5DD] bg-white p-5 text-sm text-[#667085]">
            Nothing ready to sign off. {close.length} case{close.length === 1 ? " is" : "s are"}{" "}
            close — start with the staff items below.
          </div>
        )}
      </section>
      <section aria-labelledby="signed-heading">
        <SectionTitle
          id="signed-heading"
          title="Signed — next step"
          subline="The named review is recorded. Stage moves happen from the case page."
          count={signed.length}
        />
        {signed.length ? (
          <div className="space-y-2">
            {signed.map((row) => (
              <SignedRow key={row.caseId} row={row} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[#D0D5DD] bg-white p-5 text-sm text-[#667085]">
            No signed packets are waiting for their next stage.
          </p>
        )}
      </section>
      <section aria-labelledby="close-heading">
        <SectionTitle
          id="close-heading"
          title="Close"
          subline="1 to 3 things left. The dot shows who has to act."
          count={close.length}
          right={<OwnerLegend />}
        />
        {close.length ? (
          <div className="space-y-2">
            {close.map((row) => (
              <CloseRow key={row.caseId} row={row} />
            ))}
          </div>
        ) : (
          <p className="rounded-xl border border-dashed border-[#D0D5DD] bg-white p-5 text-sm text-[#667085]">
            No cases are within three items of sign-off.
          </p>
        )}
      </section>
      <section aria-labelledby="collecting-heading">
        <SectionTitle
          id="collecting-heading"
          title="Still collecting"
          subline="Cases with four or more things left stay in the checklist workflow."
          count={waiting.length}
        />
        {waiting.length > 0 && (
          <div className="flex flex-col gap-3 rounded-xl border border-dashed border-[#98A2B3] bg-[#F9FAFB] p-4 text-sm text-[#475467] sm:flex-row sm:items-center sm:justify-between">
            <span>
              {waiting.length} more case{waiting.length === 1 ? " is" : "s are"} still collecting
              (4+ things left). They&apos;re worked from each case&apos;s checklist.
            </span>
            <Button asChild variant="outline" size="sm">
              <Link href="/admin/cases?view=active&phase=paperwork">See them in Cases</Link>
            </Button>
          </div>
        )}
      </section>
      {filed.length > 0 && (
        <Link
          href="/admin/pipeline?phase=nypd"
          className="flex items-center justify-between gap-3 rounded-xl border border-[#667085]/20 bg-[#F2F4F7] p-4 text-sm font-medium text-[#344054] hover:border-[#667085]/40"
        >
          <span>{filed.length} filed and with the NYPD — tracked in Pipeline</span>
          <ArrowRight className="size-4" />
        </Link>
      )}
    </div>
  );
}

function MatrixCell({ row, check }: { row: QueueRow; check: QueueCheck }) {
  const content = (
    <span className="inline-flex min-w-0 items-center gap-1.5">
      <CheckMark check={check} />
      <span className="hidden min-w-0 truncate text-[10px] xl:inline">{check.evidence}</span>
      <span className="sr-only">
        {check.state === "fail"
          ? "Fails"
          : check.state === "watch"
            ? "Passes now, but watch"
            : check.state === "na"
              ? "Does not apply"
              : "Passes"}
        : {check.evidence}
      </span>
    </span>
  );
  return (
    <td
      title={check.tooltip}
      className="max-w-[130px] border-b border-black/[.07] px-2 py-3 align-top"
    >
      {check.state === "fail" ? (
        <Link
          href={caseChecklistHref(row)}
          className="rounded outline-none focus-visible:ring-2 focus-visible:ring-[#D9B25F]"
        >
          {content}
        </Link>
      ) : (
        content
      )}
    </td>
  );
}

function Matrix({ rows, staffName }: { rows: QueueRow[]; staffName: string }) {
  const active = rows.filter((row) => row.bucket !== "filed");
  const groups: Array<{ key: QueueRow["bucket"]; title: string }> = [
    { key: "ready", title: "Ready to sign off" },
    { key: "signed", title: "Signed" },
    { key: "near", title: "Close" },
    { key: "waiting", title: "Still collecting" },
  ];
  if (!active.length) return <EmptyQueue />;
  return (
    <div className="overflow-hidden rounded-2xl border border-black/[.08] bg-white shadow-sm">
      <div className="overflow-x-auto">
        <table className="w-full min-w-[980px] border-collapse text-left">
          <thead className="bg-[#F7F5EF]">
            <tr>
              <th
                scope="col"
                className="sticky left-0 z-10 min-w-[230px] border-b border-black/10 bg-[#F7F5EF] px-4 py-3 text-[10px] uppercase tracking-[.12em] text-[#667085]"
              >
                Case
              </th>
              {CHECK_LABELS.map((label, index) => (
                <th
                  key={label}
                  scope="col"
                  className="border-b border-black/10 px-2 py-3 text-[10px] uppercase tracking-[.08em] text-[#667085]"
                  aria-label={`Check ${index + 1}: ${label}`}
                >
                  <span className="xl:hidden">{index + 1}</span>
                  <span className="hidden xl:inline">
                    {index + 1}. {label}
                  </span>
                </th>
              ))}
              <th
                scope="col"
                className="border-b border-black/10 px-3 py-3 text-[10px] uppercase tracking-[.12em] text-[#667085]"
              >
                Action
              </th>
            </tr>
          </thead>
          <tbody>
            {groups.flatMap((group) => {
              const grouped = active.filter((row) => row.bucket === group.key);
              if (!grouped.length) return [];
              return [
                <tr key={`${group.key}-heading`}>
                  <th
                    colSpan={10}
                    className="bg-[#14254A] px-4 py-2 text-[10px] uppercase tracking-[.15em] text-white"
                  >
                    {group.title} · {grouped.length}
                  </th>
                </tr>,
                ...grouped.map((row) => (
                  <tr key={row.caseId} className="hover:bg-[#FAFAF8]">
                    <th
                      scope="row"
                      className="sticky left-0 z-[1] border-b border-black/[.07] bg-white px-4 py-3"
                    >
                      <Link
                        href={`/admin/cases/${row.caseId}`}
                        title={row.applicant}
                        className="block max-w-[210px] truncate text-xs font-semibold text-[#101828] hover:underline"
                      >
                        {row.applicant}
                      </Link>
                      <BrandChip brand={row.brand} origin={row.brandOrigin} className="mt-1" />
                      <span className="mt-1 block max-w-[210px] truncate font-mono text-[8.5px] uppercase tracking-[.08em] text-[#667085]">
                        {row.trackLabel} · {row.serviceLabel} · {stageMeta(row.stage).short}
                      </span>
                    </th>
                    {row.checks.map((check) => (
                      <MatrixCell key={check.key} row={row} check={check} />
                    ))}
                    <td className="border-b border-black/[.07] px-3 py-3">
                      {row.bucket === "ready" ? (
                        <QueueSignOff
                          caseId={row.caseId}
                          applicant={row.applicant}
                          staffName={staffName}
                          serviceMode={row.serviceMode}
                          className="h-8 px-2 text-[10px]"
                        />
                      ) : (
                        <Button asChild variant="outline" size="sm" className="h-8 text-[10px]">
                          <Link
                            href={
                              row.bucket === "signed"
                                ? `/admin/cases/${row.caseId}`
                                : caseChecklistHref(row)
                            }
                          >
                            {row.bucket === "signed" ? "Open case" : "Open checklist"}
                          </Link>
                        </Button>
                      )}
                    </td>
                  </tr>
                )),
              ];
            })}
          </tbody>
        </table>
      </div>
      <div className="flex flex-wrap gap-4 border-t border-black/[.08] bg-[#FAFAF8] p-4 text-[10px] text-[#667085]">
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-[#21845A]" />
          Passes
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-[#B42318]" />
          Blocks filing
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-[#D9B25F]" />
          Passes now, but watch it
        </span>
        <span className="inline-flex items-center gap-1">
          <span className="size-2 rounded-full bg-[#98A2B3]" />
          Doesn&apos;t apply
        </span>
      </div>
    </div>
  );
}

export function FilingQueueWorkspace({
  rows,
  view,
  showHidden,
  hidden,
  staffName,
  storageKey,
  brand,
}: {
  rows: QueueRow[];
  view: "desk" | "matrix";
  showHidden: boolean;
  hidden: { test: number; duplicate: number };
  staffName: string;
  storageKey: string;
  brand: "all" | "gln" | "fl";
}) {
  const readyCount = rows.filter((row) => row.bucket === "ready").length;
  const closeCount = rows.filter((row) => row.bucket === "near").length;
  const hiddenCount = hidden.test + hidden.duplicate;
  return (
    <main className="mx-auto max-w-[1440px] space-y-6 pb-10 text-[#101828]">
      <header className="flex flex-col gap-4 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[.18em] text-[#805B00]">
            Cases / final quality gate
          </p>
          <h1 className="mt-1 font-[family-name:var(--font-title)] text-[34px] leading-none text-[#101828] sm:text-[42px]">
            Filing queue
          </h1>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#667085]">
            The final check before an application is filed. Sign off what&apos;s ready, then clear
            what&apos;s close.
          </p>
          <p className="mt-2 text-xs font-semibold text-[#344054] md:hidden">
            {readyCount} ready to sign off · {closeCount} close
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 lg:items-end">
          <div className="flex rounded-xl border border-black/10 bg-[#F2F4F7] p-1">
            {(["all", "gln", "fl"] as const).map((value) => (
              <Link
                key={value}
                href={hiddenHref(view, showHidden, value)}
                onClick={() => persistAdminBrandFilter(value)}
                aria-current={brand === value ? "page" : undefined}
                className={cn(
                  "rounded-lg px-3 py-2 text-xs font-semibold",
                  brand === value ? "bg-white text-[#14254A] shadow-sm" : "text-[#667085]",
                )}
              >
                {value === "all" ? "All brands" : value.toUpperCase()}
              </Link>
            ))}
          </div>
          <div
            role="tablist"
            aria-label="Filing queue view"
            className="hidden rounded-xl border border-black/10 bg-[#F2F4F7] p-1 md:flex"
          >
            <Link
              role="tab"
              aria-selected={view === "desk"}
              href={hiddenHref("desk", showHidden, brand)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold",
                view === "desk" ? "bg-white text-[#14254A] shadow-sm" : "text-[#667085]",
              )}
            >
              Sign-off desk
            </Link>
            <Link
              role="tab"
              aria-selected={view === "matrix"}
              href={hiddenHref("matrix", showHidden, brand)}
              className={cn(
                "rounded-lg px-3 py-2 text-xs font-semibold",
                view === "matrix" ? "bg-white text-[#14254A] shadow-sm" : "text-[#667085]",
              )}
            >
              Matrix
            </Link>
          </div>
          {hiddenCount > 0 && (
            <p className="text-[10.5px] text-[#667085]">
              {hidden.test} test · {hidden.duplicate} duplicate hidden ·{" "}
              <Link
                className="font-semibold text-[#14254A] underline underline-offset-2"
                href={hiddenHref(view, !showHidden, brand)}
              >
                {showHidden ? "Hide" : "Show"}
              </Link>
            </p>
          )}
        </div>
      </header>
      <HelpPanel storageKey={storageKey} />
      {view === "matrix" ? (
        <>
          <div className="hidden md:block">
            <Matrix rows={rows} staffName={staffName} />
          </div>
          <div className="md:hidden">
            <Desk rows={rows} staffName={staffName} />
          </div>
        </>
      ) : (
        <Desk rows={rows} staffName={staffName} />
      )}
    </main>
  );
}
