import { TRAINING_CONFIG } from "@/content/training/config"

export default function TrainingRefundPolicyPage() {
  return <main className="mx-auto max-w-2xl px-6 py-24"><p className="text-sm font-medium uppercase tracking-[.16em] text-muted-foreground">Training class</p><h1 className="mt-4 text-4xl font-semibold">Refund policy</h1><p className="mt-6 text-lg leading-8 text-muted-foreground">{TRAINING_CONFIG.REFUND_POLICY ?? "The refund policy is being finalized. Registration remains unavailable until it is published."}</p></main>
}
