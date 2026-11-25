"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { authInputClass, authInvalidInputClass, authLabelClass } from "@/components/auth/auth-form-ui"

/** 0–4, from length + character variety. Cheap, honest, no library. */
function scorePassword(pw: string): number {
  if (!pw) return 0
  let s = 0
  if (pw.length >= 8) s++
  if (pw.length >= 12) s++
  if (/[a-z]/.test(pw) && /[A-Z]/.test(pw)) s++
  if (/\d/.test(pw) || /[^A-Za-z0-9]/.test(pw)) s++
  return Math.min(s, 4)
}
const LABELS = ["", "Weak", "Fair", "Good", "Strong"]
const SEG_TONE = ["", "bg-danger", "bg-warn", "bg-signal", "bg-ok"]

/**
 * Password input with a show/hide eye (48px target, aria-pressed) and — on
 * sign-up — a 4-segment strength meter with a one-word label. Supabase's 8-char
 * minimum is stated inline BEFORE submit, not as a post-submit error.
 */
export function PasswordField({
  id = "password",
  name = "password",
  label = "Password",
  autoComplete = "current-password",
  required,
  showStrength = false,
  labelAction,
  invalid = false,
  variant = "default",
}: {
  id?: string
  name?: string
  label?: string
  autoComplete?: string
  required?: boolean
  showStrength?: boolean
  labelAction?: React.ReactNode
  invalid?: boolean
  variant?: "default" | "auth"
}) {
  const [show, setShow] = useState(false)
  const [val, setVal] = useState("")
  const score = scorePassword(val)
  const isAuth = variant === "auth"

  return (
    <div className="space-y-2">
      <div className="flex items-baseline justify-between gap-4">
        <Label htmlFor={id} className={isAuth ? authLabelClass : "text-[13px]"}>{label}</Label>
        {labelAction ? <span className="text-[13.5px] font-semibold text-[#8E6F2E] underline decoration-[#D3B36B]/50 underline-offset-4">{labelAction}</span> : null}
      </div>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={8}
          aria-invalid={invalid}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className={cn(
            isAuth ? authInputClass : "h-12 pr-12",
            isAuth && "pr-[72px]",
            isAuth && invalid && authInvalidInputClass
          )}
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          className={cn(
            "absolute inset-y-0 right-0 flex items-center justify-center outline-none",
            isAuth
              ? "w-16 rounded-r-xl font-mono text-[12.5px] font-semibold tracking-[.06em] text-[#46526D] hover:text-[#14254A] focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#14254A]/35"
              : "w-12 text-text-mid hover:text-foreground"
          )}
        >
          {isAuth ? (show ? "HIDE" : "SHOW") : (show ? <EyeOff className="size-4" /> : <Eye className="size-4" />)}
        </button>
      </div>
      {showStrength && (
        <div>
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cn("h-1 flex-1 rounded-full transition-colors", i <= score ? SEG_TONE[score] : isAuth ? "bg-[#14254A]/10" : "bg-surface-3")}
              />
            ))}
          </div>
          <p className={cn("mt-1 text-[11px]", isAuth ? "text-[#7A8296]" : "text-text-low")}>
            {val ? `Strength: ${LABELS[score]}` : "Use at least 8 characters"}
          </p>
        </div>
      )}
    </div>
  )
}
