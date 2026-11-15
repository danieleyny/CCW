import { signOut, switchAccount } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { LogOut, UserRoundCog } from "lucide-react"

/**
 * The account controls that sit in every authenticated nav: a real Sign out
 * plus "Switch account". Both are plain server-action form submits — Switch
 * account signs out first (clearing the session) so it reaches a fresh login
 * form instead of being bounced to the dashboard by the proxy's signed-in rule.
 */
export function AccountActions({
  signOutLabel = "Sign out",
  compactBelowSm = false,
}: {
  signOutLabel?: string
  compactBelowSm?: boolean
}) {
  return (
    <div className="flex items-center gap-0.5">
      <form action={switchAccount}>
        <Button
          variant="ghost"
          size="sm"
          type="submit"
          aria-label={compactBelowSm ? "Switch account" : undefined}
          className={compactBelowSm
            ? "size-9 px-0 text-xs text-muted-foreground sm:h-8 sm:w-auto sm:px-2"
            : "px-2 text-xs text-muted-foreground"}
        >
          {compactBelowSm ? <UserRoundCog className="size-4 sm:hidden" aria-hidden /> : null}
          <span className={compactBelowSm ? "hidden sm:inline" : undefined}>Switch account</span>
        </Button>
      </form>
      <form action={signOut}>
        <Button
          variant="ghost"
          size="sm"
          type="submit"
          aria-label={compactBelowSm ? signOutLabel : undefined}
          className={compactBelowSm ? "size-9 px-0 sm:h-8 sm:w-auto sm:px-3" : undefined}
        >
          {compactBelowSm ? <LogOut className="size-4 sm:hidden" aria-hidden /> : null}
          <span className={compactBelowSm ? "hidden sm:inline" : undefined}>{signOutLabel}</span>
        </Button>
      </form>
    </div>
  )
}
