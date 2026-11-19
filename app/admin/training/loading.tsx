import { Skeleton } from "@/components/ui/skeleton"

export default function TrainingLoading() {
  return (
    <div className="mx-auto w-full max-w-[1500px] space-y-5 pb-12">
      <div className="flex items-end justify-between gap-4"><div className="space-y-3"><Skeleton className="h-3 w-36" /><Skeleton className="h-10 w-52" /><Skeleton className="h-4 w-96 max-w-full" /></div><Skeleton className="h-10 w-32" /></div>
      <Skeleton className="h-28 w-full rounded-2xl" />
      <div className="flex gap-5"><div className="hidden w-[330px] space-y-3 lg:block">{Array.from({ length: 4 }, (_, index) => <Skeleton key={index} className="h-28 rounded-xl" />)}</div><div className="flex-1 space-y-5 rounded-2xl border border-black/[.08] bg-white p-6"><Skeleton className="h-9 w-2/3" /><Skeleton className="h-16 w-full" /><Skeleton className="h-20 w-full" /><Skeleton className="h-64 w-full" /></div></div>
    </div>
  )
}
