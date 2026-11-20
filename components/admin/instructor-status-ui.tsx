import { Check, Circle } from "lucide-react"
import type { AdminInstructorRow, InstructorFlag } from "@/lib/admin/instructors"
import { cn } from "@/lib/utils"

const STATUS_STYLE = {
  live: "border-[#B7E2CA] bg-[#E8F6EE] text-[#16734A]",
  needs_verification: "border-[#E7C46F] bg-[#FFF7E6] text-[#805B00]",
  setting_up: "border-[#B8C4DA] bg-[#EEF2F8] text-[#223A68]",
  inactive: "border-[#D0D5DD] bg-[#F2F4F7] text-[#475467]",
} as const

export function InstructorStatusChip({ row, compact = false }: { row: AdminInstructorRow; compact?: boolean }) {
  return (
    <span className="inline-flex flex-wrap items-center gap-1.5">
      <span className={cn("inline-flex items-center rounded-full border font-semibold", compact ? "px-2 py-0.5 text-[10px]" : "px-2.5 py-1 text-[11px]", STATUS_STYLE[row.status.key])}>{row.status.label}</span>
      {row.status.key === "setting_up" && row.verified ? <span className="text-[10px] font-semibold text-[#16734A]">✓ verified</span> : null}
    </span>
  )
}

export function InstructorStatusLine({ row }: { row: AdminInstructorRow }) {
  const parts = [row.status.subline]
  if (row.flags.length) parts.push(`${row.flags.length} flag${row.flags.length === 1 ? "" : "s"}`)
  if (row.changesRequestedAt) parts.push(`Changes requested ${new Intl.DateTimeFormat("en-US", { month: "short", day: "numeric", timeZone: "America/New_York" }).format(new Date(row.changesRequestedAt))}`)
  return parts.filter(Boolean).length ? <p className={cn("mt-1 text-[11px]", row.flags.length ? "text-[#B42318]" : "text-[#667085]")}>{parts.filter(Boolean).join(" · ")}</p> : null
}

export function GoLiveChecklist({ row }: { row: AdminInstructorRow }) {
  return (
    <ul className="space-y-2.5">
      {row.steps.map((step) => (
        <li key={step.key} className="grid grid-cols-[18px_minmax(0,1fr)_auto] items-start gap-2 text-xs">
          {step.done ? <Check className="mt-0.5 size-4 text-[#16734A]" aria-hidden /> : <Circle className="mt-0.5 size-4 text-[#98A2B3]" aria-hidden />}
          <span className={step.done ? "text-[#475467]" : "font-medium text-[#101828]"}>{step.label}</span>
          {!step.done ? <span className={cn("rounded px-1.5 py-0.5 text-[9px] font-semibold", step.waiting ? "bg-[#FFF3D6] text-[#805B00]" : "bg-[#F2F4F7] text-[#667085]")}>{step.waiting ? "Waiting on us" : "Instructor"}</span> : null}
        </li>
      ))}
    </ul>
  )
}

function highlighted(sentence: string, phrase: string) {
  const at = sentence.toLowerCase().indexOf(phrase.toLowerCase())
  if (at < 0) return sentence
  return <>{sentence.slice(0, at)}<mark className="rounded bg-[#FEE4E2] px-0.5 text-[#B42318]">{sentence.slice(at, at + phrase.length)}</mark>{sentence.slice(at + phrase.length)}</>
}

export function ClaimFlagBox({ flag, firstName }: { flag: InstructorFlag; firstName: string }) {
  return (
    <div className="rounded-xl border border-[#FDA29B] bg-[#FFF5F4] p-3" role="alert">
      <p className="font-mono text-[9px] font-semibold uppercase tracking-[.16em] text-[#B42318]">Claim flag · {flag.field}</p>
      <p className="mt-2 text-xs leading-5 text-[#475467]">“{highlighted(flag.sentence, flag.phrase)}”</p>
      <p className="mt-2 text-xs leading-5 text-[#B42318]">{flag.kind === "virtual" ? `The required course is in person. “${flag.phrase}” could mislead applicants. Ask ${firstName} to change it before you verify.` : flag.message}</p>
    </div>
  )
}
