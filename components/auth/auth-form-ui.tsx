import Link from "next/link"
import { Lock } from "lucide-react"
import { Button } from "@/components/ui/button"
import { cn } from "@/lib/utils"

export const authInputClass =
  "h-[54px] rounded-xl border-[1.5px] border-[#14254A]/15 bg-white px-4 text-base text-[#14254A] placeholder:text-[#9AA1B2] focus-visible:border-[#14254A] focus-visible:ring-4 focus-visible:ring-[#14254A]/10"

export const authInvalidInputClass =
  "border-[#B42318] ring-4 ring-[#B42318]/[.08] focus-visible:border-[#B42318] focus-visible:ring-[#B42318]/[.08]"

export const authLabelClass = "text-sm font-semibold text-[#14254A]"

export function AuthHeading({ title, description }: { title: string; description: React.ReactNode }) {
  return (
    <header>
      <h1 className="font-[family-name:var(--font-title)] text-[32px] font-medium leading-[1.05] tracking-[-.015em] text-[#14254A] min-[761px]:text-[40px]">
        {title}
      </h1>
      <p className="mt-2 text-[16.5px] leading-6 text-[#46526D]">{description}</p>
    </header>
  )
}

export function AuthAlert({ children, tone = "error" }: { children: React.ReactNode; tone?: "error" | "ok" | "neutral" }) {
  const toneClass = tone === "error"
    ? "border-[#B42318]/25 bg-[#FEF1EF] text-[#B42318]"
    : tone === "ok"
      ? "border-[#15803D]/25 bg-[#15803D]/[.07] text-[#166534]"
      : "border-[#14254A]/15 bg-[#14254A]/[.05] text-[#46526D]"

  return (
    <div
      className={cn("flex gap-2.5 rounded-xl border px-3.5 py-3 text-[14.5px] leading-[1.45]", toneClass)}
      role={tone === "error" ? "alert" : "status"}
    >
      <span
        aria-hidden="true"
        className={cn(
          "mt-px grid size-5 shrink-0 place-items-center rounded-full font-mono text-xs font-bold text-white",
          tone === "error" ? "bg-[#B42318]" : tone === "ok" ? "bg-[#15803D]" : "bg-[#46526D]"
        )}
      >
        {tone === "error" ? "!" : tone === "ok" ? "✓" : "i"}
      </span>
      <span>{children}</span>
    </div>
  )
}

export function AuthSubmitButton({ pending, pendingText, children }: { pending: boolean; pendingText: string; children: React.ReactNode }) {
  return (
    <Button
      type="submit"
      disabled={pending}
      className="h-14 w-full rounded-xl bg-[#14254A] text-base font-bold text-white shadow-none hover:bg-[#0E1B38] hover:shadow-none focus-visible:ring-[#14254A]/45 focus-visible:ring-offset-[#F7F4EE] disabled:opacity-60"
    >
      <span>{pending ? pendingText : children}</span>
      <span aria-hidden className="text-[#D3B36B]">→</span>
    </Button>
  )
}

export function AuthAccountPrompt({ mode = "new" }: { mode?: "new" | "existing" }) {
  const isNew = mode === "new"
  return (
    <p className="text-center text-[15px] text-[#46526D]">
      {isNew ? "New here?" : "Already have an account?"}{" "}
      <Link
        href={isNew ? "/auth/sign-up" : "/auth/login"}
        className="font-bold text-[#14254A] underline decoration-[#D3B36B] decoration-2 underline-offset-4 outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#14254A]/35"
      >
        {isNew ? "Create an account" : "Sign in"}
      </Link>
    </p>
  )
}

export function AuthPrivateLine() {
  return (
    <p className="flex items-center justify-center gap-2 font-mono text-xs font-medium tracking-[.04em] text-[#7A8296]">
      <Lock className="size-[13px]" aria-hidden />
      Private to you and your case team
    </p>
  )
}
