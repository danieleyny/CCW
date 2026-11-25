import Link from "next/link"
import { InstructorSignupForm } from "@/components/instructor/signup-form"
import { AuthHeading, AuthPrivateLine } from "@/components/auth/auth-form-ui"
import { getRequestBrand } from "@/lib/brand/server"
import type { Metadata } from "next"

export async function generateMetadata(): Promise<Metadata> {
  const brand = await getRequestBrand()
  return { title: `Become a ${brand.displayName} instructor` }
}

export default async function InstructorSignupPage() {
  const brand = await getRequestBrand()
  return (
    <div>
      <AuthHeading
        title={`Teach with ${brand.displayName}`}
        description={
          <>
          Join the verified instructor network. Get matched with local applicants
          who need their 18-hour training — you set your area, pricing, and schedule.
          </>
        }
      />
      <div className="mt-7">
        <InstructorSignupForm />
      </div>
      <p className="mt-[18px] text-center text-[15px] text-[#46526D]">
        Already have an instructor account?{" "}
        <Link href="/auth/login" className="font-bold text-[#14254A] underline decoration-[#D3B36B] decoration-2 underline-offset-4">
          Sign in
        </Link>
      </p>
      <div className="mt-[18px]"><AuthPrivateLine /></div>
    </div>
  )
}
