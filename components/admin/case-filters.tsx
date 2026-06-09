"use client"

import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import { CASE_STAGES, BOROUGHS } from "@/config/stages"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Button } from "@/components/ui/button"

const STATUSES = ["active", "blocked", "on_hold", "closed", "approved", "denied"]
const ALL = "all"

export function CaseFilters() {
  const router = useRouter()
  const params = useSearchParams()

  function update(key: string, value: string) {
    const next = new URLSearchParams(params.toString())
    if (!value || value === ALL) next.delete(key)
    else next.set(key, value)
    router.push(`/admin/cases?${next.toString()}`)
  }

  return (
    <div className="mb-4 flex flex-wrap items-center gap-2">
      <form
        onSubmit={(e) => {
          e.preventDefault()
          const v = new FormData(e.currentTarget).get("q") as string
          update("q", v ?? "")
        }}
        className="relative"
      >
        <Search className="pointer-events-none absolute left-2.5 top-2.5 size-4 text-muted-foreground" />
        <Input
          name="q"
          defaultValue={params.get("q") ?? ""}
          placeholder="Search clients…"
          className="w-52 pl-8"
        />
      </form>

      <Select value={params.get("stage") ?? ALL} onValueChange={(v) => update("stage", v)}>
        <SelectTrigger className="w-[160px]">
          <SelectValue placeholder="Stage" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All stages</SelectItem>
          {CASE_STAGES.map((s) => (
            <SelectItem key={s.key} value={s.key}>
              {s.short}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={params.get("status") ?? ALL} onValueChange={(v) => update("status", v)}>
        <SelectTrigger className="w-[140px]">
          <SelectValue placeholder="Status" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All statuses</SelectItem>
          {STATUSES.map((s) => (
            <SelectItem key={s} value={s} className="capitalize">
              {s.replace(/_/g, " ")}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select value={params.get("borough") ?? ALL} onValueChange={(v) => update("borough", v)}>
        <SelectTrigger className="w-[150px]">
          <SelectValue placeholder="Borough" />
        </SelectTrigger>
        <SelectContent>
          <SelectItem value={ALL}>All boroughs</SelectItem>
          {BOROUGHS.map((b) => (
            <SelectItem key={b} value={b}>
              {b}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      {[...params.keys()].length > 0 && (
        <Button variant="ghost" size="sm" onClick={() => router.push("/admin/cases")}>
          Clear
        </Button>
      )}
    </div>
  )
}
