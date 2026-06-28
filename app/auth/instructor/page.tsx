import Link from "next/link"
import { brand } from "@/config/brand"
import { InstructorSignupForm } from "@/components/instructor/signup-form"

export const metadata = { title: "Become a CARRY instructor" }

export default function InstructorSignupPage() {
  return (
    <div className="mx-auto w-full max-w-xl px-4 py-10">
      <Link href="/" className="font-display text-lg font-semibold">
        {brand.logo.mark} {brand.logo.wordmark}
      </Link>
      <div className="mt-6">
        <h1 className="text-2xl font-semibold tracking-tight">Teach with CARRY</h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Join the verified instructor network. Get matched with local applicants
          who need their 18-hour training — you set your area, pricing, and schedule.
        </p>
      </div>
      <div className="mt-6 rounded-lg border bg-card p-5">
        <InstructorSignupForm />
      </div>
      <p className="mt-4 text-sm text-muted-foreground">
        Already have an instructor account?{" "}
        <Link href="/auth/login" className="text-signal hover:underline">
          Sign in
        </Link>
      </p>
    </div>
  )
}
