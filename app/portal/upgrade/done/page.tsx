import Link from "next/link"
import { CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { BRANDS } from "@/config/brands"

export const metadata = { title: "Upgrade confirmed" }

export default function UpgradeDonePage() {
  return (
    <div className="mx-auto max-w-xl rounded-xl border border-ok/30 bg-card p-6 text-center shadow-sm">
      <CheckCircle2 className="mx-auto size-10 text-ok" />
      <h1 className="mt-4 font-display text-2xl font-semibold">Your upgrade is confirmed</h1>
      <p className="mt-3 text-sm leading-relaxed text-text-mid">
        Your case now continues with Gun License NYC. Use the same email and password to sign in there.
      </p>
      <Button asChild className="mt-5">
        <Link href={`${BRANDS.gln.appOrigin}/auth/login`}>Continue to Gun License NYC</Link>
      </Button>
    </div>
  )
}
