import { signOut, switchAccount } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"

/**
 * The account controls that sit in every authenticated nav: a real Sign out
 * plus "Switch account". Both are plain server-action form submits — Switch
 * account signs out first (clearing the session) so it reaches a fresh login
 * form instead of being bounced to the dashboard by the proxy's signed-in rule.
 */
export function AccountActions({ signOutLabel = "Sign out" }: { signOutLabel?: string }) {
  return (
    <div className="flex items-center gap-0.5">
      <form action={switchAccount}>
        <Button
          variant="ghost"
          size="sm"
          type="submit"
          className="px-2 text-xs text-muted-foreground"
        >
          Switch account
        </Button>
      </form>
      <form action={signOut}>
        <Button variant="ghost" size="sm" type="submit">
          {signOutLabel}
        </Button>
      </form>
    </div>
  )
}
