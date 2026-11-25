"use client"

import Link from "next/link"
import { usePathname } from "next/navigation"

export function AuthSignUpLink() {
  const pathname = usePathname()

  if (pathname === "/auth/sign-up") return null

  return (
    <p className="text-[14.5px] text-[#46526D]">
      New here?{" "}
      <Link
        href="/auth/sign-up"
        className="font-bold text-[#14254A] underline decoration-[#D3B36B] decoration-2 underline-offset-4 outline-none focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#14254A]/35"
      >
        Create an account
      </Link>
    </p>
  )
}
