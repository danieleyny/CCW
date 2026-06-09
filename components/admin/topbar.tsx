import Link from "next/link"
import { Plus } from "lucide-react"
import { signOut } from "@/app/auth/actions"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { initials } from "@/lib/format"

export function Topbar({
  name,
  role,
  title,
}: {
  name: string
  role: string
  title?: string
}) {
  return (
    <header className="glass sticky top-0 z-10 flex h-16 items-center justify-between gap-4 border-b border-hairline px-4 md:px-6">
      <h1 className="font-display text-lg font-semibold tracking-tight">{title ?? "Dashboard"}</h1>
      <div className="flex items-center gap-3">
        <Button asChild size="sm" className="gap-1.5">
          <Link href="/admin/clients/new">
            <Plus className="size-4" />
            New client
          </Link>
        </Button>
        <div className="flex items-center gap-2">
          <Avatar className="size-8">
            <AvatarFallback className="bg-primary/10 text-xs text-primary">
              {initials(name)}
            </AvatarFallback>
          </Avatar>
          <div className="hidden text-right leading-tight sm:block">
            <div className="text-sm font-medium">{name}</div>
            <div className="text-xs capitalize text-muted-foreground">{role}</div>
          </div>
        </div>
        <form action={signOut}>
          <Button variant="ghost" size="sm" type="submit">
            Sign out
          </Button>
        </form>
      </div>
    </header>
  )
}
