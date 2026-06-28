import { Badge } from "@/components/ui/badge"
import { cn } from "@/lib/utils"

// Dark-theme status tints (subtle fill + bright-but-muted text + hairline edge).
const TONES: Record<string, string> = {
  // generic
  active: "bg-ok/12 text-ok border-ok/30",
  blocked: "bg-danger/12 text-danger border-danger/30",
  on_hold: "bg-warn/12 text-warn border-warn/30",
  closed: "bg-surface-3 text-text-mid border-hairline",
  approved: "bg-ok/12 text-ok border-ok/30",
  denied: "bg-danger/12 text-danger border-danger/30",
  // checklist / documents
  not_started: "bg-surface-3 text-text-low border-hairline",
  in_progress: "bg-signal-dim text-signal border-signal/30",
  submitted: "bg-warn/12 text-warn border-warn/30",
  pending: "bg-warn/12 text-warn border-warn/30",
  rejected: "bg-danger/12 text-danger border-danger/30",
  // requirements engine (case_req_status)
  satisfied: "bg-ok/12 text-ok border-ok/30",
  na: "bg-surface-3 text-text-low border-hairline",
  // payments
  paid: "bg-ok/12 text-ok border-ok/30",
  failed: "bg-danger/12 text-danger border-danger/30",
  refunded: "bg-surface-3 text-text-mid border-hairline",
  // tasks
  open: "bg-signal-dim text-signal border-signal/30",
  done: "bg-ok/12 text-ok border-ok/30",
}

export function StatusBadge({
  status,
  className,
}: {
  status: string
  className?: string
}) {
  const tone = TONES[status] ?? "bg-surface-3 text-text-mid border-hairline"
  return (
    <Badge variant="outline" className={cn(tone, className)}>
      {status.replace(/_/g, " ")}
    </Badge>
  )
}
