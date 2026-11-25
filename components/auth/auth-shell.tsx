import BrandLogo from "@/components/brand/BrandLogo"
import { AuthSignUpLink } from "@/components/auth/auth-sign-up-link"
import { getRequestBrand } from "@/lib/brand/server"

const FEATURES = [
  ["01", "Your next step", "Always one clear thing to do"],
  ["02", "Documents and references", "Uploads, signatures and who's signed"],
  ["03", "Messages with your team", "Questions answered in one thread"],
] as const

export async function AuthShell({ children }: { children: React.ReactNode }) {
  const brand = await getRequestBrand()
  const year = new Date().getFullYear()

  return (
    <div className="grid min-h-svh min-w-0 overflow-x-hidden bg-[#F7F4EE] font-sans text-[#14254A] min-[761px]:grid-cols-[44%_56%]">
      <aside className="relative flex min-w-0 flex-col overflow-hidden bg-[#14254A] px-5 pb-[26px] pt-[22px] text-white min-[761px]:px-14 min-[761px]:py-12">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -right-[260px] -top-[260px] size-[520px] rounded-full border border-[#D3B36B]/20 shadow-[0_0_0_60px_rgba(211,179,107,.03),0_0_0_120px_rgba(211,179,107,.025)] min-[761px]:-right-[180px] min-[761px]:-top-[180px]"
        />

        <BrandLogo
          tone="light"
          size="sm"
          href="/"
          className="relative z-10"
        />

        <h2 className="relative z-10 mt-[26px] max-w-[440px] font-[family-name:var(--font-title)] text-[30px] font-medium leading-[1.04] tracking-[-.02em] min-[761px]:mt-auto min-[761px]:text-[50px]">
          Your case, <span className="text-[#D3B36B]">all in one place.</span>
        </h2>
        <p className="relative z-10 mt-2 max-w-[420px] text-[15px] leading-[1.55] text-[#B9C2D6] min-[761px]:mt-[18px] min-[761px]:text-[17px]">
          Pick up exactly where you left off.
        </p>

        <div className="relative z-10 mt-[30px] hidden border-t border-white/15 min-[761px]:mb-auto min-[761px]:block">
          {FEATURES.map(([number, title, description]) => (
            <div
              key={number}
              className="grid grid-cols-[40px_1fr] items-center gap-3.5 border-b border-white/10 py-4"
            >
              <span className="grid size-10 place-items-center rounded-xl border border-[#D3B36B]/45 font-mono text-[13px] font-semibold text-[#D3B36B]">
                {number}
              </span>
              <span className="min-w-0">
                <strong className="block text-base font-semibold text-white">{title}</strong>
                <span className="block text-sm text-[#9FAAC2]">{description}</span>
              </span>
            </div>
          ))}
        </div>

        <p className="relative z-10 mt-[34px] hidden max-w-[470px] text-xs leading-[1.6] text-[#8A96B2] min-[761px]:block">
          {brand.disclaimer}
        </p>
      </aside>

      <main className="flex min-w-0 flex-col px-5 pb-[30px] pt-7 min-[761px]:px-14 min-[761px]:py-10">
        <div className="hidden min-h-6 justify-end min-[761px]:flex">
          <AuthSignUpLink />
        </div>

        <div className="my-0 w-full max-w-[440px] min-[761px]:m-auto">
          {children}
        </div>

        <footer className="mt-[30px] flex min-w-0 flex-col items-start gap-3.5 text-[13px] text-[#7A8296] min-[761px]:mt-0 min-[761px]:flex-row min-[761px]:items-center min-[761px]:justify-between">
          <span>© {year} {brand.displayName}</span>
          <nav aria-label="Legal" className="flex gap-[18px] text-[#46526D]">
            <a className="border-b border-[#14254A]/15 outline-none hover:text-[#14254A] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#14254A]/35" href={brand.legalLinks.privacy}>Privacy</a>
            <a className="border-b border-[#14254A]/15 outline-none hover:text-[#14254A] focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#14254A]/35" href={brand.legalLinks.terms}>Terms</a>
          </nav>
          <details className="group w-full border-t border-[#14254A]/15 pt-3.5 min-[761px]:hidden">
            <summary className="flex cursor-pointer list-none justify-between font-mono text-[12.5px] font-semibold uppercase tracking-[.08em] text-[#46526D] outline-none marker:hidden focus-visible:rounded-sm focus-visible:ring-2 focus-visible:ring-[#14254A]/35 [&::-webkit-details-marker]:hidden [&>span:first-child]:hidden group-open:[&>span:first-child]:inline group-open:[&>span:last-child]:hidden">
              <span aria-hidden>−</span>
              <span className="mr-auto">About our service</span>
              <span aria-hidden>+</span>
            </summary>
            <p className="mt-2.5 text-[12.5px] leading-[1.6] text-[#7A8296]">{brand.disclaimer}</p>
          </details>
        </footer>
      </main>
    </div>
  )
}
