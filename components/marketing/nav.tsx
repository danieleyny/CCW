"use client"

import Link from "next/link"
import { useState } from "react"
import { Menu } from "lucide-react"
import { brand } from "@/config/brand"
import { Button } from "@/components/ui/button"
import {
  Sheet,
  SheetContent,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet"

const LINKS = [
  { href: "/how-it-works", label: "How it works" },
  { href: "/pricing", label: "Pricing" },
  { href: "/blog", label: "Guides" },
  { href: "/faq", label: "FAQ" },
]

export function MarketingNav() {
  const [open, setOpen] = useState(false)

  return (
    <header className="glass-premium sticky top-0 z-30 rounded-none border-x-0 border-t-0">
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-4 sm:px-6">
        <Link
          href="/"
          className="flex items-center gap-2 font-display text-lg font-semibold tracking-tight text-foreground"
        >
          <span className="relative flex size-8 items-center justify-center rounded-full bg-brass text-sm font-bold text-brand-foreground ring-1 ring-inset ring-signal/30">
            {brand.logo.mark}
          </span>
          {brand.logo.wordmark}
        </Link>

        <nav className="hidden items-center gap-7 md:flex">
          {LINKS.map((l) => (
            <Link
              key={l.href}
              href={l.href}
              className="text-sm font-medium text-text-mid transition-colors hover:text-foreground"
            >
              {l.label}
            </Link>
          ))}
        </nav>

        <div className="hidden items-center gap-2 md:flex">
          <Button asChild variant="ghost" size="sm">
            <Link href="/auth/login">Sign in</Link>
          </Button>
          <Button asChild size="sm">
            <Link href="/eligibility">Check eligibility</Link>
          </Button>
        </div>

        {/* Mobile */}
        <div className="flex items-center gap-2 md:hidden">
          <Button asChild size="sm">
            <Link href="/eligibility">Start</Link>
          </Button>
          <Sheet open={open} onOpenChange={setOpen}>
            <SheetTrigger asChild>
              <Button variant="outline" size="icon" aria-label="Menu">
                <Menu className="size-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72">
              <SheetTitle className="sr-only">Menu</SheetTitle>
              <nav className="mt-8 flex flex-col gap-1">
                {LINKS.map((l) => (
                  <Link
                    key={l.href}
                    href={l.href}
                    onClick={() => setOpen(false)}
                    className="rounded-md px-3 py-3 text-base font-medium text-foreground hover:bg-surface-2"
                  >
                    {l.label}
                  </Link>
                ))}
                <Link
                  href="/auth/login"
                  onClick={() => setOpen(false)}
                  className="rounded-md px-3 py-3 text-base font-medium text-text-mid hover:bg-surface-2"
                >
                  Sign in
                </Link>
              </nav>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  )
}
