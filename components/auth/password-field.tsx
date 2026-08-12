"use client"

import { useState } from "react"
import { Eye, EyeOff } from "lucide-react"
import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

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
}: {
  id?: string
  name?: string
  label?: string
  autoComplete?: string
  required?: boolean
  showStrength?: boolean
}) {
  const [show, setShow] = useState(false)
  const [val, setVal] = useState("")
  const score = scorePassword(val)

  return (
    <div className="space-y-2">
      <Label htmlFor={id} className="text-[13px]">
        {label}
      </Label>
      <div className="relative">
        <Input
          id={id}
          name={name}
          type={show ? "text" : "password"}
          autoComplete={autoComplete}
          required={required}
          minLength={8}
          value={val}
          onChange={(e) => setVal(e.target.value)}
          className="h-12 pr-12"
        />
        <button
          type="button"
          onClick={() => setShow((s) => !s)}
          aria-pressed={show}
          aria-label={show ? "Hide password" : "Show password"}
          className="absolute inset-y-0 right-0 flex w-12 items-center justify-center text-text-mid hover:text-foreground"
        >
          {show ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
        </button>
      </div>
      {showStrength && (
        <div>
          <div className="flex gap-1" aria-hidden>
            {[1, 2, 3, 4].map((i) => (
              <span
                key={i}
                className={cn("h-1 flex-1 rounded-full transition-colors", i <= score ? SEG_TONE[score] : "bg-surface-3")}
              />
            ))}
          </div>
          <p className="mt-1 text-[11px] text-text-low">
            {val ? `Strength: ${LABELS[score]}` : "Use at least 8 characters"}
          </p>
        </div>
      )}
    </div>
  )
}
