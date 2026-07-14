import { ShieldCheck } from "lucide-react"
import { brand } from "@/config/brand"
import { refilePromise } from "@/config/policy"

/**
 * V5b Workstream C — The Refile Promise, rendered from the single source in
 * config/policy.ts. Always adjacent to brand.disclaimer (never instead of it).
 * Token-driven, so it reads correctly on both the light interior pages and the
 * dark homepage trust band.
 */
export function RefilePromise({
  withDisclaimer = true,
  className,
}: {
  withDisclaimer?: boolean
  className?: string
}) {
  return (
    <div className={`brass-edge rounded-xl border border-hairline bg-card p-6 ${className ?? ""}`}>
      <div className="flex items-center gap-2 text-brass-bright">
        <ShieldCheck className="size-5" />
        <h3 className="font-display text-lg font-semibold">{refilePromise.name}</h3>
      </div>
      <p className="mt-3 text-text-mid">
        If we assemble your filing packet and the License Division returns it as incomplete, we
        reassemble it and you refile at no additional charge from us. Government fees are set by the City
        and the State; we do not control them and cannot refund them. This is a promise about our work —
        not about the outcome of your application. The NYPD retains full investigative discretion.
      </p>
      {withDisclaimer && (
        <p className="mt-4 border-t border-hairline pt-3 text-xs leading-relaxed text-text-low">
          {brand.disclaimer}
        </p>
      )}
    </div>
  )
}
