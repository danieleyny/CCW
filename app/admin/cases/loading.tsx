export default function CasesLoading() {
  return (
    <div className="mx-auto max-w-[1520px] animate-pulse motion-reduce:animate-none">
      <div className="h-10 w-44 rounded bg-black/10" />
      <div className="mt-3 h-4 w-96 max-w-full rounded bg-black/10" />
      <div className="mt-6 h-11 rounded bg-black/10" />
      <div className="mt-4 grid gap-[18px] xl:grid-cols-[500px_minmax(0,1fr)]">
        <div className="overflow-hidden rounded-xl border border-black/10 bg-white">
          {Array.from({ length: 8 }, (_, index) => (
            <div key={index} className="grid min-h-[66px] grid-cols-[1fr_108px_64px] items-center gap-2 border-b border-black/[.07] px-3">
              <div className="space-y-2"><div className="h-3 w-2/3 rounded bg-black/10" /><div className="h-2 w-1/2 rounded bg-black/10" /></div>
              <div className="h-6 rounded-full bg-black/10" />
              <div className="ml-auto h-3 w-8 rounded bg-black/10" />
            </div>
          ))}
        </div>
        <div className="hidden h-[600px] rounded-2xl border border-black/10 bg-black/[.04] xl:block" />
      </div>
    </div>
  )
}
