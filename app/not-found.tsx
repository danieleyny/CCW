import Link from "next/link"
import { Button } from "@/components/ui/button"

/** V3-P4.3 — a branded 404 instead of the framework default. */
export default function NotFound() {
  return (
    <main className="flex min-h-svh flex-col items-center justify-center px-4 text-center">
      <div className="engraved text-brass">404</div>
      <h1 className="mt-2 font-display text-2xl font-semibold">That page doesn&apos;t exist</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        The link may be old or mistyped. If someone sent you a reference or affidavit link, ask them
        to resend it — those links expire after 30 days.
      </p>
      <Button asChild size="sm" className="mt-5">
        <Link href="/">Back to Gun License NYC</Link>
      </Button>
    </main>
  )
}
