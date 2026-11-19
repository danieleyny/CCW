"use client"

import { useState, useTransition } from "react"
import { Loader2, MoreHorizontal, Trash2, TriangleAlert } from "lucide-react"
import { deleteDemoCases } from "@/app/admin/actions"
import { trackEvent } from "@/lib/analytics"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"

/** Admin-only menu entry with an exact typed confirmation before hard deletion. */
export function DeleteDemoCasesButton({ count }: { count: number }) {
  const [open, setOpen] = useState(false)
  const [confirmation, setConfirmation] = useState("")
  const [result, setResult] = useState<string | null>(null)
  const [error, setError] = useState<string | null>(null)
  const [pending, startTransition] = useTransition()
  const expected = `DELETE ${count}`

  if (count === 0) return null

  function close(next: boolean) {
    if (pending) return
    setOpen(next)
    if (!next) {
      setConfirmation("")
      setResult(null)
      setError(null)
    }
  }

  function remove() {
    if (confirmation !== expected) return
    setError(null)
    startTransition(async () => {
      const response = await deleteDemoCases()
      if (response.error) {
        setError(response.error)
        return
      }
      trackEvent("admin_demo_delete_confirmed", { count: response.deleted ?? 0 })
      setResult(`Deleted ${response.deleted ?? 0} demo case${response.deleted === 1 ? "" : "s"}.`)
    })
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DropdownMenu>
        <DropdownMenuTrigger asChild>
          <Button type="button" variant="outline" size="icon-sm" aria-label="Concierge actions">
            <MoreHorizontal className="size-4" aria-hidden />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end" className="w-52 bg-white">
          <DropdownMenuItem variant="destructive" className="min-h-9 px-2.5" onSelect={() => setOpen(true)}>
            <Trash2 className="size-4" aria-hidden /> Delete demo cases…
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <DialogContent className="bg-white text-[#101828] sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="font-display text-xl">Delete {count} demo case{count === 1 ? "" : "s"}?</DialogTitle>
          <DialogDescription className="text-[#475467]">
            Only cases marked Demo. Real clients are never touched.
          </DialogDescription>
        </DialogHeader>
        <div className="rounded-lg border border-[#F4B8B2] bg-[#FFF3F2] p-3 text-sm text-[#912018]">
          <p className="flex items-center gap-2 font-semibold"><TriangleAlert className="size-4" aria-hidden />This can&apos;t be undone</p>
          <p className="mt-1 text-xs">{count} demo case{count === 1 ? "" : "s"}, their documents and messages.</p>
        </div>
        {result ? (
          <p role="status" className="rounded-lg bg-[#E8F6EE] p-3 text-sm font-medium text-[#16734A]">{result}</p>
        ) : (
          <div className="space-y-2">
            <Label htmlFor="demo-delete-confirmation">Type <strong>{expected}</strong> to confirm</Label>
            <Input
              id="demo-delete-confirmation"
              autoComplete="off"
              value={confirmation}
              onChange={(event) => setConfirmation(event.target.value)}
              aria-describedby={error ? "demo-delete-error" : undefined}
            />
            {error ? <p id="demo-delete-error" role="alert" className="text-xs text-[#B42318]">{error}</p> : null}
          </div>
        )}
        <DialogFooter className="bg-[#F8F9FB]">
          <Button type="button" variant="outline" disabled={pending} onClick={() => close(false)}>
            {result ? "Close" : "Cancel"}
          </Button>
          {!result ? (
            <Button type="button" variant="destructive" disabled={pending || confirmation !== expected} onClick={remove}>
              {pending ? <Loader2 className="size-4 animate-spin" aria-hidden /> : <Trash2 className="size-4" aria-hidden />}
              Delete demo cases
            </Button>
          ) : null}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
